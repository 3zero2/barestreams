import { afterAll, describe, expect, it } from "vitest";
import { closeRedis, getCache, initRedis, setCache } from "../src/cache/redis.js";

describe("redis cache", () => {
  afterAll(async () => {
    await closeRedis();
  });

  const itWithRedis = process.env.REDIS_URL ? it : it.skip;

  itWithRedis("sets and gets a value", async () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return;
    }

    await initRedis(redisUrl);
    const key = `test:key:${Date.now()}`;
    await setCache(key, "hello", 10);
    const value = await getCache(key);
    expect(value).toBe("hello");
  });
});
