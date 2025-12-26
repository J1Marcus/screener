/**
 * Data caching layer for API responses
 * Uses localStorage with TTL, LRU eviction, and usage tracking
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  apiCallsToday: number;
  lastResetDate: string;
}

interface CacheConfig {
  dailyDataTTL: number;      // ms - 4 hours for daily data
  weeklyDataTTL: number;     // ms - 24 hours for weekly data
  monthlyDataTTL: number;    // ms - 24 hours for monthly data
  maxSizeBytes: number;      // 5MB default
  maxApiCallsPerDay: number; // 800 for Twelve Data free tier
}

const DEFAULT_CONFIG: CacheConfig = {
  dailyDataTTL: 4 * 60 * 60 * 1000,      // 4 hours
  weeklyDataTTL: 24 * 60 * 60 * 1000,    // 24 hours
  monthlyDataTTL: 24 * 60 * 60 * 1000,   // 24 hours
  maxSizeBytes: 5 * 1024 * 1024,         // 5MB
  maxApiCallsPerDay: 800
};

const CACHE_KEY = 'screener_cache';
const STATS_KEY = 'screener_cache_stats';

export class DataCache {
  private store: Map<string, CacheEntry<any>>;
  private stats: CacheStats;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      apiCallsToday: 0,
      lastResetDate: this.getTodayString()
    };
    this.loadFromStorage();
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private loadFromStorage(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        this.store = new Map(Object.entries(parsed));
        // Remove expired entries on load
        this.evictExpired();
      }

      const stats = localStorage.getItem(STATS_KEY);
      if (stats) {
        this.stats = JSON.parse(stats);
        // Reset daily counter if new day
        if (this.stats.lastResetDate !== this.getTodayString()) {
          this.stats.apiCallsToday = 0;
          this.stats.lastResetDate = this.getTodayString();
        }
      }
    } catch (e) {
      console.warn('Failed to load cache from localStorage:', e);
      this.store = new Map();
    }
  }

  private saveToStorage(): void {
    try {
      const obj: Record<string, CacheEntry<any>> = {};
      this.store.forEach((value, key) => {
        obj[key] = value;
      });

      const serialized = JSON.stringify(obj);

      // Check size before saving
      if (serialized.length > this.config.maxSizeBytes) {
        this.evictLRU(serialized.length - this.config.maxSizeBytes);
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
      localStorage.setItem(STATS_KEY, JSON.stringify(this.stats));

      this.stats.size = serialized.length;
    } catch (e) {
      console.warn('Failed to save cache to localStorage:', e);
      // If storage is full, try to clear old entries
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        this.evictLRU(1024 * 1024); // Evict 1MB worth
        this.saveToStorage();
      }
    }
  }

  private evictExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.store.forEach((entry, key) => {
      if (entry.expiresAt < now) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.store.delete(key));
  }

  private evictLRU(bytesToFree: number): void {
    // Sort entries by timestamp (oldest first)
    const entries = Array.from(this.store.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    let freedBytes = 0;
    for (const [key, entry] of entries) {
      if (freedBytes >= bytesToFree) break;
      freedBytes += JSON.stringify(entry).length;
      this.store.delete(key);
    }
  }

  /**
   * Get TTL based on interval type
   */
  getTTL(interval: string): number {
    switch (interval) {
      case '1day':
        return this.config.dailyDataTTL;
      case '1week':
        return this.config.weeklyDataTTL;
      case '1month':
        return this.config.monthlyDataTTL;
      default:
        return this.config.dailyDataTTL;
    }
  }

  /**
   * Generate cache key for historical data
   */
  static getKey(symbol: string, interval: string, date?: string): string {
    const dateStr = date || new Date().toISOString().split('T')[0];
    return `${symbol}:${interval}:${dateStr}`;
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    this.evictExpired();

    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update timestamp for LRU
    entry.timestamp = Date.now();
    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set cached data with TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + (ttl || this.config.dailyDataTTL)
    };

    this.store.set(key, entry);
    this.saveToStorage();
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.store.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      apiCallsToday: this.stats.apiCallsToday,
      lastResetDate: this.stats.lastResetDate
    };
    localStorage.removeItem(CACHE_KEY);
    localStorage.setItem(STATS_KEY, JSON.stringify(this.stats));
  }

  /**
   * Track API call for rate limiting
   */
  trackApiCall(): void {
    // Reset if new day
    if (this.stats.lastResetDate !== this.getTodayString()) {
      this.stats.apiCallsToday = 0;
      this.stats.lastResetDate = this.getTodayString();
    }
    this.stats.apiCallsToday++;
    this.saveToStorage();
  }

  /**
   * Check if we're approaching rate limit
   */
  isNearRateLimit(): boolean {
    return this.stats.apiCallsToday >= this.config.maxApiCallsPerDay * 0.8;
  }

  /**
   * Check if rate limit is exceeded
   */
  isRateLimitExceeded(): boolean {
    return this.stats.apiCallsToday >= this.config.maxApiCallsPerDay;
  }

  /**
   * Get remaining API calls for today
   */
  getRemainingCalls(): number {
    return Math.max(0, this.config.maxApiCallsPerDay - this.stats.apiCallsToday);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get hit rate percentage
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) return 0;
    return (this.stats.hits / total) * 100;
  }
}

// Singleton instance
let cacheInstance: DataCache | null = null;

export function getCache(): DataCache {
  if (!cacheInstance) {
    cacheInstance = new DataCache();
  }
  return cacheInstance;
}

export function clearCache(): void {
  if (cacheInstance) {
    cacheInstance.clear();
  }
}
