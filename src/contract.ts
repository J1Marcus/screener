export type Trend = "up" | "down" | "sideways";
export type MACross = "20>50" | "50>200" | "20>200" | "none";
export type FibReference = "swing_high_to_low" | "swing_low_to_high";
export type FibZone =
  | "38.2-50"
  | "50-61.8"
  | "38.2-61.8"
  | "extension-127"
  | "extension-161.8"
  | "*";
export type SetupReason =
  | "Breakout"
  | "Momentum"
  | "Pullback"
  | "Fib Pullback"
  | "Consolidation"
  | "Reversal"
  // Leo methodology additions
  | "Reversal_Accumulation"
  | "Reversal_Distribution"
  | "BB_Lower_Bounce"
  | "BB_Upper_Reject"
  | "Stoch_Oversold_Reversal"
  | "Stoch_Overbought_Reversal";

// Leo methodology types
export type CandlestickPattern =
  | "doji"
  | "hammer"
  | "long_lower_shadow"
  | "gravestone_doji"
  | "shooting_star"
  | "engulfing_bullish"
  | "engulfing_bearish"
  | "none";

export type IndexName = "sp500" | "dowjones" | "nasdaq100" | "russell2000";
export type IndexFilter = IndexName | "*";

export type Timeframe = "daily" | "weekly" | "monthly";

export type VolumeShift = "buyer" | "seller" | "neutral";

export type BBPosition = "lower_bounce" | "upper_reject" | "middle";

export type StochPosition = "oversold" | "overbought" | "neutral";

export interface ScreenerParams {
  user_sector: string | "*";
  user_industry: string | "*";
  market_cap_min: number;          // USD
  market_cap_max: number;          // USD
  rsi_min: number;                 // 0–100
  rsi_max: number;                 // 0–100
  stoch_k_min: number;             // 0–100
  stoch_k_max: number;             // 0–100
  trend_type: Trend | "*";
  trend_lookback: number;          // trading days
  ma_cross: MACross;
  sr_proximity_pct: number;        // %
  adx_min: number;
  atr_lookback: number;
  fib_reference: FibReference;
  fib_zone: FibZone;
  max_results: number;
  as_of_date: string;              // ISO YYYY-MM-DD

  // Leo methodology parameters
  leo_mode_enabled: boolean;       // Enable Leo's reversal methodology
  index_filters: IndexName[];      // Filter by major indices (multi-select)
  min_price_leo: number;           // $50 minimum (Leo's requirement)
  candlestick_patterns: CandlestickPattern[]; // Patterns to scan for
  require_volume_shift: boolean;   // Require buyer/seller shift
  bb_bounce_enabled: boolean;      // Bollinger Band bounce detection
  stoch_oversold_threshold: number;  // Default 20
  stoch_overbought_threshold: number; // Default 80
  earnings_warning_days: number;   // Default 30
  timeframe: Timeframe;            // daily, weekly, monthly
}

export const DEFAULT_PARAMS: ScreenerParams = {
  user_sector: "*",
  user_industry: "*",
  market_cap_min: 2000000000,
  market_cap_max: 1e13,
  rsi_min: 0,
  rsi_max: 100,
  stoch_k_min: 0,
  stoch_k_max: 100,
  trend_type: "*",
  trend_lookback: 60,
  ma_cross: "none",
  sr_proximity_pct: 3,
  adx_min: 0,
  atr_lookback: 14,
  fib_reference: "swing_low_to_high",
  fib_zone: "*",
  max_results: 50,
  as_of_date: new Date().toISOString().split('T')[0], // Today's date

  // Leo methodology defaults (based on Leo's recommended settings)
  leo_mode_enabled: false,
  index_filters: ["sp500", "dowjones", "nasdaq100"], // Leo focuses on major indices
  min_price_leo: 50,
  candlestick_patterns: ["doji", "hammer", "long_lower_shadow"], // Leo's bullish reversal patterns
  require_volume_shift: true,    // Leo requires volume confirmation
  bb_bounce_enabled: true,       // Leo uses BB bounces
  stoch_oversold_threshold: 20,
  stoch_overbought_threshold: 80,
  earnings_warning_days: 30,
  timeframe: "weekly"            // Leo primarily uses weekly charts
};

