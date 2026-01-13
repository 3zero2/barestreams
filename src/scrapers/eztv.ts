import type { ParsedStremioId } from "../parsing/stremioId.js";
import type { StreamResponse } from "../types.js";

type EztvTorrent = {
  title?: string;
  filename?: string;
  torrent_url?: string;
  magnet_url?: string;
  seeds?: number;
  size_bytes?: number;
  season?: number;
  episode?: number;
};

type EztvResponse = {
  torrents?: EztvTorrent[];
  torrents_count?: number;
  limit?: number;
  page?: number;
};

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, "");
const DEBUG = process.env.DEBUG_EZTV === "1";

const fetchJson = async (url: string): Promise<EztvResponse | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "lazy-torrentio" },
      signal: controller.signal
    });
    if (!response.ok) {
      if (DEBUG) {
        console.warn(`[EZTV] ${response.status} ${response.statusText} for ${url}`);
      }
      return null;
    }
    const data = (await response.json()) as EztvResponse;
    if (DEBUG) {
      const count = data.torrents?.length ?? 0;
      const total = data.torrents_count ?? "n/a";
      const page = data.page ?? "n/a";
      const limit = data.limit ?? "n/a";
      console.warn(`[EZTV] ${url} returned ${count} torrents (page=${page} limit=${limit} total=${total})`);
    }
    return data;
  } catch (err) {
    if (DEBUG) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[EZTV] fetch failed for ${url}: ${message}`);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const getImdbDigits = (baseId: string): string => baseId.replace(/^tt/, "");
const DEFAULT_LIMIT = 30;
const MAX_PAGES = 50;

const buildApiUrl = (baseUrl: string, imdbId: string, page: number): string => {
  const normalized = normalizeBaseUrl(baseUrl);
  const url = new URL(`${normalized}/api/get-torrents`);
  url.searchParams.set("imdb_id", imdbId);
  url.searchParams.set("page", String(page));
  return url.toString();
};

const fetchAllTorrents = async (baseUrl: string, imdbId: string): Promise<EztvTorrent[]> => {
  const torrents: EztvTorrent[] = [];
  const firstUrl = buildApiUrl(baseUrl, imdbId, 1);
  if (DEBUG) {
    console.warn(`[EZTV] fetching ${firstUrl}`);
  }
  const firstResponse = await fetchJson(firstUrl);
  if (!firstResponse) {
    return torrents;
  }

  const firstBatch = firstResponse.torrents ?? [];
  torrents.push(...firstBatch);

  let expectedTotal = typeof firstResponse.torrents_count === "number" ? firstResponse.torrents_count : null;
  let pageLimit = typeof firstResponse.limit === "number" && firstResponse.limit > 0 ? firstResponse.limit : DEFAULT_LIMIT;

  if (
    firstBatch.length === 0 ||
    (expectedTotal !== null && torrents.length >= expectedTotal) ||
    firstBatch.length < pageLimit
  ) {
    if (DEBUG) {
      console.warn("[EZTV] fetched only page 1");
    }
    return torrents;
  }

  const totalPages = expectedTotal ? Math.ceil(expectedTotal / pageLimit) : MAX_PAGES;
  const lastPage = Math.min(totalPages, MAX_PAGES);
  const pageNumbers = Array.from({ length: Math.max(0, lastPage - 1) }, (_, index) => index + 2);
  const concurrency = 5;

  for (let i = 0; i < pageNumbers.length; i += concurrency) {
    const batchPages = pageNumbers.slice(i, i + concurrency);
    const responses = await Promise.all(
      batchPages.map(async (page) => {
        const url = buildApiUrl(baseUrl, imdbId, page);
        if (DEBUG) {
          console.warn(`[EZTV] fetching ${url}`);
        }
        return fetchJson(url);
      })
    );

    for (const response of responses) {
      const batch = response?.torrents ?? [];
      torrents.push(...batch);
      if (batch.length < pageLimit) {
        break;
      }
    }
    if (expectedTotal !== null && torrents.length >= expectedTotal) {
      break;
    }
  }

  if (DEBUG) {
    console.warn(`[EZTV] fetched ${torrents.length} torrents across ${lastPage} page(s)`);
  }

  return torrents;
};

const parseEpisodeFromText = (text: string): { season: number; episode: number } | null => {
  const normalized = text.replace(/\s+/g, " ").trim();
  const match =
    normalized.match(/S(?:eason)?\s*0?(\d{1,2})\s*E(?:pisode)?\s*0?(\d{1,2})/i) ??
    normalized.match(/S(\d{1,2})\s*E(\d{1,2})/i) ??
    normalized.match(/(\d{1,2})x(\d{1,2})/i);
  if (!match) {
    return null;
  }
  const season = Number(match[1]);
  const episode = Number(match[2]);
  if (!Number.isFinite(season) || !Number.isFinite(episode)) {
    return null;
  }
  return { season, episode };
};

const matchesEpisode = (torrent: EztvTorrent, season?: number, episode?: number): boolean => {
  if (!season || !episode) {
    return true;
  }

  const torrentSeason = Number(torrent.season);
  const torrentEpisode = Number(torrent.episode);
  if (torrentSeason > 0 && torrentEpisode > 0) {
    return torrentSeason === season && torrentEpisode === episode;
  }

  const text = torrent.title ?? torrent.filename ?? "";
  const parsed = text ? parseEpisodeFromText(text) : null;
  if (!parsed) {
    return false;
  }
  return parsed.season === season && parsed.episode === episode;
};

const formatTitle = (torrent: EztvTorrent): string => {
  const baseTitle = torrent.title ?? torrent.filename ?? "EZTV";
  if (!torrent.seeds && !torrent.size_bytes) {
    return baseTitle;
  }

  const parts: string[] = [];
  if (torrent.seeds) {
    parts.push(`S:${torrent.seeds}`);
  }
  if (torrent.size_bytes) {
    const sizeGiB = torrent.size_bytes / (1024 * 1024 * 1024);
    parts.push(`${sizeGiB.toFixed(2)} GiB`);
  }
  return `${baseTitle} (${parts.join(" • ")})`;
};

export const scrapeEztvStreams = async (
  parsed: ParsedStremioId,
  eztvUrls: string[]
): Promise<StreamResponse> => {
  const imdbDigits = getImdbDigits(parsed.baseId);
  if (DEBUG) {
    console.warn(`[EZTV] imdb=${imdbDigits} season=${parsed.season ?? "n/a"} episode=${parsed.episode ?? "n/a"}`);
  }
  const responses = await Promise.allSettled(
    eztvUrls.flatMap((baseUrl) => {
      const imdbIds = [imdbDigits, `tt${imdbDigits}`];
      return imdbIds.map((imdbId) => fetchAllTorrents(baseUrl, imdbId));
    })
  );

  const torrents = responses.flatMap((result) => {
    if (result.status !== "fulfilled") {
      return [];
    }
    return result.value;
  });

  const seen = new Set<string>();
  const streams = torrents
    .filter((torrent) => matchesEpisode(torrent, parsed.season, parsed.episode))
    .map((torrent) => {
      const url = torrent.magnet_url ?? torrent.torrent_url;
      if (!url) {
        return null;
      }
      if (seen.has(url)) {
        return null;
      }
      seen.add(url);
      return {
        name: "EZTV",
        title: formatTitle(torrent),
        url
      };
    })
    .filter((stream): stream is NonNullable<typeof stream> => Boolean(stream));

  if (DEBUG) {
    console.warn(`[EZTV] ${streams.length} streams after filtering`);
    if (streams.length === 0 && torrents.length > 0) {
      const sample = torrents.slice(0, 5).map((torrent) => ({
        title: torrent.title ?? torrent.filename ?? "n/a",
        season: torrent.season,
        episode: torrent.episode
      }));
      console.warn("[EZTV] sample torrents:", sample);
      const seasonHints = torrents
        .filter((torrent) => {
          const title = (torrent.title ?? torrent.filename ?? "").toLowerCase();
          return title.includes("s02") || title.includes("season 2") || title.includes(" 2x");
        })
        .slice(0, 5)
        .map((torrent) => ({
          title: torrent.title ?? torrent.filename ?? "n/a",
          season: torrent.season,
          episode: torrent.episode
        }));
      if (seasonHints.length > 0) {
        console.warn("[EZTV] season-2-ish torrents:", seasonHints);
      }
    }
  }
  return { streams };
};
