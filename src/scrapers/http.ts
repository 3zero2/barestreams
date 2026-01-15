const DEFAULT_TIMEOUT_MS = 10_000;
const flareSolverrUrl = "http://localhost:8191";

type FetchOptions = {
  timeoutMs?: number;
  useFlareSolverr?: boolean;
};

type FlareSolverrResponse = {
  status: string;
  solution?: {
    response: string;
    status: number;
  };
};

export const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, "");

const fetchWithTimeout = async (url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "lazy-torrentio" },
      signal: controller.signal
    });
    if (!response.ok) {
      return null;
    }
    return response;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const fetchTextViaFlareSolverr = async (url: string, timeoutMs: number): Promise<string | null> => {
  if (!flareSolverrUrl) {
    return null;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${flareSolverrUrl}/v1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: "request.get",
        url,
        maxTimeout: timeoutMs
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as FlareSolverrResponse;
    if (payload.status !== "ok" || !payload.solution?.response) {
      return null;
    }
    if (payload.solution.status < 200 || payload.solution.status >= 300) {
      return null;
    }
    return payload.solution.response;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export const fetchJson = async <T>(url: string, options?: FetchOptions): Promise<T | null> => {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (options?.useFlareSolverr) {
    const text = await fetchTextViaFlareSolverr(url, timeoutMs);
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }
  const response = await fetchWithTimeout(url, timeoutMs);
  if (!response) {
    return null;
  }
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

export const fetchText = async (url: string, options?: FetchOptions): Promise<string | null> => {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (options?.useFlareSolverr) {
    return fetchTextViaFlareSolverr(url, timeoutMs);
  }
  const response = await fetchWithTimeout(url, timeoutMs);
  if (!response) {
    return null;
  }
  try {
    return await response.text();
  } catch {
    return null;
  }
};
