import { Candle, TickerMeta } from '../contract';

// Sample stock data for testing the screener
export const sampleData = {
  timeseries: {
    'AAPL': generateSampleCandles('AAPL', 180.50, 'up'),
    'MSFT': generateSampleCandles('MSFT', 415.20, 'up'),
    'GOOGL': generateSampleCandles('GOOGL', 142.80, 'sideways'),
    'TSLA': generateSampleCandles('TSLA', 248.90, 'down'),
    'NVDA': generateSampleCandles('NVDA', 875.30, 'up'),
    'META': generateSampleCandles('META', 325.60, 'up'),
    'AMZN': generateSampleCandles('AMZN', 145.70, 'sideways'),
    'NFLX': generateSampleCandles('NFLX', 485.20, 'up'),
    'AMD': generateSampleCandles('AMD', 142.50, 'down'),
    'CRM': generateSampleCandles('CRM', 285.40, 'up'),
    'ADBE': generateSampleCandles('ADBE', 520.80, 'sideways'),
    'ORCL': generateSampleCandles('ORCL', 118.90, 'up'),
    'INTC': generateSampleCandles('INTC', 32.45, 'down'),
    'IBM': generateSampleCandles('IBM', 195.30, 'sideways'),
    'CSCO': generateSampleCandles('CSCO', 52.80, 'up'),
    'JPM': generateSampleCandles('JPM', 185.60, 'up'),
    'BAC': generateSampleCandles('BAC', 38.90, 'sideways'),
    'WFC': generateSampleCandles('WFC', 52.30, 'up'),
    'GS': generateSampleCandles('GS', 425.70, 'down'),
    'MS': generateSampleCandles('MS', 98.40, 'sideways'),
    'JNJ': generateSampleCandles('JNJ', 162.80, 'sideways'),
    'PFE': generateSampleCandles('PFE', 35.90, 'down'),
    'UNH': generateSampleCandles('UNH', 520.40, 'up'),
    'ABBV': generateSampleCandles('ABBV', 175.20, 'up'),
    'MRK': generateSampleCandles('MRK', 108.50, 'sideways'),
    'XOM': generateSampleCandles('XOM', 118.70, 'up'),
    'CVX': generateSampleCandles('CVX', 158.90, 'up'),
    'KO': generateSampleCandles('KO', 62.40, 'sideways'),
    'PEP': generateSampleCandles('PEP', 168.30, 'up'),
    'WMT': generateSampleCandles('WMT', 165.80, 'up')
  },
  metadata: {
    'AAPL': {
      ticker: 'AAPL',
      company: 'Apple Inc.',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      marketCap: 2800000000000,
      nextEarningsDate: '2024-01-25',
      lastCompletedBar: '2024-01-15'
    },
    'MSFT': {
      ticker: 'MSFT',
      company: 'Microsoft Corporation',
      sector: 'Technology',
      industry: 'Software',
      marketCap: 3100000000000,
      nextEarningsDate: '2024-01-24',
      lastCompletedBar: '2024-01-15'
    },
    'GOOGL': {
      ticker: 'GOOGL',
      company: 'Alphabet Inc.',
      sector: 'Technology',
      industry: 'Internet Services',
      marketCap: 1800000000000,
      nextEarningsDate: '2024-02-06',
      lastCompletedBar: '2024-01-15'
    },
    'TSLA': {
      ticker: 'TSLA',
      company: 'Tesla, Inc.',
      sector: 'Consumer Discretionary',
      industry: 'Electric Vehicles',
      marketCap: 790000000000,
      nextEarningsDate: '2024-01-24',
      lastCompletedBar: '2024-01-15'
    },
    'NVDA': {
      ticker: 'NVDA',
      company: 'NVIDIA Corporation',
      sector: 'Technology',
      industry: 'Semiconductors',
      marketCap: 2200000000000,
      nextEarningsDate: '2024-02-21',
      lastCompletedBar: '2024-01-15'
    },
    'META': {
      ticker: 'META',
      company: 'Meta Platforms, Inc.',
      sector: 'Technology',
      industry: 'Social Media',
      marketCap: 820000000000,
      nextEarningsDate: '2024-02-01',
      lastCompletedBar: '2024-01-15'
    },
    'AMZN': {
      ticker: 'AMZN',
      company: 'Amazon.com, Inc.',
      sector: 'Consumer Discretionary',
      industry: 'E-commerce',
      marketCap: 1500000000000,
      nextEarningsDate: '2024-02-01',
      lastCompletedBar: '2024-01-15'
    },
    'NFLX': {
      ticker: 'NFLX',
      company: 'Netflix, Inc.',
      sector: 'Communication Services',
      industry: 'Streaming',
      marketCap: 210000000000,
      nextEarningsDate: '2024-01-23',
      lastCompletedBar: '2024-01-15'
    },
    'AMD': {
      ticker: 'AMD',
      company: 'Advanced Micro Devices, Inc.',
      sector: 'Technology',
      industry: 'Semiconductors',
      marketCap: 230000000000,
      nextEarningsDate: '2024-01-30',
      lastCompletedBar: '2024-01-15'
    },
    'CRM': {
      ticker: 'CRM',
      company: 'Salesforce, Inc.',
      sector: 'Technology',
      industry: 'Software',
      marketCap: 280000000000,
      nextEarningsDate: '2024-02-29',
      lastCompletedBar: '2024-01-15'
    },
    'ADBE': {
      ticker: 'ADBE',
      company: 'Adobe Inc.',
      sector: 'Technology',
      industry: 'Software',
      marketCap: 240000000000,
      nextEarningsDate: '2024-03-14',
      lastCompletedBar: '2024-01-15'
    },
    'ORCL': {
      ticker: 'ORCL',
      company: 'Oracle Corporation',
      sector: 'Technology',
      industry: 'Software',
      marketCap: 330000000000,
      nextEarningsDate: '2024-03-11',
      lastCompletedBar: '2024-01-15'
    },
    'INTC': {
      ticker: 'INTC',
      company: 'Intel Corporation',
      sector: 'Technology',
      industry: 'Semiconductors',
      marketCap: 135000000000,
      nextEarningsDate: '2024-01-25',
      lastCompletedBar: '2024-01-15'
    },
    'IBM': {
      ticker: 'IBM',
      company: 'International Business Machines Corporation',
      sector: 'Technology',
      industry: 'IT Services',
      marketCap: 180000000000,
      nextEarningsDate: '2024-01-24',
      lastCompletedBar: '2024-01-15'
    },
    'CSCO': {
      ticker: 'CSCO',
      company: 'Cisco Systems, Inc.',
      sector: 'Technology',
      industry: 'Networking',
      marketCap: 220000000000,
      nextEarningsDate: '2024-02-14',
      lastCompletedBar: '2024-01-15'
    },
    'JPM': {
      ticker: 'JPM',
      company: 'JPMorgan Chase & Co.',
      sector: 'Financials',
      industry: 'Banking',
      marketCap: 550000000000,
      nextEarningsDate: '2024-01-12',
      lastCompletedBar: '2024-01-15'
    },
    'BAC': {
      ticker: 'BAC',
      company: 'Bank of America Corporation',
      sector: 'Financials',
      industry: 'Banking',
      marketCap: 310000000000,
      nextEarningsDate: '2024-01-16',
      lastCompletedBar: '2024-01-15'
    },
    'WFC': {
      ticker: 'WFC',
      company: 'Wells Fargo & Company',
      sector: 'Financials',
      industry: 'Banking',
      marketCap: 200000000000,
      nextEarningsDate: '2024-01-12',
      lastCompletedBar: '2024-01-15'
    },
    'GS': {
      ticker: 'GS',
      company: 'The Goldman Sachs Group, Inc.',
      sector: 'Financials',
      industry: 'Investment Banking',
      marketCap: 145000000000,
      nextEarningsDate: '2024-01-16',
      lastCompletedBar: '2024-01-15'
    },
    'MS': {
      ticker: 'MS',
      company: 'Morgan Stanley',
      sector: 'Financials',
      industry: 'Investment Banking',
      marketCap: 170000000000,
      nextEarningsDate: '2024-01-17',
      lastCompletedBar: '2024-01-15'
    },
    'JNJ': {
      ticker: 'JNJ',
      company: 'Johnson & Johnson',
      sector: 'Health Care',
      industry: 'Pharmaceuticals',
      marketCap: 430000000000,
      nextEarningsDate: '2024-01-23',
      lastCompletedBar: '2024-01-15'
    },
    'PFE': {
      ticker: 'PFE',
      company: 'Pfizer Inc.',
      sector: 'Health Care',
      industry: 'Pharmaceuticals',
      marketCap: 165000000000,
      nextEarningsDate: '2024-01-30',
      lastCompletedBar: '2024-01-15'
    },
    'UNH': {
      ticker: 'UNH',
      company: 'UnitedHealth Group Incorporated',
      sector: 'Health Care',
      industry: 'Health Insurance',
      marketCap: 490000000000,
      nextEarningsDate: '2024-01-16',
      lastCompletedBar: '2024-01-15'
    },
    'ABBV': {
      ticker: 'ABBV',
      company: 'AbbVie Inc.',
      sector: 'Health Care',
      industry: 'Pharmaceuticals',
      marketCap: 310000000000,
      nextEarningsDate: '2024-02-02',
      lastCompletedBar: '2024-01-15'
    },
    'MRK': {
      ticker: 'MRK',
      company: 'Merck & Co., Inc.',
      sector: 'Health Care',
      industry: 'Pharmaceuticals',
      marketCap: 275000000000,
      nextEarningsDate: '2024-02-01',
      lastCompletedBar: '2024-01-15'
    },
    'XOM': {
      ticker: 'XOM',
      company: 'Exxon Mobil Corporation',
      sector: 'Energy',
      industry: 'Oil & Gas',
      marketCap: 500000000000,
      nextEarningsDate: '2024-02-02',
      lastCompletedBar: '2024-01-15'
    },
    'CVX': {
      ticker: 'CVX',
      company: 'Chevron Corporation',
      sector: 'Energy',
      industry: 'Oil & Gas',
      marketCap: 300000000000,
      nextEarningsDate: '2024-01-26',
      lastCompletedBar: '2024-01-15'
    },
    'KO': {
      ticker: 'KO',
      company: 'The Coca-Cola Company',
      sector: 'Consumer Staples',
      industry: 'Beverages',
      marketCap: 270000000000,
      nextEarningsDate: '2024-02-13',
      lastCompletedBar: '2024-01-15'
    },
    'PEP': {
      ticker: 'PEP',
      company: 'PepsiCo, Inc.',
      sector: 'Consumer Staples',
      industry: 'Beverages',
      marketCap: 235000000000,
      nextEarningsDate: '2024-02-09',
      lastCompletedBar: '2024-01-15'
    },
    'WMT': {
      ticker: 'WMT',
      company: 'Walmart Inc.',
      sector: 'Consumer Staples',
      industry: 'Retail',
      marketCap: 540000000000,
      nextEarningsDate: '2024-02-20',
      lastCompletedBar: '2024-01-15'
    }
  }
};

