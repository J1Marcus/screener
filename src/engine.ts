import {
  EngineInput,
  EngineOutput,
  ClassifiedPick,
  ScreenerParams,
  TickerMeta,
  Candle,
  Indicators,
  FIXED_FILTERS,
  Trend,
  MACross,
  FibReference,
  FibZone,
  SetupReason,
  validateParams,
  assertFixedFilters,
  // Leo methodology types
  CandlestickPattern,
  VolumeShift,
  BBPosition,
  StochPosition,
  FVGZone,
  SwingPoint,
  PriceTarget,
  VolumeAnalysis
} from "./contract";

import { filterByIndex, isTickerInIndices } from "./data/indexLists";

interface StockAnalysis {
  ticker: string;
  meta: TickerMeta;
  candles: Candle[];
  indicators: Indicators;
  setupReason: SetupReason;
  score: number;
}

export function runEngine(input: EngineInput): EngineOutput {
  // Enforce fixed filters to prevent spec regression
  assertFixedFilters();
  
  const params = validateParams(input.params);
  const timeseries = input.timeseries || {};
  const metadata = input.metadata || {};

  // Filter and analyze stocks
  const analyses: StockAnalysis[] = [];
  
  for (const [ticker, candles] of Object.entries(timeseries)) {
    const meta = metadata[ticker];
    if (!meta || !candles || candles.length < FIXED_FILTERS.minBars) {
      continue;
    }

    // Apply fixed filters
    if (!passesFixedFilters(candles, meta)) {
      continue;
    }

    // Apply user filters
    if (!passesUserFilters(meta, params)) {
      continue;
    }

    // Apply Leo filters if enabled
    if (params.leo_mode_enabled) {
      // Price filter
      if (candles[candles.length - 1].c < params.min_price_leo) {
        continue;
      }
      // Index filter (multi-select)
      if (params.index_filters.length > 0 && !isTickerInIndices(ticker, params.index_filters)) {
        continue;
      }
    }

    // Calculate indicators (pass meta for earnings check)
    const indicators = calculateIndicators(candles, params, meta);

    // Apply indicator filters
    if (!passesIndicatorFilters(indicators, params)) {
      continue;
    }

    // Classify setup and calculate score
    const setupResult = classifySetup(candles, indicators, params);
    if (!setupResult) {
      continue;
    }

    analyses.push({
      ticker,
      meta,
      candles,
      indicators,
      setupReason: setupResult.reason,
      score: setupResult.score
    });
  }

  // Group by setup reason and rank within each group
  const setupGroups: Record<SetupReason, StockAnalysis[]> = {
    "Breakout": [],
    "Momentum": [],
    "Pullback": [],
    "Fib Pullback": [],
    "Consolidation": [],
    "Reversal": [],
    // Leo methodology groups
    "Reversal_Accumulation": [],
    "Reversal_Distribution": [],
    "BB_Lower_Bounce": [],
    "BB_Upper_Reject": [],
    "Stoch_Oversold_Reversal": [],
    "Stoch_Overbought_Reversal": []
  };

  for (const analysis of analyses) {
    setupGroups[analysis.setupReason].push(analysis);
  }

  // Sort each group by score (descending)
  for (const reason of Object.keys(setupGroups) as SetupReason[]) {
    setupGroups[reason].sort((a, b) => b.score - a.score);
  }

  // Merge groups by priority order and take top results
  // Leo methodology setups have higher priority when leo_mode is enabled
  const priorityOrder: SetupReason[] = params.leo_mode_enabled
    ? [
        "Reversal_Accumulation", "BB_Lower_Bounce", "Stoch_Oversold_Reversal",
        "Reversal_Distribution", "BB_Upper_Reject", "Stoch_Overbought_Reversal",
        "Breakout", "Momentum", "Pullback", "Fib Pullback", "Consolidation", "Reversal"
      ]
    : ["Breakout", "Momentum", "Pullback", "Fib Pullback", "Consolidation", "Reversal",
       "Reversal_Accumulation", "Reversal_Distribution", "BB_Lower_Bounce",
       "BB_Upper_Reject", "Stoch_Oversold_Reversal", "Stoch_Overbought_Reversal"];
  const finalPicks: StockAnalysis[] = [];
  
  let remaining = params.max_results;
  for (const reason of priorityOrder) {
    const group = setupGroups[reason];
    const take = Math.min(group.length, remaining);
    finalPicks.push(...group.slice(0, take));
    remaining -= take;
    if (remaining <= 0) break;
  }

  // Convert to output format
  const picks: ClassifiedPick[] = finalPicks.map(analysis => {
    const ind = analysis.indicators;
    const lastCandle = analysis.candles[analysis.candles.length - 1];

    // Determine BB position
    let bbPosition: BBPosition | null = null;
    if (ind.bbPercentB != null) {
      if (ind.bbPercentB < 0.1) bbPosition = "lower_bounce";
      else if (ind.bbPercentB > 0.9) bbPosition = "upper_reject";
      else bbPosition = "middle";
    }

    // Determine stoch position
    let stochPosition: StochPosition | null = null;
    if (ind.stochK != null) {
      if (ind.stochK < params.stoch_oversold_threshold) stochPosition = "oversold";
      else if (ind.stochK > params.stoch_overbought_threshold) stochPosition = "overbought";
      else stochPosition = "neutral";
    }

    return {
      Ticker: analysis.ticker,
      Company: analysis.meta.company || null,
      Price: lastCandle.c,
      MarketCap: analysis.meta.marketCap || null,
      Volume: lastCandle.v,
      RelativeVolume: ind.relVol || 0,
      RSI: ind.rsi14 || 0,
      Sector: analysis.meta.sector || null,
      Trend: ind.trend || "sideways",
      NextEarningsDate: analysis.meta.nextEarningsDate || null,
      SelectionReason: analysis.setupReason,

      // Leo methodology fields
      CandlestickPattern: ind.candlestickPattern || null,
      VolumeShift: ind.volumeShift || null,
      VolumeShiftStrength: ind.volumeShiftStrength || null,
      BBPosition: bbPosition,
      BBPercentB: ind.bbPercentB || null,
      StochPosition: stochPosition,
      StochK: ind.stochK || null,
      EarningsWarning: ind.earningsWithin30Days || null,
      PriceTargets: calculatePriceTargetsFromIndicators(analysis.candles, ind) || null,
      EntryConfirmed: ind.entryConfirmed || null,
      ReversalTimeline: "3-5 candles"
    };
  });

  return {
    as_of_date: params.as_of_date,
    picks
  };
}

