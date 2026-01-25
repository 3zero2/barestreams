import { describe, expect, it } from "vitest";
import {
	extractFilename,
	parseNumber,
	parseSizeToBytes,
} from "../src/scrapers/utils.js";

describe("scraper utils", () => {
	it("parses numeric strings with commas", () => {
		expect(parseNumber("1,234")).toBe(1234);
		expect(parseNumber(" 99 ")).toBe(99);
		expect(parseNumber("nope")).toBe(0);
	});

	it("parses size strings into bytes", () => {
		expect(parseSizeToBytes("700 MB")).toBe(700 * 1024 * 1024);
		expect(parseSizeToBytes("1.5 GiB")).toBe(Math.round(1.5 * 1024 ** 3));
		expect(parseSizeToBytes("bad")).toBeNull();
	});

	it("extracts filenames from release names", () => {
		expect(extractFilename("Movie.2024.1080p.mkv")).toBe(
			"Movie.2024.1080p.mkv",
		);
		expect(extractFilename("Show.S01E01.720p.mp4")).toBe(
			"Show.S01E01.720p.mp4",
		);
		expect(extractFilename("No file here")).toBeUndefined();
	});
});