export const FIXED_FILTERS = Object.freeze({
  minPrice: 30,             // last close > $30
  minAvgVol20: 1_000_000,   // shares
  minRelativeVol: 1.0,      // vol / SMA20(vol) > 1.0
  minBars: 250              // history bars
});

export function assertFixedFilters(): void {
  const F = FIXED_FILTERS as any;
  if (F.minPrice !== 30 || F.minAvgVol20 !== 1_000_000 || F.minRelativeVol !== 1.0 || F.minBars !== 250) {
    throw new Error("FIXED_FILTERS mismatch: must be {minPrice:30, minAvgVol20:1_000_000, minRelativeVol:1.0, minBars:250}");
  }
}

export interface Candle {
  t: string; // ISO date (session close)
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

// Leo methodology interfaces
export interface FVGZone {
  type: "bullish" | "bearish";
  topPrice: number;
  bottomPrice: number;
  midpoint: number;              // 50% retracement target
  startDate: string;
  endDate: string;
  isFilled: boolean;
}

export interface SwingPoint {
  date: string;
  price: number;
  type: "high" | "low";
  strength: number;              // Number of bars on each side
}

export interface PriceTarget {
  type: "fvg" | "swing" | "imbalance" | "percentage";
  price: number;
  description: string;
  confidence: number;            // 0-100
}

export interface VolumeAnalysis {
  shift: VolumeShift;
  strength: number;              // 0-100
  buyerVolume: number;
  sellerVolume: number;
}

export interface TickerMeta {
  ticker: string;                    // primary listing symbol
  company?: string | null;
  sector?: string | null;            // GICS or equivalent
  industry?: string | null;
  marketCap?: number | null;         // USD
  nextEarningsDate?: string | null;  // ISO YYYY-MM-DD
  lastCompletedBar?: string;         // ISO date
}

export interface Indicators {
  sma20?: number | null;
  sma50?: number | null;
  sma200?: number | null;
  rsi14?: number | null;
  stochK?: number | null;            // %K(14,3)
  atr?: number | null;               // ATR({atr_lookback})
  adx14?: number | null;
  avgVol20?: number | null;
  relVol?: number | null;            // v / avgVol20
  hh20?: number | null;
  ll20?: number | null;
  bbWidth?: number | null;           // (BBU20_2 - BBL20_2)/SMA20
  trend?: Trend | null;

  // Optional flags for S/R and Fib features:
  srDistancePct?: number | null;     // distance to nearest S/R in %
  fibHit?: boolean | null;           // touched selected Fib zone recently
  reactionBullish?: boolean | null;  // bullish reaction on touch/next bar

  // Leo methodology indicators
  bbUpper?: number | null;           // Bollinger Band upper
  bbLower?: number | null;           // Bollinger Band lower
  bbMiddle?: number | null;          // Bollinger Band middle (SMA20)
  bbPercentB?: number | null;        // Position within bands (0=lower, 1=upper)
  stochD?: number | null;            // Stochastic %D (slow line)
  candlestickPattern?: CandlestickPattern | null;
  volumeShift?: VolumeShift | null;
  volumeShiftStrength?: number | null;  // 0-100 score
  fvgZones?: FVGZone[] | null;       // Fair Value Gaps
  swingHighs?: SwingPoint[] | null;
  swingLows?: SwingPoint[] | null;
  earningsWithin30Days?: boolean | null;
  entryConfirmed?: boolean | null;   // Break and close above prev high
}

export interface ClassifiedPick {
  Ticker: string;
  Company: string | null;
  Price: number;
  MarketCap: number | null;
  Volume: number;
  RelativeVolume: number;
  RSI: number;
  Sector: string | null;
  Trend: Trend;
  NextEarningsDate: string | null;
  SelectionReason: SetupReason;