function passesFixedFilters(candles: Candle[], meta: TickerMeta): boolean {
  if (candles.length < FIXED_FILTERS.minBars) return false;
  
  const lastCandle = candles[candles.length - 1];
  if (lastCandle.c <= FIXED_FILTERS.minPrice) return false;

  // Calculate 20-day average volume
  const last20 = candles.slice(-20);
  const avgVol20 = last20.reduce((sum, c) => sum + c.v, 0) / last20.length;
  if (avgVol20 < FIXED_FILTERS.minAvgVol20) return false;

  // Relative volume check
  const relVol = lastCandle.v / avgVol20;
  if (relVol < FIXED_FILTERS.minRelativeVol) return false;

  return true;
}

function passesUserFilters(meta: TickerMeta, params: ScreenerParams): boolean {
  if (params.user_sector !== "*" && meta.sector !== params.user_sector) return false;
  if (params.user_industry !== "*" && meta.industry !== params.user_industry) return false;
  
  const marketCap = meta.marketCap || 0;
  if (marketCap < params.market_cap_min || marketCap > params.market_cap_max) return false;

  return true;
}

function calculateIndicators(candles: Candle[], params: ScreenerParams, meta?: TickerMeta): Indicators {
  const indicators: Indicators = {};
  const closes = candles.map(c => c.c);

  // Simple Moving Averages
  indicators.sma20 = sma(closes, 20);
  indicators.sma50 = sma(closes, 50);
  indicators.sma200 = sma(closes, 200);

  // RSI
  indicators.rsi14 = rsi(closes, 14);

  // Stochastic %K
  indicators.stochK = stochasticK(candles, 14, 3);

  // ATR
  indicators.atr = atr(candles, params.atr_lookback);

  // ADX
  indicators.adx14 = adx(candles, 14);

  // Volume indicators
  const volumes = candles.map(c => c.v);
  indicators.avgVol20 = sma(volumes, 20);
  if (indicators.avgVol20) {
    indicators.relVol = candles[candles.length - 1].v / indicators.avgVol20;
  }

  // High/Low indicators
  const highs = candles.map(c => c.h);
  const lows = candles.map(c => c.l);
  indicators.hh20 = Math.max(...highs.slice(-20));
  indicators.ll20 = Math.min(...lows.slice(-20));

  // Bollinger Band Width (original)
  const bb = bollingerBands(closes, 20, 2);
  if (bb && indicators.sma20) {
    indicators.bbWidth = (bb.upper - bb.lower) / indicators.sma20;
  }

  // Trend determination
  indicators.trend = determineTrend(candles, params.trend_lookback);

  // Support/Resistance proximity
  indicators.srDistancePct = calculateSRDistance(candles, params.sr_proximity_pct);

  // Fibonacci analysis
  const fibResult = analyzeFibonacci(candles, params.fib_reference, params.fib_zone);
  indicators.fibHit = fibResult.hit;
  indicators.reactionBullish = fibResult.bullishReaction;

  // =====================================================
  // LEO METHODOLOGY INDICATORS
  // =====================================================

  if (params.leo_mode_enabled) {
    // Extended Bollinger Bands with percentB
    const bbExt = bollingerBandsExtended(closes, 20, 2);
    if (bbExt) {
      indicators.bbUpper = bbExt.upper;
      indicators.bbLower = bbExt.lower;
      indicators.bbMiddle = bbExt.middle;
      indicators.bbPercentB = bbExt.percentB;
    }

    // Candlestick pattern detection
    indicators.candlestickPattern = detectCandlestickPattern(candles, indicators.atr);

    // Volume shift analysis
    const volumeAnalysis = analyzeVolumeShift(candles, 5);
    indicators.volumeShift = volumeAnalysis.shift;
    indicators.volumeShiftStrength = volumeAnalysis.strength;

    // Fair Value Gaps
    indicators.fvgZones = detectFVGs(candles, 20);

    // Swing points
    const swingPoints = detectSwingPoints(candles, 3);
    indicators.swingHighs = swingPoints.highs;
    indicators.swingLows = swingPoints.lows;

    // Entry confirmation
    indicators.entryConfirmed = checkEntryConfirmation(candles);

    // Earnings warning
    if (meta) {
      indicators.earningsWithin30Days = checkEarningsWarning(meta, params.earnings_warning_days);
    }
  }

  return indicators;
}

