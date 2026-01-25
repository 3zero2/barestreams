import { config } from "../config.js";
import { ScraperKey } from "./keys.js";

export type FlareSolverrPoolConfig = {
	key: ScraperKey;
	sessionCount: number;
	warmupUrl: string;
};

type FlareSolverrPoolConfigProvider = () => FlareSolverrPoolConfig | null;

const flareSolverrPoolProviders = new Map<
	ScraperKey,
	FlareSolverrPoolConfigProvider
>();

export const registerFlareSolverrPoolConfigProvider = (
	key: ScraperKey,
	provider: FlareSolverrPoolConfigProvider,
): void => {
	flareSolverrPoolProviders.set(key, provider);
};

export const getFlareSolverrPoolConfigs = (): FlareSolverrPoolConfig[] => {
	const configs: FlareSolverrPoolConfig[] = [];
	for (const provider of flareSolverrPoolProviders.values()) {
		const config = provider();
		if (config) {
			configs.push(config);
		}
	}
	return configs;
};

export const applyFlareSolverrSessionCap = (count: number): number => {
	const sessionCap = config.flareSolverrSessions;
	return sessionCap > 0 ? Math.min(sessionCap, count) : 0;
};