function generateSampleCandles(ticker: string, currentPrice: number, trend: 'up' | 'down' | 'sideways'): Candle[] {
  const candles: Candle[] = [];
  const startDate = new Date('2022-06-01'); // Start earlier to get 250+ bars
  const endDate = new Date('2024-01-15');
  
  let price = currentPrice;
  let date = new Date(startDate);
  
  // Calculate trend adjustment
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  let trendAdjustment = 0;
  
  switch (trend) {
    case 'up':
      trendAdjustment = 0.15 / totalDays; // 15% increase over period
      price = currentPrice / 1.15; // Start lower
      break;
    case 'down':
      trendAdjustment = -0.15 / totalDays; // 15% decrease over period
      price = currentPrice / 0.85; // Start higher
      break;
    case 'sideways':
      trendAdjustment = 0; // No trend
      break;
  }
  
  while (date <= endDate) {
    // Skip weekends
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      const dailyVolatility = 0.02; // 2% daily volatility
      const randomFactor = (Math.random() - 0.5) * dailyVolatility;
      
      // Apply trend and random movement
      const priceChange = price * (trendAdjustment + randomFactor);
      const newPrice = Math.max(price + priceChange, 1); // Minimum price of $1
      
      const high = newPrice * (1 + Math.random() * 0.015);
      const low = newPrice * (1 - Math.random() * 0.015);
      const open = price;
      const close = newPrice;
      
      // Generate volume (higher volume for larger price movements)
      const baseVolume = getBaseVolume(ticker);
      const volumeMultiplier = 1 + Math.abs(randomFactor) * 3;
      const volume = Math.floor(baseVolume * volumeMultiplier * (0.5 + Math.random()));
      
      candles.push({
        t: date.toISOString().split('T')[0],
        o: Math.round(open * 100) / 100,
        h: Math.round(high * 100) / 100,
        l: Math.round(low * 100) / 100,
        c: Math.round(close * 100) / 100,
        v: volume
      });
      
      price = newPrice;
    }
    
    date.setDate(date.getDate() + 1);
  }
  
  return candles;
}

function getBaseVolume(ticker: string): number {
  const volumeMap: Record<string, number> = {
    'AAPL': 50000000,
    'MSFT': 25000000,
    'GOOGL': 20000000,
    'TSLA': 45000000,
    'NVDA': 35000000,
    'META': 15000000,
    'AMZN': 30000000,
    'NFLX': 8000000,
    'AMD': 25000000,
    'CRM': 5000000,
    'ADBE': 3000000,
    'ORCL': 15000000,
    'INTC': 20000000,
    'IBM': 5000000,
    'CSCO': 12000000,
    'JPM': 8000000,
    'BAC': 25000000,
    'WFC': 15000000,
    'GS': 2000000,
    'MS': 5000000,
    'JNJ': 6000000,
    'PFE': 20000000,
    'UNH': 3000000,
    'ABBV': 8000000,
    'MRK': 7000000,
    'XOM': 15000000,
    'CVX': 8000000,
    'KO': 10000000,
    'PEP': 4000000,
    'WMT': 6000000
  };
  
  return volumeMap[ticker] || 5000000;
}