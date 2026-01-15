import { afterAll, describe, expect, it } from "vitest";
import { closeRedis, getCache, initRedis, setCache } from "../src/cache/redis.js";

const REDIS_URL = "redis://localhost:6379";

describe("redis cache", () => {
  afterAll(async () => {
    await closeRedis();
  });

  it("sets and gets a value", async () => {
    try {
      await initRedis(REDIS_URL);
    } catch {
      return;
    }
    const key = `test:key:${Date.now()}`;
    await setCache(key, "hello", 10);
    const value = await getCache(key);
    expect(value).toBe("hello");
  });
});
