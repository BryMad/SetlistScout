import { gunzipSync, gzipSync } from "node:zlib";
import { createClient } from "redis";

/**
 * Two-layer cache: in-process memory (L1) + Redis (L2, optional).
 * Falls back to memory-only when REDIS_URL is absent or Redis is down,
 * so local dev never hard-depends on Redis. All v2 keys are prefixed
 * "v2:" — the old backend shares this Redis instance.
 *
 * cacheGet returns `undefined` on miss; `null` is a legitimate cached value.
 */

const memory = new Map<string, { value: unknown; expiresAt: number }>();
const MEMORY_MAX_ENTRIES = 500;
const MEMORY_TTL_ON_REDIS_HIT_S = 300;

let client: ReturnType<typeof createClient> | null = null;
let lastConnectAttempt = 0;
const CONNECT_RETRY_MS = 30_000;

async function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (client?.isReady) return client;
  const now = Date.now();
  if (now - lastConnectAttempt < CONNECT_RETRY_MS) return null;
  lastConnectAttempt = now;
  try {
    if (!client) {
      client = createClient({ url: process.env.REDIS_URL });
      client.on("error", (error: Error) =>
        console.error("[cache] redis:", error.message)
      );
    }
    if (!client.isOpen) await client.connect();
    return client.isReady ? client : null;
  } catch (error) {
    console.error("[cache] redis connect failed:", (error as Error).message);
    return null;
  }
}

// This Redis instance is shared with the production site — compress big
// values (a legacy artist's full history is ~2.7MB raw) so we can't crowd
// out its sessions. ~7x smaller as gzip+base64.
const COMPRESS_OVER_BYTES = 20_000;
const GZ_PREFIX = "gz:";

function encode(value: unknown): string {
  const json = JSON.stringify(value);
  if (json.length < COMPRESS_OVER_BYTES) return json;
  return GZ_PREFIX + gzipSync(json).toString("base64");
}

function decode<T>(raw: string): T {
  if (!raw.startsWith(GZ_PREFIX)) return JSON.parse(raw) as T;
  return JSON.parse(
    gunzipSync(Buffer.from(raw.slice(GZ_PREFIX.length), "base64")).toString()
  ) as T;
}

function memoryGet<T>(key: string): T | undefined {
  const hit = memory.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    memory.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function memorySet(key: string, value: unknown, ttlSeconds: number): void {
  if (memory.size >= MEMORY_MAX_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  const fromMemory = memoryGet<T>(key);
  if (fromMemory !== undefined) return fromMemory;

  const redis = await getRedis();
  if (!redis) return undefined;
  try {
    const raw = await redis.get(key);
    if (raw == null) return undefined;
    const value = decode<T>(raw);
    memorySet(key, value, MEMORY_TTL_ON_REDIS_HIT_S);
    return value;
  } catch {
    return undefined;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  memorySet(key, value, ttlSeconds);
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.set(key, encode(value), { EX: ttlSeconds });
  } catch {
    /* memory layer already has it */
  }
}

/** Batched get (one Redis round-trip). Misses come back as undefined. */
export async function cacheGetMany<T>(keys: string[]): Promise<(T | undefined)[]> {
  const results: (T | undefined)[] = keys.map((key) => memoryGet<T>(key));
  const missIndexes = results.flatMap((value, i) => (value === undefined ? [i] : []));
  if (missIndexes.length === 0) return results;

  const redis = await getRedis();
  if (!redis) return results;
  try {
    const raws = await redis.mGet(missIndexes.map((i) => keys[i]!));
    raws.forEach((raw: string | null, j: number) => {
      if (raw != null) {
        const value = decode<T>(raw);
        const index = missIndexes[j]!;
        results[index] = value;
        memorySet(keys[index]!, value, MEMORY_TTL_ON_REDIS_HIT_S);
      }
    });
  } catch {
    /* fall through with memory-only results */
  }
  return results;
}
