import { DrizzleD1Database } from "drizzle-orm/d1";
import { ModelPricingRepository } from "../repositories/model-pricing.repository";

const CATALOG_URL = "https://models.dev/api.json";
const SYNC_MAX_AGE_MS = 20 * 60 * 60 * 1000;
const INDEX_TTL_MS = 10 * 60 * 1000;

const PROVIDER_SYNC: Array<{ catalogId: string; sdkName: string }> = [
  { catalogId: "openai", sdkName: "openai" },
  { catalogId: "anthropic", sdkName: "anthropic" },
  { catalogId: "google", sdkName: "gemini" },
  { catalogId: "perplexity", sdkName: "perplexity" },
];

export const REPRICE_PROVIDERS = new Set(["openai", "anthropic", "gemini"]);

export interface PriceEntry {
  input_per_m: number;
  output_per_m: number;
  cache_read_per_m: number | null;
  cache_write_per_m: number | null;
}

export interface TokenBuckets {
  prompt: number;
  cached: number;
  cacheWrite: number;
  completion: number;
}

export interface PriceResult {
  costUsd: number | null;
  confidence: "high" | "unknown";
  matched: boolean;
}

interface PricingIndex {
  exact: Map<string, PriceEntry>;
  byProvider: Map<string, Array<{ id: string; entry: PriceEntry }>>;
}

let cache: { index: PricingIndex; builtAt: number } | null = null;

const round6 = (n: number): number => Math.round(n * 1_000_000) / 1_000_000;

const normalizeModel = (model: string): string =>
  model
    .replace(/^models\//, "")
    .replace(/-\d{4}-\d{2}-\d{2}$/, "")
    .replace(/-\d{8}$/, "")
    .toLowerCase();

const buildIndex = (
  rows: Array<{
    provider: string;
    model_id: string;
    input_per_m: number;
    output_per_m: number;
    cache_read_per_m: number | null;
    cache_write_per_m: number | null;
  }>,
): PricingIndex => {
  const exact = new Map<string, PriceEntry>();
  const byProvider = new Map<string, Array<{ id: string; entry: PriceEntry }>>();
  for (const r of rows) {
    const entry: PriceEntry = {
      input_per_m: r.input_per_m,
      output_per_m: r.output_per_m,
      cache_read_per_m: r.cache_read_per_m,
      cache_write_per_m: r.cache_write_per_m,
    };
    exact.set(`${r.provider}:${r.model_id.toLowerCase()}`, entry);
    const list = byProvider.get(r.provider) ?? [];
    list.push({ id: r.model_id.toLowerCase(), entry });
    byProvider.set(r.provider, list);
  }
  for (const list of byProvider.values())
    list.sort((a, b) => b.id.length - a.id.length);
  return { exact, byProvider };
};

const resolveEntry = (
  index: PricingIndex,
  provider: string,
  model: string,
): PriceEntry | null => {
  const raw = model.toLowerCase();
  const exact = index.exact.get(`${provider}:${raw}`);
  if (exact) return exact;
  const normalized = normalizeModel(model);
  const normExact = index.exact.get(`${provider}:${normalized}`);
  if (normExact) return normExact;
  const list = index.byProvider.get(provider);
  if (!list) return null;
  const hit = list.find((m) => normalized.startsWith(m.id) || m.id.startsWith(normalized));
  return hit ? hit.entry : null;
};

class PricingService {
  static async syncCatalog(db: DrizzleD1Database): Promise<number> {
    const res = await fetch(CATALOG_URL, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`models.dev responded ${res.status}`);
    const catalog: any = await res.json();
    const now = Date.now();
    const rows: Array<{
      provider: string;
      model_id: string;
      input_per_m: number;
      output_per_m: number;
      cache_read_per_m: number | null;
      cache_write_per_m: number | null;
      updated_at: number;
    }> = [];

    for (const { catalogId, sdkName } of PROVIDER_SYNC) {
      const models = catalog?.[catalogId]?.models;
      if (!models) continue;
      for (const modelId of Object.keys(models)) {
        const cost = models[modelId]?.cost ?? {};
        rows.push({
          provider: sdkName,
          model_id: modelId,
          input_per_m: Number(cost.input ?? 0),
          output_per_m: Number(cost.output ?? 0),
          cache_read_per_m: cost.cache_read != null ? Number(cost.cache_read) : null,
          cache_write_per_m: cost.cache_write != null ? Number(cost.cache_write) : null,
          updated_at: now,
        });
      }
    }

    const written = await ModelPricingRepository.upsertMany(db, rows);
    cache = null;
    return written;
  }

  static async syncIfStale(db: DrizzleD1Database): Promise<void> {
    try {
      const latest = await ModelPricingRepository.latestUpdatedAt(db);
      if (Date.now() - latest > SYNC_MAX_AGE_MS) await this.syncCatalog(db);
    } catch (err) {
      console.error("[ve-track][pricing] syncIfStale failed", err);
    }
  }

  static async getIndex(db: DrizzleD1Database): Promise<PricingIndex> {
    if (cache && Date.now() - cache.builtAt < INDEX_TTL_MS) return cache.index;
    const rows = await ModelPricingRepository.getAll(db);
    const index = buildIndex(rows);
    cache = { index, builtAt: Date.now() };
    return index;
  }

  static price(
    index: PricingIndex,
    provider: string,
    model: string | null,
    buckets: TokenBuckets,
  ): PriceResult {
    if (!model) return { costUsd: null, confidence: "unknown", matched: false };
    const entry = resolveEntry(index, provider, model);
    if (!entry) return { costUsd: null, confidence: "unknown", matched: false };
    const cacheReadRate = entry.cache_read_per_m ?? entry.input_per_m;
    const cacheWriteRate = entry.cache_write_per_m ?? entry.input_per_m;
    const cost =
      (buckets.prompt * entry.input_per_m +
        buckets.cached * cacheReadRate +
        buckets.cacheWrite * cacheWriteRate +
        buckets.completion * entry.output_per_m) /
      1_000_000;
    return { costUsd: round6(cost), confidence: "high", matched: true };
  }
}

export default PricingService;
