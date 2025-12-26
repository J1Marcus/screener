import { Candle, TickerMeta } from '../contract';

export interface ImportResult {
  timeseries: Record<string, Candle[]>;
  metadata: Record<string, TickerMeta>;
  as_of_date: string;
}

interface ParsedRow {
  ticker: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  company?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  nextEarningsDate?: string;
}

// Column aliases for flexible CSV parsing
const COLUMN_ALIASES = {
  ticker: ['Ticker', 'Symbol', 'ticker', 'symbol'],
  date: ['Date', 'date', 'Timestamp', 'timestamp', 'time', 'Time'],
  open: ['Open', 'open', 'o'],
  high: ['High', 'high', 'h'],
  low: ['Low', 'low', 'l'],
  close: ['Close', 'close', 'c', 'Adj Close', 'adj_close'],
  volume: ['Volume', 'volume', 'v'],
  company: ['Company', 'Name', 'company', 'name'],
  sector: ['Sector', 'sector'],
  industry: ['Industry', 'industry'],
  marketCap: ['Market Cap', 'MarketCap', 'market_cap'],
  nextEarningsDate: ['NextEarningsDate', 'Earnings Date', 'earnings_date', 'next_earnings_date']
};

/**
 * RFC-4180 compatible CSV parser
 */
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote inside quoted field
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        // Field separator
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r' && nextChar === '\n') {
        // CRLF line ending
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i += 2;
        continue;
      } else if (char === '\n' || char === '\r') {
        // LF line ending
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Handle last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows.filter(row => row.some(cell => cell.length > 0));
}

/**
 * Find column index by checking aliases
 */
function findColumnIndex(headers: string[], aliases: string[]): number {
  const trimmedHeaders = headers.map(h => h.trim());
  
  for (const alias of aliases) {
    const index = trimmedHeaders.findIndex(h => 
      h.toLowerCase() === alias.toLowerCase()
    );
    if (index !== -1) return index;
  }
  
  return -1;
}

/**
 * Parse date string to ISO YYYY-MM-DD format
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  const cleaned = dateStr.trim();
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  
  // Try parsing as Date and convert to ISO
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

/**
 * Parse numeric value with error handling
 */
function parseNumber(value: string): number | null {
  if (!value || value.trim() === '') return null;
  
  const cleaned = value.trim().replace(/[,$]/g, ''); // Remove commas and dollar signs
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? null : num;
}

/**
 * Import CSV data and convert to engine format
 */
