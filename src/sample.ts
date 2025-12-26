import type { Candle, TickerMeta } from "./contract";

export const SAMPLE_AS_OF_DATE = "2025-10-31";

function genDates(n: number, endISO: string): string[] {
  // Generate n past "trading-like" days by skipping weekends deterministically.
  const out: string[] = [];
  const end = new Date(endISO + "T00:00:00Z");
  let d = new Date(end);
  while (out.length < n) {
    const wd = d.getUTCDay(); // 0=Sun .. 6=Sat
    if (wd !== 0 && wd !== 6) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      out.push(`${y}-${m}-${day}`);
    }
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out.reverse();
}

function genSeriesUptrend(n: number): Candle[] {
  const ds = genDates(n, SAMPLE_AS_OF_DATE);
  const out: Candle[] = [];
  let px = 50; // start > 30
  let volBase = 1_200_000;
  for (let i = 0; i < n; i++) {
    // deterministic drift + small cyclical component
    const drift = 0.10 + 0.02 * Math.sin(i / 12);
    const pull = (i % 55 === 0 || i % 89 === 0) ? -0.8 : 0; // occasional pullbacks
    const close = Math.max(31, px * (1 + (drift + pull) / 100));
    const high = Math.max(close, px * 1.01);
    const low = Math.min(px * 0.99, close * 0.99);
    const open = (close + px) / 2;
    // volume: mostly steady; last bar pumped for relative volume > 1
    const vol = Math.floor(volBase * (1 + 0.05 * Math.cos(i / 7)) * (i === n - 1 ? 1.7 : 1.0));
    out.push({ t: ds[i], o: open, h: high, l: low, c: close, v: vol });
    px = close;
  }
  // ensure recent 20-bar breakout: n-1 close >= highest of last 20
  // Our construction already trends up; this is satisfied.
  return out;
}

function genSeriesMeanRevert(n: number): Candle[] {
  const ds = genDates(n, SAMPLE_AS_OF_DATE);
  const out: Candle[] = [];
  let px = 60;
  let volBase = 1_300_000;
  for (let i = 0; i < n; i++) {
    const mean = 60 + 3 * Math.sin(i / 9);
    const step = (mean - px) * 0.25; // pull toward mean
    const close = Math.max(31, px + step);
    const range = 0.9 + 0.2 * Math.cos(i / 5); // tight range overall
    const high = Math.max(close, close * (1 + range / 100));
    const low = Math.min(close, close * (1 - range / 100));
    const open = (close + px) / 2;
    const vol = Math.floor(volBase * (1 + 0.03 * Math.sin(i / 11)) * (i === n - 1 ? 1.3 : 1.0));
    out.push({ t: ds[i], o: open, h: high, l: low, c: close, v: vol });
    px = close;
  }
  return out;
}

export const SAMPLE_TIMESERIES: Record<string, Candle[]> = {
  MOCKA: genSeriesUptrend(260),
  MOCKB: genSeriesMeanRevert(260),
};

export const SAMPLE_METADATA: Record<string, TickerMeta> = {
  MOCKA: {
    ticker: "MOCKA",
    company: "Mock Alpha Corp",
    sector: "Information Technology",
    industry: "Software",
    marketCap: 25_000_000_000,
    nextEarningsDate: "2025-12-05",
    lastCompletedBar: SAMPLE_AS_OF_DATE,
  },
  MOCKB: {
    ticker: "MOCKB",
    company: "Mock Beta Inc",
    sector: "Industrials",
    industry: "Machinery",
    marketCap: 12_000_000_000,
    nextEarningsDate: "2025-12-12",
    lastCompletedBar: SAMPLE_AS_OF_DATE,
  },
};