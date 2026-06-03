export function defaultApiUrl(): string {
  return process.env.VE_TRACK_API_URL || "https://track.viewengine.ai";
}

export function envKey(): string | undefined {
  return process.env.VE_TRACK_KEY;
}
