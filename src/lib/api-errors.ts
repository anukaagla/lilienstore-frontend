export const isThrottled = (response: Pick<Response, "status">) =>
  response.status === 429;

/**
 * Only readable cross-origin because the backend sets
 * `Access-Control-Expose-Headers: Retry-After`.
 */
export const getRetryAfterSeconds = (response: Response) => {
  const raw = response.headers.get("Retry-After");
  if (!raw) return null;

  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds);
  }

  // RFC 7231 also allows an HTTP-date.
  const date = new Date(raw).getTime();
  if (!Number.isNaN(date)) {
    const delta = Math.ceil((date - Date.now()) / 1000);
    return delta > 0 ? delta : null;
  }

  return null;
};

export const getThrottleMessage = (retryAfterSeconds: number | null) => {
  if (retryAfterSeconds === null) {
    return "Too many requests. Please try again in a moment.";
  }

  return `Too many requests. Please try again in ${retryAfterSeconds} seconds.`;
};

/** Convenience for the common `if (!response.ok)` branch. */
export const getThrottleMessageFromResponse = (response: Response) =>
  getThrottleMessage(getRetryAfterSeconds(response));
