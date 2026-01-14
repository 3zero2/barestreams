import { ProxyAgent } from "undici";

const DEFAULT_TIMEOUT_MS = 10_000;
const proxyUrl = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

export const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, "");

const fetchWithTimeout = async (url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "lazy-torrentio" },
      dispatcher: proxyAgent,
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

export const fetchJson = async <T>(url: string): Promise<T | null> => {
  const response = await fetchWithTimeout(url);
  if (!response) {
    return null;
  }
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

export const fetchText = async (url: string): Promise<string | null> => {
  const response = await fetchWithTimeout(url);
  if (!response) {
    return null;
  }
  try {
    return await response.text();
  } catch {
    return null;
  }
};