function passesIndicatorFilters(indicators: Indicators, params: ScreenerParams): boolean {
  if (indicators.rsi14 == null || indicators.rsi14 < params.rsi_min || indicators.rsi14 > params.rsi_max) return false;

  // Skip standard stochastic filter when Leo mode is enabled (Leo uses its own thresholds for classification)
  if (!params.leo_mode_enabled) {
    if (indicators.stochK == null || indicators.stochK < params.stoch_k_min || indicators.stochK > params.stoch_k_max) return false;
  }

  if (params.trend_type !== "*" && indicators.trend !== params.trend_type) return false;
  if (indicators.adx14 == null || indicators.adx14 < params.adx_min) return false;

  // MA Cross filter
  if (params.ma_cross !== "none") {
    const { sma20, sma50, sma200 } = indicators;
    if (sma20 == null || sma50 == null || sma200 == null) return false;
    
    switch (params.ma_cross) {
      case "20>50": if (sma20 <= sma50) return false; break;
      case "50>200": if (sma50 <= sma200) return false; break;
      case "20>200": if (sma20 <= sma200) return false; break;
    }
  }

  // S/R proximity filter
  if (indicators.srDistancePct != null && indicators.srDistancePct > params.sr_proximity_pct) return false;

  return true;
}

function classifySetup(candles: Candle[], indicators: Indicators, params: ScreenerParams): { reason: SetupReason; score: number } | null {
  // =====================================================
  // LEO METHODOLOGY CLASSIFICATION (checked first when enabled)
  // =====================================================
  if (params.leo_mode_enabled) {
    const leoResult = classifyLeoReversal(candles, indicators, params);
    if (leoResult) {
      return leoResult;
    }
  }

  // =====================================================
  // STANDARD CLASSIFICATION
  // =====================================================

  // Breakout detection
  if (isBreakout(candles, indicators)) {
    return { reason: "Breakout", score: calculateBreakoutScore(candles, indicators) };
  }

  // Momentum detection
  if (isMomentum(candles, indicators)) {
    return { reason: "Momentum", score: calculateMomentumScore(candles, indicators) };
  }

  // Fibonacci pullback detection
  if (indicators.fibHit && indicators.reactionBullish) {
    return { reason: "Fib Pullback", score: calculateFibPullbackScore(candles, indicators) };
  }

  // Regular pullback detection
  if (isPullback(candles, indicators)) {
    return { reason: "Pullback", score: calculatePullbackScore(candles, indicators) };
  }

  // Consolidation detection
  if (isConsolidation(candles, indicators)) {
    return { reason: "Consolidation", score: calculateConsolidationScore(candles, indicators) };
  }

  // Reversal detection
  if (isReversal(candles, indicators)) {
    return { reason: "Reversal", score: calculateReversalScore(candles, indicators) };
  }

  return null;
}

