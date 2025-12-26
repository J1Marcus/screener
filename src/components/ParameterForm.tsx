import React from 'react';
import {
  ScreenerParams,
  Trend,
  MACross,
  FibReference,
  FibZone,
  IndexName,
  Timeframe,
  CandlestickPattern
} from '../contract';

interface ParameterFormProps {
  params: ScreenerParams;
  onChange: (params: Partial<ScreenerParams>) => void;
  onRun: () => void;
  onReset: () => void;
  loading: boolean;
}

export const ParameterForm: React.FC<ParameterFormProps> = ({
  params,
  onChange,
  onRun,
  onReset,
  loading
}) => {
  const handleInputChange = (field: keyof ScreenerParams) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = event.target.type === 'number'
      ? parseFloat(event.target.value) || 0
      : event.target.value;
    onChange({ [field]: value });
  };

  const handleCheckboxChange = (field: keyof ScreenerParams) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange({ [field]: event.target.checked });
  };

  const handlePatternToggle = (pattern: CandlestickPattern) => () => {
    const currentPatterns = params.candlestick_patterns || [];
    const newPatterns = currentPatterns.includes(pattern)
      ? currentPatterns.filter(p => p !== pattern)
      : [...currentPatterns, pattern];
    onChange({ candlestick_patterns: newPatterns });
  };

  const handleIndexToggle = (index: IndexName) => () => {
    const currentIndices = params.index_filters || [];
    const newIndices = currentIndices.includes(index)
      ? currentIndices.filter(i => i !== index)
      : [...currentIndices, index];
    onChange({ index_filters: newIndices });
  };

  const formatDate = (date: string) => {
    if (date === '1970-01-01') {
      const today = new Date();
      return today.toISOString().split('T')[0];
    }
    return date;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Multiple scroll attempts to ensure it works
    window.scroll(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    onRun();
  };

  return (
    <form className="parameter-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        {/* Basic Filters */}
        <div className="form-section">
          <h3>Basic Filters</h3>
          
          <div className="form-group">
            <label htmlFor="sector">Sector:</label>
            <select
              id="sector"
              value={params.user_sector}
              onChange={handleInputChange('user_sector')}
            >
              <option value="*">All</option>
              <option value="Technology">Technology</option>
              <option value="Consumer Discretionary">Consumer Discretionary</option>
              <option value="Communication Services">Communication Services</option>
              <option value="Health Care">Health Care</option>
              <option value="Financials">Financials</option>
              <option value="Energy">Energy</option>
              <option value="Consumer Staples">Consumer Staples</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="industry">Industry:</label>
            <select
              id="industry"
              value={params.user_industry}
              onChange={handleInputChange('user_industry')}
            >
              <option value="*">All</option>
              <option value="Banking">Banking</option>
              <option value="Beverages">Beverages</option>
              <option value="Consumer Electronics">Consumer Electronics</option>
              <option value="E-commerce">E-commerce</option>
              <option value="Electric Vehicles">Electric Vehicles</option>
              <option value="Health Insurance">Health Insurance</option>
              <option value="Internet Services">Internet Services</option>
              <option value="Investment Banking">Investment Banking</option>
              <option value="IT Services">IT Services</option>
              <option value="Networking">Networking</option>
              <option value="Oil & Gas">Oil &amp; Gas</option>
              <option value="Pharmaceuticals">Pharmaceuticals</option>
              <option value="Retail">Retail</option>
              <option value="Semiconductors">Semiconductors</option>
              <option value="Social Media">Social Media</option>
              <option value="Software">Software</option>
              <option value="Streaming">Streaming</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="marketCapMin">Market Cap Min ($):</label>
            <input
              id="marketCapMin"
              type="number"
              value={params.market_cap_min}
              onChange={handleInputChange('market_cap_min')}
              min="0"
              step="1000000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="marketCapMax">Market Cap Max ($):</label>
            <input
              id="marketCapMax"
              type="number"
              value={params.market_cap_max}
              onChange={handleInputChange('market_cap_max')}
              min="0"
              step="1000000"
            />
          </div>
        </div>

        {/* Technical Indicators */}
        <div className="form-section">
          <h3>Technical Indicators</h3>
          
          <div className="form-group">
            <label htmlFor="rsiMin">RSI Min:</label>
            <input
              id="rsiMin"
              type="number"
              value={params.rsi_min}
              onChange={handleInputChange('rsi_min')}
              min="0"
              max="100"
            />
          </div>

          <div className="form-group">
            <label htmlFor="rsiMax">RSI Max:</label>
            <input
              id="rsiMax"
              type="number"
              value={params.rsi_max}
              onChange={handleInputChange('rsi_max')}
              min="0"
              max="100"
            />
          </div>

          {/* Hide standard Stochastic filters when Leo mode is enabled (Leo has its own thresholds) */}
          {!params.leo_mode_enabled && (
            <>
              <div className="form-group">
                <label htmlFor="stochKMin">Stochastic %K Min:</label>
                <input
                  id="stochKMin"
                  type="number"
                  value={params.stoch_k_min}
                  onChange={handleInputChange('stoch_k_min')}
                  min="0"
                  max="100"
                />
              </div>

              <div className="form-group">
                <label htmlFor="stochKMax">Stochastic %K Max:</label>
                <input
                  id="stochKMax"
                  type="number"
                  value={params.stoch_k_max}
                  onChange={handleInputChange('stoch_k_max')}
                  min="0"
                  max="100"
                />
              </div>
            </>
          )}

          {params.leo_mode_enabled && (
            <div className="form-group disabled-note">
              <span style={{ fontSize: '0.85rem', color: '#6c757d', fontStyle: 'italic' }}>
                Stochastic filters controlled by Leo thresholds
              </span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="adxMin">ADX Min:</label>
            <input
              id="adxMin"
              type="number"
              value={params.adx_min}
              onChange={handleInputChange('adx_min')}
              min="0"
              step="0.1"
            />
          </div>
        </div>

        {/* Trend Analysis */}
        <div className="form-section">
          <h3>Trend Analysis</h3>
          
          <div className="form-group">
            <label htmlFor="trendType">Trend Type:</label>
            <select
              id="trendType"
              value={params.trend_type}
              onChange={handleInputChange('trend_type')}
            >
              <option value="*">Any</option>
              <option value="up">Up</option>
              <option value="down">Down</option>
              <option value="sideways">Sideways</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="trendLookback">Trend Lookback (days):</label>
            <input
              id="trendLookback"
              type="number"
              value={params.trend_lookback}
              onChange={handleInputChange('trend_lookback')}
              min="1"
              max="250"
            />
          </div>

          <div className="form-group">
            <label htmlFor="maCross">MA Cross:</label>
            <select
              id="maCross"
              value={params.ma_cross}
              onChange={handleInputChange('ma_cross')}
            >
              <option value="none">None</option>
              <option value="20>50">20 &gt; 50</option>
              <option value="50>200">50 &gt; 200</option>
              <option value="20>200">20 &gt; 200</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="form-section">
          <h3>Advanced Filters</h3>
          
          <div className="form-group">
            <label htmlFor="srProximity">S/R Proximity (%):</label>
            <input
              id="srProximity"
              type="number"
              value={params.sr_proximity_pct}
              onChange={handleInputChange('sr_proximity_pct')}
              min="0"
              step="0.1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="atrLookback">ATR Lookback:</label>
            <input
              id="atrLookback"
              type="number"
              value={params.atr_lookback}
              onChange={handleInputChange('atr_lookback')}
              min="1"
              max="50"
            />
          </div>

          <div className="form-group">
            <label htmlFor="fibReference">Fib Reference:</label>
            <select
              id="fibReference"
              value={params.fib_reference}
              onChange={handleInputChange('fib_reference')}
            >
              <option value="swing_low_to_high">Swing Low to High</option>
              <option value="swing_high_to_low">Swing High to Low</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="fibZone">Fib Zone:</label>
            <select
              id="fibZone"
              value={params.fib_zone}
              onChange={handleInputChange('fib_zone')}
            >
              <option value="*">Any</option>
              <option value="38.2-50">38.2% - 50%</option>
              <option value="50-61.8">50% - 61.8%</option>
              <option value="38.2-61.8">38.2% - 61.8%</option>
              <option value="extension-127">Extension 127%</option>
              <option value="extension-161.8">Extension 161.8%</option>
            </select>
          </div>
        </div>

        {/* Leo Reversal Filters */}
        <div className="form-section leo-section">
          <h3>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={params.leo_mode_enabled}
                onChange={handleCheckboxChange('leo_mode_enabled')}
              />
              Leo Reversal Mode
            </label>
          </h3>

          {params.leo_mode_enabled && (
            <>
              <div className="form-group">
                <label>Index Filters:</label>
                <div className="checkbox-group">
                  {([
                    { value: 'sp500' as IndexName, label: 'S&P 500' },
                    { value: 'dowjones' as IndexName, label: 'Dow Jones 30' },
                    { value: 'nasdaq100' as IndexName, label: 'Nasdaq 100' },
                    { value: 'russell2000' as IndexName, label: 'Russell 2000' }
                  ]).map(({ value, label }) => (
                    <label key={value} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={(params.index_filters || []).includes(value)}
                        onChange={handleIndexToggle(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="timeframe">Timeframe:</label>
                <select
                  id="timeframe"
                  value={params.timeframe}
                  onChange={handleInputChange('timeframe')}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="minPriceLeo">Min Price ($):</label>
                <input
                  id="minPriceLeo"
                  type="number"
                  value={params.min_price_leo}
                  onChange={handleInputChange('min_price_leo')}
                  min="0"
                  step="5"
                />
              </div>

              <div className="form-group">
                <label>Candlestick Patterns:</label>
                <div className="checkbox-group">
                  {(['doji', 'hammer', 'long_lower_shadow', 'engulfing_bullish'] as CandlestickPattern[]).map(pattern => (
                    <label key={pattern} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={(params.candlestick_patterns || []).includes(pattern)}
                        onChange={handlePatternToggle(pattern)}
                      />
                      {pattern.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={params.require_volume_shift}
                    onChange={handleCheckboxChange('require_volume_shift')}
                  />
                  Require Volume Shift
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={params.bb_bounce_enabled}
                    onChange={handleCheckboxChange('bb_bounce_enabled')}
                  />
                  BB Bounce Detection
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="stochOversold">Stoch Oversold Threshold:</label>
                <input
                  id="stochOversold"
                  type="number"
                  value={params.stoch_oversold_threshold}
                  onChange={handleInputChange('stoch_oversold_threshold')}
                  min="0"
                  max="50"
                />
              </div>

              <div className="form-group">
                <label htmlFor="stochOverbought">Stoch Overbought Threshold:</label>
                <input
                  id="stochOverbought"
                  type="number"
                  value={params.stoch_overbought_threshold}
                  onChange={handleInputChange('stoch_overbought_threshold')}
                  min="50"
                  max="100"
                />
              </div>

              <div className="form-group">
                <label htmlFor="earningsWarning">Earnings Warning (days):</label>
                <input
                  id="earningsWarning"
                  type="number"
                  value={params.earnings_warning_days}
                  onChange={handleInputChange('earnings_warning_days')}
                  min="0"
                  max="90"
                />
              </div>
            </>
          )}
        </div>

        {/* Output Settings */}
        <div className="form-section">
          <h3>Output Settings</h3>

          <div className="form-group">
            <label htmlFor="maxResults">Max Results:</label>
            <input
              id="maxResults"
              type="number"
              value={params.max_results}
              onChange={handleInputChange('max_results')}
              min="1"
              max="200"
            />
          </div>

          <div className="form-group">
            <label htmlFor="asOfDate">As of Date:</label>
            <input
              id="asOfDate"
              type="date"
              value={formatDate(params.as_of_date)}
              onChange={handleInputChange('as_of_date')}
            />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          onClick={() => {
            requestAnimationFrame(() => {
              window.scroll({ top: 0, left: 0, behavior: 'auto' });
            });
          }}
        >
          {loading ? 'Running...' : 'Run Screener'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onReset}
          disabled={loading}
        >
          Reset
        </button>
      </div>
    </form>
  );
};