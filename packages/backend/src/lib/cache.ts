/** Caché LRU en memoria con TTL, pensada para respuestas de proveedores externos. */
import { config } from '../config.js';

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T = unknown> {
  private readonly store = new Map<string, Entry<T>>();
  private readonly maxEntries: number;
  private readonly defaultTtl: number;
  private hits = 0;
  private misses = 0;

  constructor(maxEntries = config.cache.maxEntries, defaultTtl = config.cache.providerTtlMs) {
    this.maxEntries = maxEntries;
    this.defaultTtl = defaultTtl;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }
    // Reinsertar para mantener el orden LRU.
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  set(key: string, value: T, ttl = this.defaultTtl): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next();
      if (!oldest.done) this.store.delete(oldest.value);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  async wrap(key: string, factory: () => Promise<T>, ttl = this.defaultTtl): Promise<{ value: T; cached: boolean }> {
    const existing = this.get(key);
    if (existing !== undefined) return { value: existing, cached: true };
    const value = await factory();
    this.set(key, value, ttl);
    return { value, cached: false };
  }

  clear(): void {
    this.store.clear();
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      entries: this.store.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : Math.round((this.hits / total) * 1000) / 1000,
    };
  }
}

export const providerCache = new TtlCache();
export const imageCache = new TtlCache<string>(64, 10 * 60_000);
