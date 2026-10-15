/** Client-side fetch helper: JSON in, JSON out, server error messages surfaced as Error. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? "GET",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error((data as { error?: string }).error ?? `Request failed (${res.status})`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return data as T;
}
