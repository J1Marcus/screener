import React, { useState, useCallback, useRef } from 'react';
import { ScreenerParams, DEFAULT_PARAMS, validateParams, EngineInput, EngineOutput, ClassifiedPick, Candle, TickerMeta } from './contract';
import { runEngine } from './engine';
import { ParameterForm } from './components/ParameterForm';
import { ResultsDisplay } from './components/ResultsDisplay';
import { TickerDetailModal } from './components/TickerDetailModal';
import { ApiKeyInput } from './components/ApiKeyInput';
import { sampleData } from './data/sampleData';
import { TwelveDataProvider, type QuoteData, type HistoricalInterval } from './providers/twelveData';
import { clearCache } from './providers/cache';
import { getIndexTickers } from './data/indexLists';
import './App.css';

export const App: React.FC = () => {
  const [params, setParams] = useState<ScreenerParams>(DEFAULT_PARAMS);
  const [results, setResults] = useState<EngineOutput | null>(null);
  const [engineInput, setEngineInput] = useState<EngineInput | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiProvider, setApiProvider] = useState<TwelveDataProvider | null>(null);
  const [realTimePrices, setRealTimePrices] = useState<Record<string, QuoteData>>({});
  const [isUpdatingPrices, setIsUpdatingPrices] = useState<boolean>(false);
  const [priceUpdateError, setPriceUpdateError] = useState<string | null>(null);
  const [useLiveData, setUseLiveData] = useState<boolean>(false);
  const [fetchProgress, setFetchProgress] = useState<{ current: number; total: number; symbol: string } | null>(null);
  const [dataSource, setDataSource] = useState<'sample' | 'live' | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  const handleParamsChange = useCallback((newParams: Partial<ScreenerParams>) => {
    setParams(prev => ({ ...prev, ...newParams }));
    setError(null);
  }, []);

  const handleRunScreener = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFetchProgress(null);
    setDataSource(null);

    try {
      // Validate parameters
      const validatedParams = validateParams(params);

      let timeseries: Record<string, Candle[]> = sampleData.timeseries;
      let metadata: Record<string, TickerMeta> = sampleData.metadata;
      let usedLiveData = false;

      // Fetch live data if enabled and API key is available
      if (useLiveData && apiProvider) {
        console.log('Live data enabled, fetching from API...');
        // Get tickers from selected indices (or all if none selected)
        const indexFilters = validatedParams.leo_mode_enabled ? validatedParams.index_filters : [];
        let tickers: string[];

        if (indexFilters.length > 0) {
          // Get tickers from selected indices
          const tickerSet = new Set<string>();
          for (const idx of indexFilters) {
            getIndexTickers(idx).forEach(t => tickerSet.add(t));
          }
          tickers = Array.from(tickerSet);
        } else {
          // Use all tickers from sample data as fallback
          tickers = Object.keys(sampleData.timeseries);
        }

        // Limit tickers to avoid too many API calls
        const maxTickers = Math.min(tickers.length, 50);
        const tickersToFetch = tickers.slice(0, maxTickers);

        // Map timeframe to API interval
        const intervalMap: Record<string, HistoricalInterval> = {
          'daily': '1day',
          'weekly': '1week',
          'monthly': '1month'
        };
        const interval = intervalMap[validatedParams.timeframe] || '1day';

        // Fetch historical data
        const liveData = await apiProvider.getBatchHistoricalData(
          tickersToFetch,
          interval,
          250,
          (current, total, symbol) => {
            setFetchProgress({ current, total, symbol });
          }
        );

        // Use ONLY live data (don't merge with sample data)
        timeseries = liveData;

        // Update metadata for fetched tickers only
        const today = new Date().toISOString().split('T')[0];
        metadata = {};
        for (const ticker of Object.keys(liveData)) {
          // Use sample metadata if available, otherwise create basic entry
          if (sampleData.metadata[ticker]) {
            metadata[ticker] = { ...sampleData.metadata[ticker], lastCompletedBar: today };
          } else {
            metadata[ticker] = {
              ticker,
              company: ticker,
              sector: null,
              industry: null,
              marketCap: null,
              nextEarningsDate: null,
              lastCompletedBar: today
            };
          }
        }

        // Update as_of_date to today
        validatedParams.as_of_date = today;

        // Check if we actually got live data
        const liveTickerCount = Object.keys(liveData).length;
        console.log(`Fetched live data for ${liveTickerCount} tickers`);
        if (liveTickerCount > 0) {
          usedLiveData = true;
        }
      } else {
        console.log('Using sample data (live data not enabled or no API key)');
      }

      // Run the engine
      const input: EngineInput = {
        params: validatedParams,
        timeseries,
        metadata
      };

      const output = runEngine(input);
      setResults(output);
      setEngineInput(input); // Store for modal use
      setDataSource(usedLiveData ? 'live' : 'sample');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setFetchProgress(null);
    }
  }, [params, useLiveData, apiProvider]);

  const handleReset = useCallback(() => {
    setParams(DEFAULT_PARAMS);
    setResults(null);
    setEngineInput(null);
    setSelectedTicker(null);
    setError(null);
  }, []);

  const handleSelectTicker = useCallback((ticker: string) => {
    setSelectedTicker(ticker);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedTicker(null);
  }, []);

  const handleApiKeyChange = useCallback((apiKey: string | null, provider: TwelveDataProvider | null) => {
    setApiProvider(provider);
    if (!provider) {
      setRealTimePrices({});
    }
    setPriceUpdateError(null);
  }, []);

  const updatePricesViaAPI = useCallback(async () => {
    if (!apiProvider || !results || results.picks.length === 0) return;

    setIsUpdatingPrices(true);
    setPriceUpdateError(null);

    try {
      const tickers = results.picks.map(pick => pick.Ticker);
      const quotes = await apiProvider.getBatchQuotes(tickers);
      
      const priceMap: Record<string, QuoteData> = {};
      quotes.forEach(quote => {
        priceMap[quote.symbol] = quote;
      });
      
      setRealTimePrices(priceMap);
    } catch (error) {
      setPriceUpdateError(error instanceof Error ? error.message : 'Failed to update prices');
    } finally {
      setIsUpdatingPrices(false);
    }
  }, [apiProvider, results]);

  // Get selected ticker data for modal
  const selectedTickerData = selectedTicker && results && engineInput ? {
    pick: results.picks.find(p => p.Ticker === selectedTicker),
    candles: engineInput.timeseries?.[selectedTicker],
    meta: engineInput.metadata?.[selectedTicker]
  } : null;

  return (
    <div className="app">
      <div id="top-anchor" style={{ position: 'absolute', top: 0 }}></div>
      <header className="app-header" ref={headerRef}>
        <h1>🎯 U.S. Stock Screener</h1>
        <p>Deterministic, dependency-free TypeScript stock analysis engine</p>
      </header>

      <main className="app-main">
        <div className="screener-container">
          <div className="parameters-section">
            <h2>Screening Parameters</h2>
            <div style={{ marginBottom: '20px' }}>
              <ApiKeyInput onApiKeyChange={handleApiKeyChange} />
              {apiProvider && (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={useLiveData}
                      onChange={(e) => setUseLiveData(e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: 500 }}>Use Live Data</span>
                  </label>
                  {useLiveData && (
                    <>
                      <span style={{ fontSize: '13px', color: '#6c757d' }}>
                        ({apiProvider.getRemainingApiCalls()} API calls remaining)
                      </span>
                      <button
                        type="button"
                        onClick={() => { clearCache(); alert('Cache cleared! Next fetch will get fresh data.'); }}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Clear Cache
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <ParameterForm
              params={params}
              onChange={handleParamsChange}
              onRun={handleRunScreener}
              onReset={handleReset}
              loading={loading}
            />
            {error && (
              <div className="error-message">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>

          <div className="results-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2>Results</h2>
              {apiProvider && results && results.picks.length > 0 && (
                <button
                  onClick={updatePricesViaAPI}
                  disabled={isUpdatingPrices}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #007bff',
                    backgroundColor: isUpdatingPrices ? '#f8f9fa' : '#007bff',
                    color: isUpdatingPrices ? '#6c757d' : 'white',
                    cursor: isUpdatingPrices ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {isUpdatingPrices ? '⏳ Updating...' : '📈 Update Prices via API'}
                </button>
              )}
            </div>

            {priceUpdateError && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '4px',
                color: '#721c24',
                fontSize: '14px'
              }}>
                ❌ Price update error: {priceUpdateError}
              </div>
            )}

            {Object.keys(realTimePrices).length > 0 && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '4px',
                color: '#155724',
                fontSize: '14px'
              }}>
                ✅ Updated {Object.keys(realTimePrices).length} real-time prices
              </div>
            )}

            {loading && (
              <div className="loading-message">
                <div className="spinner"></div>
                {fetchProgress ? (
                  <div>
                    <div>Fetching live data: {fetchProgress.current}/{fetchProgress.total}</div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>
                      Currently fetching: {fetchProgress.symbol}
                    </div>
                  </div>
                ) : (
                  'Running screener analysis...'
                )}
              </div>
            )}
            {dataSource && results && !loading && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: dataSource === 'live' ? '#d4edda' : '#fff3cd',
                border: `1px solid ${dataSource === 'live' ? '#c3e6cb' : '#ffeeba'}`,
                borderRadius: '4px',
                color: dataSource === 'live' ? '#155724' : '#856404',
                fontSize: '14px'
              }}>
                {dataSource === 'live'
                  ? '✅ Using LIVE data from Twelve Data API'
                  : '⚠️ Using SAMPLE data (Jan 2024) - Enable "Use Live Data" for current market data'}
              </div>
            )}

            {results && !loading && (
              <ResultsDisplay
                results={results}
                onSelectTicker={handleSelectTicker}
                realTimePrices={realTimePrices}
                leoModeEnabled={params.leo_mode_enabled}
              />
            )}
            {!results && !loading && (
              <div className="no-results">
                <p>Configure your parameters and click "Run Screener" to see results.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>Built with TypeScript, React, and deterministic analysis algorithms</p>
      </footer>

      {/* Ticker Detail Modal */}
      {selectedTicker && selectedTickerData?.pick && selectedTickerData?.candles && selectedTickerData?.meta && (
        <TickerDetailModal
          ticker={selectedTicker}
          pick={selectedTickerData.pick}
          candles={selectedTickerData.candles}
          meta={selectedTickerData.meta}
          params={params}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};