/**
 * Limitador de frecuencia por IP con ventana fija en memoria.
 *
 * Suficiente para una instancia única y sin dependencias externas. En un
 * despliegue con varias instancias serverless cada una lleva su propia cuenta;
 * para límites globales usa el firewall del proveedor (Vercel Firewall, Render).
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly maxKeys = 20_000
  ) {}

  check(key: string): RateLimitResult {
    if (this.max <= 0) {
      return { allowed: true, limit: 0, remaining: 0, resetSeconds: 0, retryAfterSeconds: 0 };
    }
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      if (this.buckets.size >= this.maxKeys) this.sweep(now);
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return {
        allowed: true,
        limit: this.max,
        remaining: Math.max(0, this.max - 1),
        resetSeconds: Math.ceil(this.windowMs / 1000),
        retryAfterSeconds: 0,
      };
    }

    existing.count += 1;
    const allowed = existing.count <= this.max;
    return {
      allowed,
      limit: this.max,
      remaining: Math.max(0, this.max - existing.count),
      resetSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  private sweep(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    if (this.buckets.size >= this.maxKeys) {
      // Sigue lleno: vaciamos las entradas más antiguas.
      const excess = this.buckets.size - Math.floor(this.maxKeys * 0.9);
      let removed = 0;
      for (const key of this.buckets.keys()) {
        this.buckets.delete(key);
        if (++removed >= excess) break;
      }
    }
  }

  reset(): void {
    this.buckets.clear();
  }
}
