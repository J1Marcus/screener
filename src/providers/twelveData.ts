import { Candle } from '../contract';
import { DataCache, getCache } from './cache';

export interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  percent_change: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string;
  is_market_open: boolean;
}

export type HistoricalInterval = '1day' | '1week' | '1month';

export interface TimeSeriesResponse {
  meta: {
    symbol: string;
    interval: string;
    currency: string;
    exchange_timezone: string;
    exchange: string;
    type: string;
  };
  values: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }>;
  status: string;
}

export interface TwelveDataResponse {
  [symbol: string]: {
    price: string;
    change: string;
    percent_change: string;
    high: string;
    low: string;
    volume: string;
    timestamp: string;
    is_market_open: boolean;
  };
}

export class TwelveDataProvider {
  private apiKey: string;
  private baseUrl = 'https://api.twelvedata.com';
  private cache: DataCache;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.cache = getCache();
  }

  /**
   * Fetch real-time quotes for multiple symbols in a single API call
   * Uses the batch quote endpoint to minimize API usage
   */
  async getBatchQuotes(symbols: string[]): Promise<QuoteData[]> {
    if (!symbols.length) return [];
    
    // Twelve Data allows up to 120 symbols per batch request
    const batchSize = 120;
    const results: QuoteData[] = [];
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchResults = await this.fetchBatch(batch);
      results.push(...batchResults);
    }
    
    return results;
  }

  private async fetchBatch(symbols: string[]): Promise<QuoteData[]> {
    const symbolsParam = symbols.join(',');
    const url = `${this.baseUrl}/quote?symbol=${symbolsParam}&apikey=${this.apiKey}`;
    
    try {
      console.log('Fetching from URL:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      // Handle API errors - check for various error formats
      if (data.code && data.message) {
        throw new Error(`API Error ${data.code}: ${data.message}`);
      }
      
      if (data.status === 'error') {
        throw new Error(`API Error: ${data.message || 'Unknown error'}`);
      }
      
      // Handle single symbol response (wrap in object)
      if (symbols.length === 1 && data.symbol) {
        const wrappedData = { [symbols[0]]: data };
        return this.parseResponse(wrappedData);
      }
      
      return this.parseResponse(data);
    } catch (error) {
      console.error('Twelve Data API error:', error);
      throw error;
    }
  }

  private parseResponse(data: any): QuoteData[] {
    const quotes: QuoteData[] = [];
    
    // Handle different response formats
    if (!data || typeof data !== 'object') {
      console.warn('Invalid response data:', data);
      return quotes;
    }
    
    for (const [symbol, quote] of Object.entries(data)) {
      try {
        if (!quote || typeof quote !== 'object') {
          console.warn(`Invalid quote data for ${symbol}:`, quote);
          continue;
        }
        
        const quoteObj = quote as any;
        
        // Handle missing or invalid fields gracefully
        const price = parseFloat(quoteObj.price || quoteObj.close || '0');
        const change = parseFloat(quoteObj.change || '0');
        const percent_change = parseFloat(quoteObj.percent_change || '0');
        const high = parseFloat(quoteObj.high || quoteObj.price || '0');
        const low = parseFloat(quoteObj.low || quoteObj.price || '0');
        const volume = parseInt(quoteObj.volume || '0', 10);
        
        if (isNaN(price) || price <= 0) {
          console.warn(`Invalid price for ${symbol}:`, quoteObj.price);
          continue;
        }
        
        quotes.push({
          symbol,
          price,
          change: isNaN(change) ? 0 : change,
          percent_change: isNaN(percent_change) ? 0 : percent_change,
          high: isNaN(high) ? price : high,
          low: isNaN(low) ? price : low,
          volume: isNaN(volume) ? 0 : volume,
          timestamp: quoteObj.timestamp || new Date().toISOString(),
          is_market_open: quoteObj.is_market_open ?? true
        });
      } catch (error) {
        console.warn(`Failed to parse quote for ${symbol}:`, error, quote);
      }
    }
    
    return quotes;
  }

  /**
   * Test the API connection with a single symbol
   */
  async testConnection(): Promise<boolean> {
    try {
      const quotes = await this.getBatchQuotes(['AAPL']);
      return quotes.length > 0;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  /**
   * Get API usage information (if available)
   */
  async getUsageInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api_usage?apikey=${this.apiKey}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Could not fetch usage info:', error);
    }
    return null;
  }

  /**
   * Fetch historical OHLCV data for a single symbol
   * Uses caching to minimize API calls
   */
  async getHistoricalData(
    symbol: string,
    interval: HistoricalInterval = '1day',
    outputSize: number = 250
  ): Promise<Candle[]> {
    // Check cache first
    const cacheKey = DataCache.getKey(symbol, interval);
    const cached = this.cache.get<Candle[]>(cacheKey);
    if (cached) {
      console.log(`Cache hit for ${symbol} ${interval}`);
      return cached;
    }

    // Check rate limit
    if (this.cache.isRateLimitExceeded()) {
      throw new Error('Daily API rate limit exceeded. Please try again tomorrow.');
    }

    console.log(`Fetching historical data for ${symbol} ${interval}`);

    const url = `${this.baseUrl}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputSize}&apikey=${this.apiKey}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data: TimeSeriesResponse = await response.json();

      // Track API call
      this.cache.trackApiCall();

      // Handle API errors
      if (data.status === 'error' || !data.values) {
        throw new Error(`API Error: ${(data as any).message || 'No data returned'}`);
      }

      // Convert to Candle format (reverse to get oldest first)
      const candles: Candle[] = data.values.reverse().map(v => ({
        t: v.datetime,
        o: parseFloat(v.open),
        h: parseFloat(v.high),
        l: parseFloat(v.low),
        c: parseFloat(v.close),
        v: parseInt(v.volume, 10)
      }));

      // Cache the result
      const ttl = this.cache.getTTL(interval);
      this.cache.set(cacheKey, candles, ttl);

      return candles;
    } catch (error) {
      console.error(`Failed to fetch historical data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch historical data for multiple symbols with caching
   * Respects rate limits and batches requests
   */
  async getBatchHistoricalData(
    symbols: string[],
    interval: HistoricalInterval = '1day',
    outputSize: number = 250,
    onProgress?: (completed: number, total: number, symbol: string) => void
  ): Promise<Record<string, Candle[]>> {
    const results: Record<string, Candle[]> = {};
    const toFetch: string[] = [];

    // Check cache for each symbol
    for (const symbol of symbols) {
      const cacheKey = DataCache.getKey(symbol, interval);
      const cached = this.cache.get<Candle[]>(cacheKey);
      if (cached) {
        results[symbol] = cached;
      } else {
        toFetch.push(symbol);
      }
    }

    console.log(`Cache hits: ${Object.keys(results).length}, to fetch: ${toFetch.length}`);

    // Fetch remaining symbols (with rate limiting)
    // Twelve Data allows 8 requests per minute on free tier
    // Using shorter delay - API will return error if we hit limit, which we handle
    const delayBetweenRequests = 1500; // 1.5 seconds between requests

    for (let i = 0; i < toFetch.length; i++) {
      const symbol = toFetch[i];

      // Check rate limit before each request
      if (this.cache.isRateLimitExceeded()) {
        console.warn('Rate limit reached, stopping batch fetch');
        break;
      }

      try {
        const candles = await this.getHistoricalData(symbol, interval, outputSize);
        results[symbol] = candles;

        if (onProgress) {
          onProgress(i + 1, toFetch.length, symbol);
        }

        // Delay between requests to respect rate limit
        if (i < toFetch.length - 1) {
          await this.delay(delayBetweenRequests);
        }
      } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error);
        // Continue with other symbols
      }
    }

    return results;
  }

  /**
   * Get remaining API calls for today
   */
  getRemainingApiCalls(): number {
    return this.cache.getRemainingCalls();
  }

  /**
   * Check if near rate limit (80% used)
   */
  isNearRateLimit(): boolean {
    return this.cache.isNearRateLimit();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Utility functions
export function formatPriceChange(change: number, percentChange: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}$${change.toFixed(2)} (${sign}${percentChange.toFixed(2)}%)`;
}

export function getPriceChangeColor(change: number): string {
  if (change > 0) return '#28a745'; // green
  if (change < 0) return '#dc3545'; // red
  return '#6c757d'; // gray
}

// Storage utilities for API key
export const API_KEY_STORAGE_KEY = 'twelvedata_api_key';

export function saveApiKey(apiKey: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
}

export function loadApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}