// Technical indicator calculations
function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((sum, val) => sum + val, 0) / period;
}

function rsi(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function stochasticK(candles: Candle[], kPeriod: number, dPeriod: number): number | null {
  if (candles.length < kPeriod) return null;
  
  const slice = candles.slice(-kPeriod);
  const high = Math.max(...slice.map(c => c.h));
  const low = Math.min(...slice.map(c => c.l));
  const close = candles[candles.length - 1].c;
  
  if (high === low) return 50;
  return ((close - low) / (high - low)) * 100;
}

function atr(candles: Candle[], period: number): number | null {
  if (candles.length < period + 1) return null;
  
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    const tr = Math.max(
      current.h - current.l,
      Math.abs(current.h - previous.c),
      Math.abs(current.l - previous.c)
    );
    trs.push(tr);
  }
  
  return sma(trs, period);
}

function adx(candles: Candle[], period: number): number | null {
  if (candles.length < period * 2) return null;
  
  const dms: { plus: number; minus: number }[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    
    const upMove = current.h - previous.h;
    const downMove = previous.l - current.l;
    
    const plusDM = (upMove > downMove && upMove > 0) ? upMove : 0;
    const minusDM = (downMove > upMove && downMove > 0) ? downMove : 0;
    
    dms.push({ plus: plusDM, minus: minusDM });
  }
  
  const plusDI = sma(dms.map(dm => dm.plus), period) || 0;
  const minusDI = sma(dms.map(dm => dm.minus), period) || 0;
  
  if (plusDI + minusDI === 0) return 0;
  return Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
}

function bollingerBands(closes: number[], period: number, stdDev: number): { upper: number; lower: number; middle: number } | null {
  if (closes.length < period) return null;
  
  const middle = sma(closes, period);
  if (middle == null) return null;
  
  const slice = closes.slice(-period);
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
  const std = Math.sqrt(variance);
  
  return {
    upper: middle + (std * stdDev),
    lower: middle - (std * stdDev),
    middle
  };
}

function determineTrend(candles: Candle[], lookback: number): Trend {
  if (candles.length < lookback) return "sideways";
  
  const slice = candles.slice(-lookback);
  const firstClose = slice[0].c;
  const lastClose = slice[slice.length - 1].c;
  
  const change = (lastClose - firstClose) / firstClose;
  
  if (change > 0.05) return "up";
  if (change < -0.05) return "down";
  return "sideways";
}

function calculateSRDistance(candles: Candle[], proximityPct: number): number | null {
  if (candles.length < 20) return null;
  
  const currentPrice = candles[candles.length - 1].c;
  const highs = candles.slice(-20).map(c => c.h);
  const lows = candles.slice(-20).map(c => c.l);
  
  const resistance = Math.max(...highs);
  const support = Math.min(...lows);
  
  const distanceToResistance = Math.abs(currentPrice - resistance) / currentPrice * 100;
  const distanceToSupport = Math.abs(currentPrice - support) / currentPrice * 100;
  
  return Math.min(distanceToResistance, distanceToSupport);
}

function analyzeFibonacci(candles: Candle[], reference: FibReference, zone: FibZone): { hit: boolean; bullishReaction: boolean } {
  if (candles.length < 50) return { hit: false, bullishReaction: false };
  
  const slice = candles.slice(-50);
  let swingHigh = Math.max(...slice.map(c => c.h));
  let swingLow = Math.min(...slice.map(c => c.l));
  
  if (reference === "swing_high_to_low") {
    [swingHigh, swingLow] = [swingLow, swingHigh];
  }
  
  const range = swingHigh - swingLow;
  const currentPrice = candles[candles.length - 1].c;
  
  // Calculate Fibonacci levels
  const fib382 = swingLow + (range * 0.382);
  const fib50 = swingLow + (range * 0.5);
  const fib618 = swingLow + (range * 0.618);
  const fib127 = swingHigh + (range * 0.27);
  const fib1618 = swingHigh + (range * 0.618);
  
  let hit = false;
  const tolerance = range * 0.01; // 1% tolerance
  
  switch (zone) {
    case "38.2-50":
      hit = currentPrice >= fib382 - tolerance && currentPrice <= fib50 + tolerance;
      break;
    case "50-61.8":
      hit = currentPrice >= fib50 - tolerance && currentPrice <= fib618 + tolerance;
      break;
    case "38.2-61.8":
      hit = currentPrice >= fib382 - tolerance && currentPrice <= fib618 + tolerance;
      break;
    case "extension-127":
      hit = Math.abs(currentPrice - fib127) <= tolerance;
      break;
    case "extension-161.8":
      hit = Math.abs(currentPrice - fib1618) <= tolerance;
      break;
    case "*":
      hit = true; // Accept any Fibonacci level
      break;
  }
  
  // Check for bullish reaction (simplified)
  const bullishReaction = hit && candles.length >= 2 && 
    candles[candles.length - 1].c > candles[candles.length - 2].c;
  
  return { hit, bullishReaction };
}

