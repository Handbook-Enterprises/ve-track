export const parseSseData = (text: string): any[] => {
  const out: any[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      out.push(JSON.parse(payload));
    } catch {
      /* */
    }
  }
  return out;
};

export const isEventStream = (resp: Response): boolean =>
  resp.headers.get("content-type")?.includes("event-stream") ?? false;

export const readStreamUsageChunk = (chunks: any[]): any | null => {
  for (let i = chunks.length - 1; i >= 0; i--) {
    if (chunks[i]?.usage) return chunks[i];
  }
  return null;
};
