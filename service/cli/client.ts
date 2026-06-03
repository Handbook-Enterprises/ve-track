export interface ClientConfig {
  baseUrl: string;
  key: string;
}

export class ApiClient {
  constructor(private config: ClientConfig) {}

  get<T = unknown>(path: string, query?: Record<string, string | undefined>): Promise<T> {
    const qs = query
      ? new URLSearchParams(
          Object.entries(query).filter((e): e is [string, string] => e[1] != null && e[1] !== ""),
        ).toString()
      : "";
    return this.request(`/api/v1/${path}${qs ? `?${qs}` : ""}`, { method: "GET" });
  }

  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request(`/api/v1/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  raw<T = unknown>(absolutePath: string): Promise<T> {
    return this.request(absolutePath, { method: "GET" });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers(), ...(init.headers as Record<string, string> | undefined) },
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  private headers(): Record<string, string> {
    return this.config.key ? { "x-ve-key": this.config.key } : {};
  }
}