// Setup classification functions
function isBreakout(candles: Candle[], indicators: Indicators): boolean {
  if (!indicators.hh20 || !indicators.ll20) return false;
  
  const currentPrice = candles[candles.length - 1].c;
  const volume = candles[candles.length - 1].v;
  const avgVol = indicators.avgVol20 || 0;
  
  // Price breakout above 20-day high with volume confirmation
  return currentPrice > indicators.hh20 && volume > avgVol * 1.5;
}

function isMomentum(candles: Candle[], indicators: Indicators): boolean {
  const rsi = indicators.rsi14;
  const adx = indicators.adx14;
  const trend = indicators.trend;
  
  return rsi != null && rsi > 60 && adx != null && adx > 25 && trend === "up";
}

function isPullback(candles: Candle[], indicators: Indicators): boolean {
  const trend = indicators.trend;
  const rsi = indicators.rsi14;
  const sma20 = indicators.sma20;
  
  if (!sma20 || rsi == null) return false;
  
  const currentPrice = candles[candles.length - 1].c;
  
  // Pullback in uptrend: price near SMA20, RSI oversold but not extreme
  return trend === "up" && currentPrice <= sma20 * 1.02 && rsi < 50 && rsi > 30;
}

function isConsolidation(candles: Candle[], indicators: Indicators): boolean {
  const bbWidth = indicators.bbWidth;
  const adx = indicators.adx14;
  
  // Low volatility (narrow Bollinger Bands) and weak trend (low ADX)
  return bbWidth != null && bbWidth < 0.1 && adx != null && adx < 20;
}

function isReversal(candles: Candle[], indicators: Indicators): boolean {
  const rsi = indicators.rsi14;
  const trend = indicators.trend;
  const srDistance = indicators.srDistancePct;
  
  // Oversold/overbought conditions near support/resistance
  return rsi != null && 
    ((rsi < 30 && trend === "down") || (rsi > 70 && trend === "up")) &&
    srDistance != null && srDistance < 2;
}

// Scoring functions
function calculateBreakoutScore(candles: Candle[], indicators: Indicators): number {
  const volume = candles[candles.length - 1].v;
  const avgVol = indicators.avgVol20 || 1;
  const relVol = volume / avgVol;
  
  return Math.min(relVol * 10, 100); // Cap at 100
}

function calculateMomentumScore(candles: Candle[], indicators: Indicators): number {
  const rsi = indicators.rsi14 || 50;
  const adx = indicators.adx14 || 0;
  
  return (rsi - 50) + adx;
}

function calculatePullbackScore(candles: Candle[], indicators: Indicators): number {
  const rsi = indicators.rsi14 || 50;
  const sma20 = indicators.sma20 || 0;
  const currentPrice = candles[candles.length - 1].c;
  
  const priceScore = Math.max(0, 100 - Math.abs(currentPrice - sma20) / sma20 * 100);
  const rsiScore = Math.max(0, 50 - rsi);
  
  return priceScore + rsiScore;
}

function calculateFibPullbackScore(candles: Candle[], indicators: Indicators): number {
  // Higher score for Fib pullbacks
  return calculatePullbackScore(candles, indicators) * 1.2;
}

function calculateConsolidationScore(candles: Candle[], indicators: Indicators): number {
  const bbWidth = indicators.bbWidth || 1;
  const adx = indicators.adx14 || 50;
  
  return Math.max(0, 100 - bbWidth * 1000) + Math.max(0, 50 - adx);
}

function calculateReversalScore(candles: Candle[], indicators: Indicators): number {
  const rsi = indicators.rsi14 || 50;
  const srDistance = indicators.srDistancePct || 10;

  const rsiExtreme = Math.max(0, Math.abs(rsi - 50) - 20);
  const proximityScore = Math.max(0, 10 - srDistance) * 10;

  return rsiExtreme + proximityScore;
}

// =====================================================
// LEO METHODOLOGY FUNCTIONS
// =====================================================

/**
 * Detect candlestick patterns based on candle body/wick ratios
 */
