import { describe, expect, it } from "bun:test";
import { PROVIDERS } from "../src/providers.ts";

const provider = (name: string) => {
  const match = PROVIDERS.find((candidate) => candidate.name === name);
  if (!match) throw new Error(`Missing provider: ${name}`);
  return match;
};

describe("provider matchers", () => {
  it("distinguishes OpenRouter vendor dollars from its SDK table fallback", async () => {
    const openrouter = provider("openrouter");
    const vendorResponse = new Response(
      JSON.stringify({
        model: "openai/gpt-4o-mini",
        usage: { prompt_tokens: 1_000, completion_tokens: 500, cost: 0.0042 },
      }),
      { headers: { "content-type": "application/json" } },
    );
    const fallbackResponse = new Response(
      JSON.stringify({
        model: "gpt-4o-mini",
        usage: { prompt_tokens: 1_000, completion_tokens: 500 },
      }),
      { headers: { "content-type": "application/json" } },
    );

    expect(await openrouter.extract(vendorResponse)).toEqual(
      expect.objectContaining({ costUsd: 0.0042, costSource: "vendor_stated" }),
    );
    expect(await openrouter.extract(fallbackResponse)).toEqual(
      expect.objectContaining({ costUsd: 0.00045, costSource: "sdk_table" }),
    );
  });

  it("tags a hardcoded flat provider amount as SDK flat", async () => {
    expect(await provider("brightdata").extract(new Response(null))).toEqual({
      costUsd: 0.0015,
      costSource: "sdk_flat",
    });
  });

  it("extracts Ahrefs consumed units from the actual-cost response header", async () => {
    const ahrefs = provider("ahrefs");
    const response = new Response(null, {
      headers: {
        "x-api-units-cost-total-actual": "17",
        "x-api-units-cost-total": "99",
      },
    });

    expect(ahrefs.match("https://api.ahrefs.com/v3/site-explorer/overview")).toBe(true);
    expect(await ahrefs.extract(response)).toEqual({ costUsd: null, creditsCharged: 17 });
  });

  it("preserves Ahrefs cache hits as zero consumed units", async () => {
    const response = new Response(null, {
      headers: { "x-api-units-cost-total-actual": "0" },
    });

    expect(await provider("ahrefs").extract(response)).toEqual({
      costUsd: null,
      creditsCharged: 0,
    });
  });

  it("does not mistake the Ahrefs pre-flight estimate for consumed units", async () => {
    const response = new Response(null, {
      headers: { "x-api-units-cost-total": "99" },
    });

    expect(await provider("ahrefs").extract(response)).toBeNull();
  });

  it.each([
    ["localfalcon", "https://api.localfalcon.com/v1/scans"],
    ["seogets", "https://app.seogets.com/api/report"],
    ["rapidurlindexer", "https://rapidurlindexer.com/api/v1/submit"],
  ])("records %s calls with an unknown amount", async (name, url) => {
    const matchedProvider = provider(name);

    expect(matchedProvider.match(url)).toBe(true);
    expect(await matchedProvider.extract(new Response(null))).toBeNull();
  });
});
