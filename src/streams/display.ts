export type StreamDisplayOptions = {
  addonPrefix: string;
  imdbTitle: string;
  season?: number;
  episode?: number;
  torrentName?: string;
  quality?: string | null;
  seeders?: number;
  sizeBytes?: number | null;
  sizeLabel?: string | null;
};

const QUALITY_REGEX = /\b(2160p|1080p|720p|480p|4k|uhd)\b/i;

export const extractQualityHint = (text: string): string | null => {
  const match = text.match(QUALITY_REGEX);
  if (!match) {
    return null;
  }
  const quality = match[1].toLowerCase();
  if (quality === "4k" || quality === "uhd") {
    return "2160p";
  }
  return quality;
};

const formatEpisode = (season?: number, episode?: number): string | null => {
  if (!season || !episode) {
    return null;
  }
  const seasonStr = season.toString().padStart(2, "0");
  const episodeStr = episode.toString().padStart(2, "0");
  return `📌 S${seasonStr}E${episodeStr}`;
};

const buildTitlePattern = (title: string): RegExp | null => {
  const trimmed = title.trim();
  if (!trimmed) {
    return null;
  }
  const pattern = trimmed.replace(/[^a-z0-9]+/gi, "[^a-z0-9]+");
  if (!pattern) {
    return null;
  }
  return new RegExp(pattern, "i");
};

const buildTorrentSlug = (torrentName?: string, imdbTitle?: string): string | null => {
  if (!torrentName) {
    return null;
  }
  let stripped = torrentName;
  if (imdbTitle) {
    const pattern = buildTitlePattern(imdbTitle);
    if (pattern) {
      stripped = stripped.replace(pattern, "");
    }
  }
  const cleaned = stripped
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "")
    .trim();
  return cleaned ? cleaned : null;
};

const formatBytes = (bytes: number): string => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 10 || unitIndex === 0 ? 0 : 2;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
};

const formatInfoLine = (seeders?: number, sizeBytes?: number | null, sizeLabel?: string | null): string | null => {
  const parts: string[] = [];
  if (typeof seeders === "number" && seeders > 0) {
    parts.push(`🌱 ${seeders}`);
  }
  if (typeof sizeBytes === "number" && sizeBytes > 0) {
    parts.push(`💾 ${formatBytes(sizeBytes)}`);
  } else if (sizeLabel) {
    parts.push(`💾 ${sizeLabel.trim()}`);
  }
  if (parts.length === 0) {
    return null;
  }
  return parts.join(" • ");
};

export const formatStreamDisplay = (options: StreamDisplayOptions): {
  name: string;
  title: string;
  description?: string;
} => {
  const qualityLabel = options.quality?.trim();
  const name = qualityLabel ? `🧲 ${options.addonPrefix} ${qualityLabel}` : `🧲 ${options.addonPrefix}`;
  const titleEmoji = options.season && options.episode ? "📺" : "🎬";
  const titleLine = `${titleEmoji} ${options.imdbTitle}`;
  const episodeLine = formatEpisode(options.season, options.episode);
  const slugLine = buildTorrentSlug(options.torrentName, options.imdbTitle);
  const slugDisplay = slugLine ? `🏷️ ${slugLine}` : null;
  const infoLine = formatInfoLine(options.seeders, options.sizeBytes ?? null, options.sizeLabel ?? null);
  const lines = [titleLine, episodeLine, slugDisplay].filter((line): line is string => Boolean(line));

  return {
    name,
    title: lines.join("\n"),
    description: infoLine ?? undefined
  };
};