function detectCandlestickPattern(candles: Candle[], atrValue: number | null): CandlestickPattern {
  if (candles.length < 2 || !atrValue) return "none";

  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2];

  const body = Math.abs(current.c - current.o);
  const range = current.h - current.l;
  const upperShadow = current.h - Math.max(current.o, current.c);
  const lowerShadow = Math.min(current.o, current.c) - current.l;
  const isBullish = current.c > current.o;

  // Doji: body < 10% of ATR
  if (body < atrValue * 0.1 && range > 0) {
    // Gravestone Doji: long upper shadow, tiny lower shadow
    if (upperShadow >= body * 2 && lowerShadow < body * 0.5) {
      return "gravestone_doji";
    }
    return "doji";
  }

  // Hammer: long lower shadow (2x body), small upper shadow
  if (lowerShadow >= body * 2 && upperShadow < body * 0.5 && isBullish) {
    return "hammer";
  }

  // Long Lower Shadow: lower shadow > 60% of range
  if (range > 0 && lowerShadow > range * 0.6) {
    return "long_lower_shadow";
  }

  // Shooting Star: long upper shadow, small lower shadow, bearish
  if (upperShadow >= body * 2 && lowerShadow < body * 0.5 && !isBullish) {
    return "shooting_star";
  }

  // Bullish Engulfing: current body fully engulfs previous body
  const prevBody = Math.abs(previous.c - previous.o);
  const prevIsBullish = previous.c > previous.o;
  if (isBullish && !prevIsBullish && body > prevBody &&
      current.o <= previous.c && current.c >= previous.o) {
    return "engulfing_bullish";
  }

  // Bearish Engulfing
  if (!isBullish && prevIsBullish && body > prevBody &&
      current.o >= previous.c && current.c <= previous.o) {
    return "engulfing_bearish";
  }

  return "none";
}

/**
 * Analyze volume shift (buyer vs seller dominance)
 */
function analyzeVolumeShift(candles: Candle[], lookback: number = 5): VolumeAnalysis {
  if (candles.length < lookback) {
    return { shift: "neutral", strength: 0, buyerVolume: 0, sellerVolume: 0 };
  }

  const recent = candles.slice(-lookback);
  let buyerVolume = 0;
  let sellerVolume = 0;

  for (const candle of recent) {
    if (candle.c > candle.o) {
      // Bullish candle - buyers
      buyerVolume += candle.v;
    } else if (candle.c < candle.o) {
      // Bearish candle - sellers
      sellerVolume += candle.v;
    } else {
      // Doji - split evenly
      buyerVolume += candle.v / 2;
      sellerVolume += candle.v / 2;
    }
  }

  const total = buyerVolume + sellerVolume;
  if (total === 0) {
    return { shift: "neutral", strength: 0, buyerVolume: 0, sellerVolume: 0 };
  }

  const buyerRatio = buyerVolume / total;

  let shift: VolumeShift;
  let strength: number;

  if (buyerRatio > 0.6) {
    shift = "buyer";
    strength = Math.min((buyerRatio - 0.5) * 200, 100);
  } else if (buyerRatio < 0.4) {
    shift = "seller";
    strength = Math.min((0.5 - buyerRatio) * 200, 100);
  } else {
    shift = "neutral";
    strength = 0;
  }

  return { shift, strength, buyerVolume, sellerVolume };
}

/**
 * Detect Fair Value Gaps (FVG)
 */
function detectFVGs(candles: Candle[], lookback: number = 20): FVGZone[] {
  if (candles.length < lookback + 2) return [];

  const fvgs: FVGZone[] = [];
  const recentCandles = candles.slice(-(lookback + 2));
  const currentPrice = candles[candles.length - 1].c;

  for (let i = 2; i < recentCandles.length; i++) {
    const prev = recentCandles[i - 2];
    const current = recentCandles[i];

    // Bullish FVG: gap between candle[i-2] high and candle[i] low
    if (current.l > prev.h) {
      const isFilled = currentPrice <= current.l && currentPrice >= prev.h;
      fvgs.push({
        type: "bullish",
        topPrice: current.l,
        bottomPrice: prev.h,
        midpoint: (current.l + prev.h) / 2,
        startDate: prev.t,
        endDate: current.t,
        isFilled
      });
    }

    // Bearish FVG: gap between candle[i-2] low and candle[i] high
    if (current.h < prev.l) {
      const isFilled = currentPrice >= current.h && currentPrice <= prev.l;
      fvgs.push({
        type: "bearish",
        topPrice: prev.l,
        bottomPrice: current.h,
        midpoint: (prev.l + current.h) / 2,
        startDate: prev.t,
        endDate: current.t,
        isFilled
      });
    }
  }

  return fvgs;
}