export function importTradingViewCSV(csvText: string): ImportResult {
  const rows = parseCSV(csvText);
  
  if (rows.length < 2) {
    throw new Error('CSV must contain at least a header row and one data row');
  }
  
  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  // Find column indices
  const columnIndices = {
    ticker: findColumnIndex(headers, COLUMN_ALIASES.ticker),
    date: findColumnIndex(headers, COLUMN_ALIASES.date),
    open: findColumnIndex(headers, COLUMN_ALIASES.open),
    high: findColumnIndex(headers, COLUMN_ALIASES.high),
    low: findColumnIndex(headers, COLUMN_ALIASES.low),
    close: findColumnIndex(headers, COLUMN_ALIASES.close),
    volume: findColumnIndex(headers, COLUMN_ALIASES.volume),
    company: findColumnIndex(headers, COLUMN_ALIASES.company),
    sector: findColumnIndex(headers, COLUMN_ALIASES.sector),
    industry: findColumnIndex(headers, COLUMN_ALIASES.industry),
    marketCap: findColumnIndex(headers, COLUMN_ALIASES.marketCap),
    nextEarningsDate: findColumnIndex(headers, COLUMN_ALIASES.nextEarningsDate)
  };
  
  // Validate required columns
  const requiredColumns = ['ticker', 'date', 'open', 'high', 'low', 'close', 'volume'];
  const missingColumns = requiredColumns.filter(col => columnIndices[col as keyof typeof columnIndices] === -1);
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }
  
  // Parse rows
  const parsedRows: ParsedRow[] = [];
  
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    
    try {
      const ticker = row[columnIndices.ticker]?.trim();
      const dateStr = row[columnIndices.date]?.trim();
      const open = parseNumber(row[columnIndices.open]);
      const high = parseNumber(row[columnIndices.high]);
      const low = parseNumber(row[columnIndices.low]);
      const close = parseNumber(row[columnIndices.close]);
      const volume = parseNumber(row[columnIndices.volume]);
      
      // Skip rows with missing required data
      if (!ticker || !dateStr || open === null || high === null || 
          low === null || close === null || volume === null) {
        continue;
      }
      
      const date = parseDate(dateStr);
      if (!date) {
        continue;
      }
      
      const parsedRow: ParsedRow = {
        ticker,
        date,
        open,
        high,
        low,
        close,
        volume
      };
      
      // Add optional metadata columns if present
      if (columnIndices.company !== -1) {
        const company = row[columnIndices.company]?.trim();
        if (company) parsedRow.company = company;
      }
      
      if (columnIndices.sector !== -1) {
        const sector = row[columnIndices.sector]?.trim();
        if (sector) parsedRow.sector = sector;
      }
      
      if (columnIndices.industry !== -1) {
        const industry = row[columnIndices.industry]?.trim();
        if (industry) parsedRow.industry = industry;
      }
      
      if (columnIndices.marketCap !== -1) {
        const marketCap = parseNumber(row[columnIndices.marketCap]);
        if (marketCap !== null) parsedRow.marketCap = marketCap;
      }
      
      if (columnIndices.nextEarningsDate !== -1) {
        const earningsDate = parseDate(row[columnIndices.nextEarningsDate]);
        if (earningsDate) parsedRow.nextEarningsDate = earningsDate;
      }
      
      parsedRows.push(parsedRow);
    } catch (error) {
      // Skip malformed rows
      continue;
    }
  }
  
  if (parsedRows.length === 0) {
    throw new Error('No valid data rows found in CSV');
  }
  
  // Group by ticker and sort by date
  const tickerGroups: Record<string, ParsedRow[]> = {};
  
  for (const row of parsedRows) {
    if (!tickerGroups[row.ticker]) {
      tickerGroups[row.ticker] = [];
    }
    tickerGroups[row.ticker].push(row);
  }
  
  // Sort each ticker's data by date
  for (const ticker in tickerGroups) {
    tickerGroups[ticker].sort((a, b) => a.date.localeCompare(b.date));
  }
  
  // Build timeseries and metadata
  const timeseries: Record<string, Candle[]> = {};
  const metadata: Record<string, TickerMeta> = {};
  let maxDate = '';
  
  for (const [ticker, rows] of Object.entries(tickerGroups)) {
    // Build candles
    const candles: Candle[] = rows.map(row => ({
      t: row.date,
      o: row.open,
      h: row.high,
      l: row.low,
      c: row.close,
      v: row.volume
    }));
    
    timeseries[ticker] = candles;
    
    // Build metadata from first row with each field present
    const tickerMeta: TickerMeta = {
      ticker,
      lastCompletedBar: rows[rows.length - 1].date
    };
    
    // Find first row with each metadata field
    for (const row of rows) {
      if (!tickerMeta.company && row.company) {
        tickerMeta.company = row.company;
      }
      if (!tickerMeta.sector && row.sector) {
        tickerMeta.sector = row.sector;
      }
      if (!tickerMeta.industry && row.industry) {
        tickerMeta.industry = row.industry;
      }
      if (!tickerMeta.marketCap && row.marketCap) {
        tickerMeta.marketCap = row.marketCap;
      }
      if (!tickerMeta.nextEarningsDate && row.nextEarningsDate) {
        tickerMeta.nextEarningsDate = row.nextEarningsDate;
      }
    }
    
    metadata[ticker] = tickerMeta;
    
    // Track max date across all tickers
    const lastDate = rows[rows.length - 1].date;
    if (lastDate > maxDate) {
      maxDate = lastDate;
    }
  }
  
  return {
    timeseries,
    metadata,
    as_of_date: maxDate
  };
}