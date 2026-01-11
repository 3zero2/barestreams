import { addonBuilder } from "stremio-addon-sdk";
import { getCache, setCache } from "./cache/redis.js";
import { parseStremioId, type ParsedStremioId } from "./parsing/stremioId.js";
import { scrapeEztvStreams } from "./scrapers/eztv.js";
import { scrapeTorrentGalaxyStreams } from "./scrapers/torrentGalaxy.js";
import { scrapeYtsStreams } from "./scrapers/yts.js";
import type { AppConfig } from "./config.js";
import { BadRequestError, type StreamResponse } from "./types.js";

export const CACHE_TTL_SECONDS = 604800;

export const manifest = {
  id: "lazy.torrentio",
  version: "1.0.0",
  name: "lazy-torrentio",
  description: "On-demand streams addon",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"]
};

const buildCacheKey = (type: string, parsed: ParsedStremioId): string => {
  if (type === "movie") {
    return `stream:movie:${parsed.baseId}`;
  }

  if (type !== "series") {
    throw new BadRequestError("Invalid type");
  }

  if (parsed.season && parsed.episode) {
    return `stream:series:${parsed.baseId}:${parsed.season}:${parsed.episode}`;
  }

  return `stream:series:${parsed.baseId}`;
};

export const createAddonInterface = (config: AppConfig) => {
  const builder = new addonBuilder(manifest);

  builder.defineStreamHandler(async ({ type, id }) => {
    if (type !== "movie" && type !== "series") {
      throw new BadRequestError("Invalid type");
    }

    const parsed = parseStremioId(id);
    const key = buildCacheKey(type, parsed);
    const cached = await getCache(key);

    if (cached) {
      return JSON.parse(cached) as StreamResponse;
    }

    const responses = await Promise.allSettled(
      type === "movie"
        ? [
            scrapeYtsStreams(parsed, config.ytsUrls),
            scrapeTorrentGalaxyStreams(parsed, config.tgxUrls)
          ]
        : [
            scrapeEztvStreams(parsed, config.eztvUrls),
            scrapeTorrentGalaxyStreams(parsed, config.tgxUrls)
          ]
    );

    const seen = new Set<string>();
    const streams = responses.flatMap((result) => {
      if (result.status !== "fulfilled") {
        return [];
      }
      return result.value.streams.filter((stream) => {
        if (seen.has(stream.url)) {
          return false;
        }
        seen.add(stream.url);
        return true;
      });
    });

    const response: StreamResponse = { streams };
    await setCache(key, JSON.stringify(response), CACHE_TTL_SECONDS);
    return response;
  });

  return builder.getInterface();
};