/**
 * Detect swing highs and lows
 */
function detectSwingPoints(candles: Candle[], strength: number = 3): { highs: SwingPoint[]; lows: SwingPoint[] } {
  const highs: SwingPoint[] = [];
  const lows: SwingPoint[] = [];

  if (candles.length < strength * 2 + 1) return { highs, lows };

  for (let i = strength; i < candles.length - strength; i++) {
    const candle = candles[i];
    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= strength; j++) {
      if (candles[i - j].h >= candle.h || candles[i + j].h >= candle.h) {
        isHigh = false;
      }
      if (candles[i - j].l <= candle.l || candles[i + j].l <= candle.l) {
        isLow = false;
      }
    }

    if (isHigh) {
      highs.push({ date: candle.t, price: candle.h, type: "high", strength });
    }
    if (isLow) {
      lows.push({ date: candle.t, price: candle.l, type: "low", strength });
    }
  }

  return { highs, lows };
}

/**
 * Calculate extended Bollinger Bands with percentB
 */
function bollingerBandsExtended(closes: number[], period: number = 20, stdDevMult: number = 2): {
  upper: number;
  middle: number;
  lower: number;
  percentB: number;
} | null {
  if (closes.length < period) return null;

  const middle = sma(closes, period);
  if (middle == null) return null;

  const slice = closes.slice(-period);
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
  const std = Math.sqrt(variance);

  const upper = middle + (std * stdDevMult);
  const lower = middle - (std * stdDevMult);
  const currentPrice = closes[closes.length - 1];

  // PercentB: 0 = at lower band, 1 = at upper band
  const percentB = upper !== lower ? (currentPrice - lower) / (upper - lower) : 0.5;

  return { upper, middle, lower, percentB };
}

/**
 * Check if entry is confirmed (break and close above previous high)
 */
function checkEntryConfirmation(candles: Candle[]): boolean {
  if (candles.length < 2) return false;

  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2];

  // For bullish: close above previous high
  return current.c > previous.h;
}

/**
 * Check if earnings are within specified days
 */
function checkEarningsWarning(meta: TickerMeta, warningDays: number): boolean {
  if (!meta.nextEarningsDate) return false;

  const now = new Date();
  const earningsDate = new Date(meta.nextEarningsDate);
  const diffMs = earningsDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= warningDays;
}

/**
 * Calculate price targets based on indicators
 */
function calculatePriceTargetsFromIndicators(candles: Candle[], indicators: Indicators): PriceTarget[] {
  if (candles.length < 20) return [];

  const currentPrice = candles[candles.length - 1].c;
  const targets: PriceTarget[] = [];

  // FVG targets (50% retracement)
  if (indicators.fvgZones) {
    for (const fvg of indicators.fvgZones) {
      if (!fvg.isFilled) {
        if (fvg.type === "bullish" && fvg.midpoint > currentPrice) {
          targets.push({
            type: "fvg",
            price: fvg.midpoint,
            description: "FVG 50% retracement",
            confidence: 80
          });
        } else if (fvg.type === "bearish" && fvg.midpoint < currentPrice) {
          targets.push({
            type: "fvg",
            price: fvg.midpoint,
            description: "FVG 50% retracement",
            confidence: 80
          });
        }
      }
    }
  }

  // Swing high targets (for bullish)
  if (indicators.swingHighs) {
    for (const high of indicators.swingHighs.slice(-3)) {
      if (high.price > currentPrice) {
        targets.push({
          type: "swing",
          price: high.price,
          description: `Previous swing high (${high.date})`,
          confidence: 70
        });
      }
    }
  }

  // Percentage targets (max 10% per Leo's methodology)
  targets.push({
    type: "percentage",
    price: currentPrice * 1.10,
    description: "Maximum realistic target (~10%)",
    confidence: 50
  });

  // Sort by price (ascending for bullish targets)
  return targets.sort((a, b) => a.price - b.price).slice(0, 5);
}

/**
 * Classify Leo reversal setups
 */
