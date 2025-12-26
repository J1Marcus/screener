/**
 * Index constituent ticker lists
 * Used for filtering stocks by major US indices
 */

import { IndexFilter, IndexName } from '../contract';

// Dow Jones Industrial Average (30 stocks)
export const DOW_JONES: string[] = [
  'AAPL', 'AMGN', 'AXP', 'BA', 'CAT', 'CRM', 'CSCO', 'CVX', 'DIS', 'DOW',
  'GS', 'HD', 'HON', 'IBM', 'INTC', 'JNJ', 'JPM', 'KO', 'MCD', 'MMM',
  'MRK', 'MSFT', 'NKE', 'PG', 'TRV', 'UNH', 'V', 'VZ', 'WBA', 'WMT'
];

// Nasdaq 100 (top 100 non-financial Nasdaq stocks)
export const NASDAQ_100: string[] = [
  'AAPL', 'ABNB', 'ADBE', 'ADI', 'ADP', 'ADSK', 'AEP', 'AMAT', 'AMD', 'AMGN',
  'AMZN', 'ANSS', 'ARM', 'ASML', 'AVGO', 'AZN', 'BIIB', 'BKNG', 'BKR', 'CCEP',
  'CDNS', 'CDW', 'CEG', 'CHTR', 'CMCSA', 'COST', 'CPRT', 'CRWD', 'CSCO', 'CSGP',
  'CSX', 'CTAS', 'CTSH', 'DASH', 'DDOG', 'DLTR', 'DXCM', 'EA', 'EXC', 'FANG',
  'FAST', 'FTNT', 'GEHC', 'GFS', 'GILD', 'GOOG', 'GOOGL', 'HON', 'IDXX', 'ILMN',
  'INTC', 'INTU', 'ISRG', 'KDP', 'KHC', 'KLAC', 'LIN', 'LRCX', 'LULU', 'MAR',
  'MCHP', 'MDB', 'MDLZ', 'MELI', 'META', 'MNST', 'MRNA', 'MRVL', 'MSFT', 'MU',
  'NFLX', 'NVDA', 'NXPI', 'ODFL', 'ON', 'ORLY', 'PANW', 'PAYX', 'PCAR', 'PDD',
  'PEP', 'PYPL', 'QCOM', 'REGN', 'ROP', 'ROST', 'SBUX', 'SMCI', 'SNPS', 'TEAM',
  'TMUS', 'TSLA', 'TTD', 'TTWO', 'TXN', 'VRSK', 'VRTX', 'WBD', 'WDAY', 'ZS'
];

// S&P 500 (sample of 200 most liquid, full list would be 500+)
// Sorted by market cap / liquidity for priority fetching
export const SP500: string[] = [
  // Mega caps (top 50 by market cap)
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'META', 'BRK.B', 'LLY', 'AVGO', 'JPM',
  'TSLA', 'UNH', 'V', 'XOM', 'MA', 'JNJ', 'HD', 'PG', 'COST', 'MRK',
  'ABBV', 'CVX', 'CRM', 'NFLX', 'AMD', 'KO', 'PEP', 'BAC', 'ADBE', 'WMT',
  'TMO', 'MCD', 'CSCO', 'ACN', 'LIN', 'ABT', 'ORCL', 'DHR', 'QCOM', 'INTU',
  'CMCSA', 'TXN', 'WFC', 'VZ', 'DIS', 'PM', 'INTC', 'IBM', 'AMGN', 'NKE',

  // Large caps (next 50)
  'CAT', 'RTX', 'GE', 'SPGI', 'HON', 'ISRG', 'NOW', 'GS', 'NEE', 'BKNG',
  'UNP', 'LOW', 'T', 'ELV', 'AMAT', 'PFE', 'AXP', 'MS', 'SYK', 'BLK',
  'VRTX', 'TJX', 'DE', 'SBUX', 'MDT', 'LRCX', 'PLD', 'MDLZ', 'GILD', 'ADP',
  'AMT', 'C', 'MMC', 'ADI', 'REGN', 'SCHW', 'CB', 'ETN', 'MO', 'CI',
  'ZTS', 'PANW', 'SO', 'DUK', 'CME', 'BDX', 'KLAC', 'SNPS', 'ICE', 'CDNS',

  // Mid-large caps (next 100)
  'PNC', 'CL', 'EOG', 'EQIX', 'MU', 'SHW', 'MCO', 'AON', 'ITW', 'NOC',
  'APD', 'FDX', 'USB', 'HUM', 'CMG', 'TGT', 'GD', 'ORLY', 'MAR', 'CTAS',
  'PGR', 'TDG', 'MSI', 'FCX', 'EMR', 'AJG', 'PSA', 'NSC', 'SLB', 'CARR',
  'WM', 'ROP', 'ECL', 'APH', 'COF', 'PCAR', 'AZO', 'MCHP', 'ADSK', 'ROST',
  'OXY', 'CCI', 'WELL', 'HLT', 'AFL', 'F', 'GM', 'CPRT', 'AEP', 'MNST',
  'JCI', 'MET', 'AIG', 'SRE', 'TFC', 'PSX', 'PAYX', 'MSCI', 'NXPI', 'KMB',
  'SPG', 'NEM', 'VLO', 'DHI', 'FTNT', 'DLR', 'TEL', 'HES', 'IDXX', 'O',
  'GWW', 'KMI', 'COR', 'D', 'A', 'BK', 'YUM', 'ODFL', 'CMI', 'ALL',
  'KHC', 'IQV', 'PRU', 'FAST', 'PCG', 'CTVA', 'GIS', 'LHX', 'OTIS', 'PEG',
  'HSY', 'VRSK', 'EA', 'EW', 'CTSH', 'ED', 'IT', 'XEL', 'VMC', 'HAL',

  // Additional S&P 500 components
  'GEHC', 'RCL', 'BIIB', 'CHTR', 'KR', 'FANG', 'MTD', 'WAB', 'CBRE', 'EXC',
  'ACGL', 'MLM', 'ON', 'EIX', 'DAL', 'PPG', 'HWM', 'KEYS', 'DOW', 'AWK',
  'WEC', 'EFX', 'ROK', 'ANSS', 'CDW', 'FTV', 'GRMN', 'STZ', 'SYY', 'MTB',
  'NUE', 'RMD', 'TROW', 'HPQ', 'WTW', 'ZBH', 'DTE', 'VICI', 'GLW', 'BRO',
  'AVB', 'CHD', 'PPL', 'AMP', 'ES', 'SBAC', 'LYB', 'FE', 'EQR', 'ULTA'
];

