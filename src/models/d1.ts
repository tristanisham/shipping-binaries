// Cloudflare restarts a D1 Durable Object mid-request as normal platform
// behavior. The restart rejects the in-flight statement with a transient
// `D1_ERROR` storage-reset message, and the same statement succeeds on a
// retry. Genuine SQL errors carry other messages and must fall through to the
// caller untouched, so we retry only the known transient patterns.
const TRANSIENT_D1_PATTERN =
  /D1_ERROR.*(reset|starting up|network connection lost)/i;

const isTransientD1Error = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_D1_PATTERN.test(message);
};

const RETRY_DELAY_MS = 25;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Runs a D1 read and re-runs it after a short backoff when the platform reset
// the storage object. `attempts` counts the total tries, so the default gives
// the original call plus two retries.
export const withD1Retry = async <T>(
  read: () => Promise<T>,
  attempts = 3,
): Promise<T> => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await read();
    } catch (error) {
      if (attempt >= attempts || !isTransientD1Error(error)) {
        throw error;
      }
      await delay(RETRY_DELAY_MS * attempt);
    }
  }
};