function classifyLeoReversal(
  candles: Candle[],
  indicators: Indicators,
  params: ScreenerParams
): { reason: SetupReason; score: number } | null {
  if (!params.leo_mode_enabled) return null;

  const bb = indicators.bbPercentB;
  const stochK = indicators.stochK;
  const pattern = indicators.candlestickPattern;
  const volumeShift = indicators.volumeShift;
  const volumeStrength = indicators.volumeShiftStrength || 0;

  // Check if pattern matches requested patterns
  const patternMatches = params.candlestick_patterns.length === 0 ||
    (pattern && params.candlestick_patterns.includes(pattern));

  // Bullish reversal conditions
  if (bb != null && bb < 0.2 && stochK != null && stochK < params.stoch_oversold_threshold) {
    // Check for bullish patterns
    const bullishPatterns: CandlestickPattern[] = ["doji", "hammer", "long_lower_shadow", "engulfing_bullish"];
    const hasBullishPattern = pattern && bullishPatterns.includes(pattern);

    if (hasBullishPattern && patternMatches) {
      if (volumeShift === "buyer" && (!params.require_volume_shift || volumeStrength > 30)) {
        return {
          reason: "Reversal_Accumulation",
          score: calculateLeoReversalScore(indicators, "bullish", volumeStrength)
        };
      }
      if (params.bb_bounce_enabled) {
        return {
          reason: "BB_Lower_Bounce",
          score: 75 + (100 - (bb * 100))
        };
      }
    }

    if (stochK < 20) {
      return {
        reason: "Stoch_Oversold_Reversal",
        score: 65 + (20 - stochK)
      };
    }
  }

  // Bearish reversal conditions
  if (bb != null && bb > 0.8 && stochK != null && stochK > params.stoch_overbought_threshold) {
    const bearishPatterns: CandlestickPattern[] = ["gravestone_doji", "shooting_star", "engulfing_bearish"];
    const hasBearishPattern = pattern && bearishPatterns.includes(pattern);

    if (hasBearishPattern && patternMatches) {
      if (volumeShift === "seller" && (!params.require_volume_shift || volumeStrength > 30)) {
        return {
          reason: "Reversal_Distribution",
          score: calculateLeoReversalScore(indicators, "bearish", volumeStrength)
        };
      }
      if (params.bb_bounce_enabled) {
        return {
          reason: "BB_Upper_Reject",
          score: 75 + ((bb - 0.8) * 500)
        };
      }
    }

    if (stochK > 80) {
      return {
        reason: "Stoch_Overbought_Reversal",
        score: 65 + (stochK - 80)
      };
    }
  }

  return null;
}

/**
 * Calculate Leo reversal score
 */
function calculateLeoReversalScore(
  indicators: Indicators,
  direction: "bullish" | "bearish",
  volumeStrength: number
): number {
  let score = 70; // Base score

  // BB position bonus
  if (indicators.bbPercentB != null) {
    if (direction === "bullish") {
      score += (0.2 - indicators.bbPercentB) * 50; // Lower = better for bullish
    } else {
      score += (indicators.bbPercentB - 0.8) * 50; // Higher = better for bearish
    }
  }

  // Stochastic bonus
  if (indicators.stochK != null) {
    if (direction === "bullish") {
      score += (30 - indicators.stochK) / 2; // Lower = better for bullish
    } else {
      score += (indicators.stochK - 70) / 2; // Higher = better for bearish
    }
  }

  // Volume shift bonus
  score += volumeStrength * 0.2;

  // Entry confirmation bonus
  if (indicators.entryConfirmed) {
    score += 10;
  }

  return Math.min(score, 100);
}

export function __selfTestFixedFilters(): { pass: boolean; detail: string } {
  try { assertFixedFilters(); } catch (e:any) { return { pass:false, detail: e.message || "assert failed" }; }

  const mk = (c:number, avgV:number, v:number) => ({
    lastClose: c,
    avgVol20: avgV,
    relVol: avgV>0 ? v/avgV : 0
  });

  const bad1 = mk(30.00, 1_500_000, 2_000_000);   // price == 30 -> must FAIL
  const bad2 = mk(35.00, 1_000_000, 1_100_000);   // avgVol20 == 1_000_000 -> must FAIL
  const bad3 = mk(35.00, 1_500_000, 1_500_000);   // relVol == 1.0 -> must FAIL
  const good = mk(30.01, 1_000_001, 1_000_002);   // strictly greater everywhere -> PASS

  const passBad1 = !(bad1.lastClose > FIXED_FILTERS.minPrice);
  const passBad2 = !(bad2.avgVol20  > FIXED_FILTERS.minAvgVol20);
  const passBad3 = !((bad3.relVol)  > FIXED_FILTERS.minRelativeVol);
  const passGood = (good.lastClose > FIXED_FILTERS.minPrice)
                && (good.avgVol20  > FIXED_FILTERS.minAvgVol20)
                && (good.relVol    > FIXED_FILTERS.minRelativeVol);

  const ok = passBad1 && passBad2 && passBad3 && passGood;
  return { pass: ok, detail: ok ? "ok" : "fixed filter logic mismatch" };
}