// Russell 2000 sample (top 100 most liquid small caps)
// Full Russell 2000 is too large; focus on most liquid
export const RUSSELL_2000_SAMPLE: string[] = [
  'AMC', 'GME', 'PLUG', 'SIRI', 'RIOT', 'MARA', 'SOFI', 'HOOD', 'LCID', 'RIVN',
  'PLTR', 'SNAP', 'RBLX', 'DKNG', 'COIN', 'AFRM', 'PATH', 'U', 'CRSP', 'BEAM',
  'ROKU', 'BILL', 'NET', 'SNOW', 'DOCU', 'ZM', 'OKTA', 'TWLO', 'SQ', 'SHOP',
  'BYND', 'SPCE', 'NKLA', 'LAZR', 'WKHS', 'GOEV', 'FSR', 'QS', 'BLNK', 'CHPT',
  'STEM', 'RUN', 'NOVA', 'ENPH', 'SEDG', 'FSLR', 'ARRY', 'JKS', 'MAXN', 'SPWR',
  'WOLF', 'CRNC', 'DQ', 'CSIQ', 'SOL', 'GEVO', 'BE', 'BLDP', 'PLUG', 'FCEL',
  'APPS', 'CRSR', 'HEAR', 'GPRO', 'SONO', 'OLED', 'MTCH', 'PINS', 'ETSY', 'W',
  'CHWY', 'PTON', 'OPEN', 'CVNA', 'CARG', 'VRM', 'SFT', 'RIDE', 'ARVL', 'REE',
  'XPEV', 'LI', 'NIO', 'PSNY', 'FFIE', 'MULN', 'GOEV', 'FSR', 'LCID', 'RIVN',
  'JOBY', 'ACHR', 'EVTL', 'LILM', 'EVGO', 'CHPT', 'BLNK', 'DCFC', 'AMPX', 'PTRA'
];

// Combined index map
export const INDEX_CONSTITUENTS: Record<IndexFilter, string[]> = {
  sp500: SP500,
  dowjones: DOW_JONES,
  nasdaq100: NASDAQ_100,
  russell2000: RUSSELL_2000_SAMPLE,
  '*': [] // Empty means no filtering
};

/**
 * Filter tickers by index (single)
 */
export function filterByIndex(tickers: string[], indexFilter: IndexFilter): string[] {
  if (indexFilter === '*') return tickers;

  const indexTickers = new Set(INDEX_CONSTITUENTS[indexFilter]);
  return tickers.filter(t => indexTickers.has(t.toUpperCase()));
}

/**
 * Filter tickers by multiple indices (multi-select)
 */
export function filterByIndices(tickers: string[], indexFilters: IndexName[]): string[] {
  if (indexFilters.length === 0) return tickers; // No filter = all tickers

  // Combine all tickers from selected indices
  const combinedTickers = new Set<string>();
  for (const idx of indexFilters) {
    for (const ticker of INDEX_CONSTITUENTS[idx]) {
      combinedTickers.add(ticker);
    }
  }

  return tickers.filter(t => combinedTickers.has(t.toUpperCase()));
}

/**
 * Check if a ticker is in any of the selected indices
 */
export function isTickerInIndices(ticker: string, indexFilters: IndexName[]): boolean {
  if (indexFilters.length === 0) return true; // No filter = all tickers pass

  const upperTicker = ticker.toUpperCase();
  for (const idx of indexFilters) {
    if (INDEX_CONSTITUENTS[idx].includes(upperTicker)) {
      return true;
    }
  }
  return false;
}

/**
 * Get all tickers for an index
 */
export function getIndexTickers(indexFilter: IndexFilter): string[] {
  if (indexFilter === '*') {
    // Return combined unique list of all indices
    const allTickers = new Set([
      ...DOW_JONES,
      ...NASDAQ_100,
      ...SP500,
      ...RUSSELL_2000_SAMPLE
    ]);
    return Array.from(allTickers);
  }
  return [...INDEX_CONSTITUENTS[indexFilter]];
}

/**
 * Get index display name
 */
export function getIndexDisplayName(indexFilter: IndexFilter): string {
  switch (indexFilter) {
    case 'sp500': return 'S&P 500';
    case 'dowjones': return 'Dow Jones 30';
    case 'nasdaq100': return 'Nasdaq 100';
    case 'russell2000': return 'Russell 2000';
    case '*': return 'All Indices';
    default: return 'Unknown';
  }
}

/**
 * Get ticker count for an index
 */
export function getIndexTickerCount(indexFilter: IndexFilter): number {
  if (indexFilter === '*') {
    return getIndexTickers('*').length;
  }
  return INDEX_CONSTITUENTS[indexFilter].length;
}
