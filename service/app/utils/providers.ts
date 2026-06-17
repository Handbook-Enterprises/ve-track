export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
  perplexity: "Perplexity",
  openrouter: "OpenRouter",
  cloro: "Cloro",
  fal: "Fal",
  zyte: "Zyte",
  dataforseo: "DataForSEO",
  apify: "Apify",
  firecrawl: "Firecrawl",
  brightdata: "BrightData",
};

export const providerLabel = (key: string | null): string => {
  if (!key) return "Unknown";
  return (
    PROVIDER_LABELS[key.toLowerCase()] ??
    key.charAt(0).toUpperCase() + key.slice(1)
  );
};
