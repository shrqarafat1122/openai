export function isRetryable(err: any): boolean {
  const status = err?.status ?? err?.statusCode;
  if (typeof status !== "number") return true; // Network/timeouts
  if (status === 429) return true;            // Rate limit
  if (status === 401 || status === 403) return true; // Bad API key
  if (status >= 500) return true;             // Upstream faults
  return false;
}

export async function withKeyRotation<T, C>(
  keys: string[],
  clientFactory: (key: string) => C,
  action: (client: C) => Promise<T>
): Promise<T> {
  if (!keys || keys.length === 0) {
    throw new Error("No upstream keys configured for this provider");
  }

  let lastErr: unknown;
  for (let i = 0; i < keys.length; i++) {
    const client = clientFactory(keys[i]);
    try {
      return await action(client);
    } catch (err: any) {
      lastErr = err;
      // If we have more keys left and the error is retryable, fallback.
      if (i < keys.length - 1 && isRetryable(err)) {
        console.warn(`Key index ${i} failed with status ${err?.status ?? "unknown"}. Retrying with next key...`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
