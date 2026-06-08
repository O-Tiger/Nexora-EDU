import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

// ─── Progresso cacheado ──────────────────────────────────────────────────────
// Chave: progress:{enrollmentId} → percentual (0-100) como número
const PROGRESS_TTL = 60 * 60 * 24; // 24h

export async function getCachedProgress(enrollmentId: string): Promise<number | null> {
  const r = getRedis();
  if (!r) return null;
  const val = await r.get<number>(`progress:${enrollmentId}`);
  return val ?? null;
}

export async function setCachedProgress(enrollmentId: string, percent: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.set(`progress:${enrollmentId}`, percent, { ex: PROGRESS_TTL });
}

export async function invalidateCachedProgress(enrollmentId: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.del(`progress:${enrollmentId}`);
}
