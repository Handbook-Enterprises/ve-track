export const SENTRY_DSN =
  "https://2d4a5cf3bd971bacd3a8e0360836f0e0@o4511268194877440.ingest.us.sentry.io/4511268200185856";

const THEME_KEY = "ve-track-theme";

export function clientSentryEnabled(): boolean {
  if (!import.meta.env.PROD) return false;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".local");
}

export function getStoredColorScheme(): "system" | "light" | "dark" {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return "system";
}
