import "server-only";

const rateLimits = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const record = rateLimits.get(key);

  if (!record || record.expiresAt < now) {
    rateLimits.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

// Clean up expired records every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimits.entries()) {
    if (record.expiresAt < now) {
      rateLimits.delete(key);
    }
  }
}, 60 * 60 * 1000).unref();
