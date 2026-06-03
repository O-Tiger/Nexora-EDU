import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limit de login: 5 tentativas por IP a cada 15 minutos
// Instância lazy — só conecta quando chamado pela primeira vez
let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;

  if (!url || !token) {
    // Em dev sem Redis configurado, retornar um stub que sempre permite
    return {
      limit: async () => ({ success: true, limit: 5, remaining: 4, reset: 0, pending: Promise.resolve() }),
    } as unknown as Ratelimit;
  }

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "nexora:login",
  });

  return ratelimit;
}

export async function checkLoginRateLimit(ip: string): Promise<{
  success: boolean;
  remaining: number;
  reset: number;
}> {
  const rl = getRatelimit();
  const result = await rl.limit(ip);
  return { success: result.success, remaining: result.remaining, reset: result.reset };
}
