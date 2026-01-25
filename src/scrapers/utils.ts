const SIZE_PATTERN = /([\d.]+)\s*(B|KB|MB|GB|TB|KIB|MIB|GIB|TIB)/i;

export const parseNumber = (value: string): number => {
	const parsed = Number(value.replace(/,/g, "").trim());
	return Number.isFinite(parsed) ? parsed : 0;
};

export const parseSizeToBytes = (rawSize: string): number | null => {
	const match = rawSize.trim().match(SIZE_PATTERN);
	if (!match) {
		return null;
	}
	const value = Number.parseFloat(match[1]);
	if (!Number.isFinite(value)) {
		return null;
	}
	const unit = match[2].toUpperCase();
	const base = unit.endsWith("IB") ? 1024 : 1024;
	const multipliers: Record<string, number> = {
		B: 1,
		KB: base,
		MB: base ** 2,
		GB: base ** 3,
		TB: base ** 4,
		KIB: 1024,
		MIB: 1024 ** 2,
		GIB: 1024 ** 3,
		TIB: 1024 ** 4,
	};
	const multiplier = multipliers[unit];
	if (!multiplier) {
		return null;
	}
	return Math.round(value * multiplier);
};

export const extractFilename = (name: string): string | undefined => {
	const match = name.match(/\b([^\s/\\]+?\.(?:mkv|mp4|avi|ts|m4v))\b/i);
	return match?.[1];
};