  // Leo methodology fields
  CandlestickPattern?: CandlestickPattern | null;
  VolumeShift?: VolumeShift | null;
  VolumeShiftStrength?: number | null;
  BBPosition?: BBPosition | null;
  BBPercentB?: number | null;
  StochPosition?: StochPosition | null;
  StochK?: number | null;
  EarningsWarning?: boolean | null;
  PriceTargets?: PriceTarget[] | null;
  EntryConfirmed?: boolean | null;
  ReversalTimeline?: string | null;  // "3-5 candles"
}

export interface EngineInput {
  params: ScreenerParams;
  timeseries?: Record<string, Candle[]>; // keyed by ticker
  metadata?: Record<string, TickerMeta>;
}

export interface EngineOutput {
  as_of_date: string;
  picks: ClassifiedPick[];
}

// Narrow runtime guard (dependency-free).
export function validateParams(p: Partial<ScreenerParams>): ScreenerParams {
  const m: ScreenerParams = { ...DEFAULT_PARAMS, ...p };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.as_of_date)) {
    throw new Error("as_of_date must be ISO YYYY-MM-DD");
  }
  if (m.market_cap_min > m.market_cap_max) {
    throw new Error("market_cap_min must be ≤ market_cap_max");
  }
  const inRange = (x: number, a: number, b: number) => Number.isFinite(x) && x >= a && x <= b;

  if (!inRange(m.rsi_min, 0, 100) || !inRange(m.rsi_max, 0, 100) || m.rsi_min > m.rsi_max) {
    throw new Error("RSI bounds must be within 0–100 and rsi_min ≤ rsi_max");
  }
  if (!inRange(m.stoch_k_min, 0, 100) || !inRange(m.stoch_k_max, 0, 100) || m.stoch_k_min > m.stoch_k_max) {
    throw new Error("Stochastic %K bounds must be within 0–100 and stoch_k_min ≤ stoch_k_max");
  }
  if (!Number.isInteger(m.trend_lookback) || m.trend_lookback <= 0) {
    throw new Error("trend_lookback must be a positive integer");
  }
  if (!Number.isInteger(m.max_results) || m.max_results <= 0) {
    throw new Error("max_results must be a positive integer");
  }
  if (!Number.isFinite(m.sr_proximity_pct) || m.sr_proximity_pct < 0) {
    throw new Error("sr_proximity_pct must be a non-negative number");
  }
  if (!Number.isFinite(m.adx_min) || m.adx_min < 0) {
    throw new Error("adx_min must be a non-negative number");
  }
  if (!Number.isFinite(m.atr_lookback) || m.atr_lookback <= 0 || !Number.isInteger(m.atr_lookback)) {
    throw new Error("atr_lookback must be a positive integer");
  }
  // Enum sanity (TypeScript enforces at compile time; this guards runtime)
  const maSet: Record<MACross, true> = { "20>50": true, "50>200": true, "20>200": true, "none": true };
  if (!(m.ma_cross in maSet)) throw new Error("ma_cross must be one of 20>50 | 50>200 | 20>200 | none");

  const trendSet: Record<Trend | "*", true> = { up: true, down: true, sideways: true, "*": true };
  if (!(m.trend_type in trendSet)) throw new Error('trend_type must be "up" | "down" | "sideways" | "*"');

  const fibRefSet: Record<FibReference, true> = { swing_high_to_low: true, swing_low_to_high: true };
  if (!(m.fib_reference in fibRefSet)) throw new Error('fib_reference must be "swing_high_to_low" | "swing_low_to_high"');

  const fibZoneSet: Record<FibZone, true> = {
    "38.2-50": true,
    "50-61.8": true,
    "38.2-61.8": true,
    "extension-127": true,
    "extension-161.8": true,
    "*": true
  };
  if (!(m.fib_zone in fibZoneSet)) throw new Error('fib_zone invalid');

  return m;
}