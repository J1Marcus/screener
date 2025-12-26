import React, { useState, useEffect } from 'react';
import { ClassifiedPick, Candle, TickerMeta, ScreenerParams, Indicators, PriceTarget } from '../contract';

interface TickerDetailModalProps {
  ticker: string;
  pick: ClassifiedPick;
  candles: Candle[];
  meta: TickerMeta;
  params: ScreenerParams;
  onClose: () => void;
}

type TabType = 'overview' | 'indicators' | 'tradeplan' | 'notes';

export const TickerDetailModal: React.FC<TickerDetailModalProps> = ({
  ticker,
  pick,
  candles,
  meta,
  params,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Calculate indicators for this ticker
  const indicators = calculateTickerIndicators(candles, params);
  const reasoning = generateReasoning(pick, candles, indicators, params);

  // Open TradingView chart for this ticker
  const openTradingView = () => {
    const url = `https://www.tradingview.com/chart/?symbol=${ticker}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <h2>{ticker} - {meta.company || 'Unknown Company'}</h2>
            <div className="modal-subtitle">
              <span className="price">${pick.Price.toFixed(2)}</span>
              <span className="sector">{pick.Sector || 'N/A'}</span>
              <span className="setup-reason" style={{ color: getSetupReasonColor(pick.SelectionReason) }}>
                {pick.SelectionReason}
              </span>
            </div>
          </div>
          <div className="modal-header-actions">
            <button
              className="btn-tradingview"
              onClick={openTradingView}
              title="Open in TradingView"
            >
              📈 TradingView
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab ${activeTab === 'indicators' ? 'active' : ''}`}
            onClick={() => setActiveTab('indicators')}
          >
            Indicators
          </button>
          {params.leo_mode_enabled && (
            <button
              className={`tab ${activeTab === 'tradeplan' ? 'active' : ''}`}
              onClick={() => setActiveTab('tradeplan')}
            >
              Trade Plan
            </button>
          )}
          <button
            className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Notes
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="chart-container">
                <TickerChart
                  candles={candles}
                  indicators={indicators}
                  ticker={ticker}
                />
              </div>
              <div className="reasoning-container">
                <h3>Why This Pick</h3>
                <div className="reasoning-content">
                  {reasoning.map((reason, index) => (
                    <div key={index} className="reason-item">
                      <strong>{reason.title}:</strong> {reason.description}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'indicators' && (
            <div className="indicators-tab">
              <IndicatorsTable indicators={indicators} pick={pick} />
            </div>
          )}

          {activeTab === 'tradeplan' && params.leo_mode_enabled && (
            <div className="tradeplan-tab">
              <TradePlanSection pick={pick} params={params} meta={meta} />
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="notes-tab">
              <div className="company-info">
                <h3>Company Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Company:</label>
                    <span>{meta.company || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Sector:</label>
                    <span>{meta.sector || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Industry:</label>
                    <span>{meta.industry || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Market Cap:</label>
                    <span>{formatMarketCap(meta.marketCap || null)}</span>
                  </div>
                  <div className="info-item">
                    <label>Next Earnings:</label>
                    <span>{meta.nextEarningsDate || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Chart component
const TickerChart: React.FC<{
  candles: Candle[];
  indicators: Indicators;
  ticker: string;
}> = ({ candles, indicators, ticker }) => {
  const chartWidth = 800;
  const chartHeight = 400;
  const volumeHeight = 80;
  const rsiHeight = 60;
  const totalHeight = chartHeight + volumeHeight + rsiHeight + 40; // padding

  // Get last 60 candles for chart
  const displayCandles = candles.slice(-60);
  const prices = displayCandles.map(c => [c.h, c.l, c.o, c.c]).flat();
  const volumes = displayCandles.map(c => c.v);

  // Get date range
  const startDate = displayCandles[0]?.t || 'N/A';
  const endDate = displayCandles[displayCandles.length - 1]?.t || 'N/A';
  const formatDisplayDate = (dateStr: string) => {
    if (dateStr === 'N/A') return dateStr;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Detect actual timeframe from candle data (by average days between candles)
  const detectTimeframe = (): string => {
    if (displayCandles.length < 2) return 'daily';
    const firstDate = new Date(displayCandles[0].t);
    const lastDate = new Date(displayCandles[displayCandles.length - 1].t);
    const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
    const avgDaysPerCandle = daysDiff / (displayCandles.length - 1);

    if (avgDaysPerCandle >= 25) return 'monthly';
    if (avgDaysPerCandle >= 5) return 'weekly';
    return 'daily';
  };
  const actualTimeframe = detectTimeframe();
  
  const priceMin = Math.min(...prices) * 0.98;
  const priceMax = Math.max(...prices) * 1.02;
  const volumeMax = Math.max(...volumes) * 1.1;

  const xScale = (index: number) => (index / (displayCandles.length - 1)) * chartWidth;
  const priceScale = (price: number) => chartHeight - ((price - priceMin) / (priceMax - priceMin)) * chartHeight;
  const volumeScale = (volume: number) => (volume / volumeMax) * volumeHeight;

  // Calculate SMAs for display
  const sma20Values = calculateSMAForDisplay(candles, 20).slice(-60);
  const sma50Values = calculateSMAForDisplay(candles, 50).slice(-60);
  const sma200Values = calculateSMAForDisplay(candles, 200).slice(-60);
  const rsiValues = calculateRSIForDisplay(candles, 14).slice(-60);

  // Calculate 20-day high/low
  const last20Candles = candles.slice(-20);
  const hh20 = Math.max(...last20Candles.map(c => c.h));
  const ll20 = Math.min(...last20Candles.map(c => c.l));

  return (
    <div className="chart-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h4 style={{ margin: 0 }}>
          {ticker} - {actualTimeframe.charAt(0).toUpperCase() + actualTimeframe.slice(1)} Chart
        </h4>
        <div style={{ fontSize: '13px', color: '#6c757d' }}>
          {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)} ({displayCandles.length} {actualTimeframe} candles)
        </div>
      </div>
      <svg width={chartWidth} height={totalHeight} className="ticker-chart">
        {/* Price Chart Background */}
        <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="#f8f9fa" stroke="#dee2e6" />
        
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(ratio => (
          <g key={ratio}>
            <line 
              x1="0" y1={chartHeight * ratio} 
              x2={chartWidth} y2={chartHeight * ratio} 
              stroke="#e9ecef" strokeDasharray="2,2" 
            />
            <text x="5" y={chartHeight * ratio - 5} fontSize="10" fill="#6c757d">
              ${(priceMin + (priceMax - priceMin) * (1 - ratio)).toFixed(2)}
            </text>
          </g>
        ))}

        {/* 20-day high/low lines */}
        <line x1="0" y1={priceScale(hh20)} x2={chartWidth} y2={priceScale(hh20)} 
              stroke="#dc3545" strokeWidth="1" strokeDasharray="5,5" />
        <text x={chartWidth - 60} y={priceScale(hh20) - 5} fontSize="10" fill="#dc3545">
          20D High: ${hh20.toFixed(2)}
        </text>
        
        <line x1="0" y1={priceScale(ll20)} x2={chartWidth} y2={priceScale(ll20)} 
              stroke="#28a745" strokeWidth="1" strokeDasharray="5,5" />
        <text x={chartWidth - 60} y={priceScale(ll20) + 15} fontSize="10" fill="#28a745">
          20D Low: ${ll20.toFixed(2)}
        </text>

        {/* SMA Lines */}
        {sma20Values.length > 1 && (
          <polyline
            points={sma20Values.map((sma, i) => sma ? `${xScale(i)},${priceScale(sma)}` : '').filter(Boolean).join(' ')}
            fill="none" stroke="#007bff" strokeWidth="2"
          />
        )}
        {sma50Values.length > 1 && (
          <polyline
            points={sma50Values.map((sma, i) => sma ? `${xScale(i)},${priceScale(sma)}` : '').filter(Boolean).join(' ')}
            fill="none" stroke="#fd7e14" strokeWidth="2"
          />
        )}
        {sma200Values.length > 1 && (
          <polyline
            points={sma200Values.map((sma, i) => sma ? `${xScale(i)},${priceScale(sma)}` : '').filter(Boolean).join(' ')}
            fill="none" stroke="#6f42c1" strokeWidth="2"
          />
        )}

        {/* Candlesticks */}
        {displayCandles.map((candle, index) => {
          const x = xScale(index);
          const isGreen = candle.c > candle.o;
          const bodyTop = priceScale(Math.max(candle.o, candle.c));
          const bodyBottom = priceScale(Math.min(candle.o, candle.c));
          const bodyHeight = bodyBottom - bodyTop;

          return (
            <g key={index}>
              {/* Wick */}
              <line 
                x1={x} y1={priceScale(candle.h)} 
                x2={x} y2={priceScale(candle.l)} 
                stroke={isGreen ? '#28a745' : '#dc3545'} strokeWidth="1" 
              />
              {/* Body */}
              <rect 
                x={x - 2} y={bodyTop} 
                width="4" height={Math.max(bodyHeight, 1)} 
                fill={isGreen ? '#28a745' : '#dc3545'} 
              />
            </g>
          );
        })}

        {/* Volume Chart */}
        <rect x="0" y={chartHeight + 10} width={chartWidth} height={volumeHeight} fill="#f8f9fa" stroke="#dee2e6" />
        <text x="5" y={chartHeight + 25} fontSize="12" fontWeight="bold" fill="#495057">Volume</text>
        
        {displayCandles.map((candle, index) => {
          const x = xScale(index);
          const height = volumeScale(candle.v);
          const isGreen = candle.c > candle.o;
          
          return (
            <rect 
              key={index}
              x={x - 2} y={chartHeight + 10 + volumeHeight - height} 
              width="4" height={height} 
              fill={isGreen ? '#28a745' : '#dc3545'} 
              opacity="0.7"
            />
          );
        })}

        {/* RSI Chart */}
        <rect x="0" y={chartHeight + volumeHeight + 20} width={chartWidth} height={rsiHeight} fill="#f8f9fa" stroke="#dee2e6" />
        <text x="5" y={chartHeight + volumeHeight + 35} fontSize="12" fontWeight="bold" fill="#495057">RSI (14)</text>
        
        {/* RSI overbought/oversold lines */}
        <line x1="0" y1={chartHeight + volumeHeight + 20 + rsiHeight * 0.3} 
              x2={chartWidth} y2={chartHeight + volumeHeight + 20 + rsiHeight * 0.3} 
              stroke="#dc3545" strokeDasharray="2,2" opacity="0.5" />
        <line x1="0" y1={chartHeight + volumeHeight + 20 + rsiHeight * 0.7} 
              x2={chartWidth} y2={chartHeight + volumeHeight + 20 + rsiHeight * 0.7} 
              stroke="#28a745" strokeDasharray="2,2" opacity="0.5" />
        
        {rsiValues.length > 1 && (
          <polyline
            points={rsiValues.map((rsi, i) => 
              rsi ? `${xScale(i)},${chartHeight + volumeHeight + 20 + rsiHeight - (rsi / 100) * rsiHeight}` : ''
            ).filter(Boolean).join(' ')}
            fill="none" stroke="#6f42c1" strokeWidth="2"
          />
        )}

        {/* Legend */}
        <g transform={`translate(10, ${totalHeight - 30})`}>
          <line x1="0" y1="0" x2="20" y2="0" stroke="#007bff" strokeWidth="2" />
          <text x="25" y="4" fontSize="10" fill="#495057">SMA20</text>
          
          <line x1="80" y1="0" x2="100" y2="0" stroke="#fd7e14" strokeWidth="2" />
          <text x="105" y="4" fontSize="10" fill="#495057">SMA50</text>
          
          <line x1="160" y1="0" x2="180" y2="0" stroke="#6f42c1" strokeWidth="2" />
          <text x="185" y="4" fontSize="10" fill="#495057">SMA200</text>
        </g>
      </svg>
    </div>
  );
};

// Indicators table component
const IndicatorsTable: React.FC<{
  indicators: Indicators;
  pick: ClassifiedPick;
}> = ({ indicators, pick }) => {
  return (
    <div className="indicators-table">
      <h3>Technical Indicators</h3>
      <table>
        <tbody>
          <tr>
            <td>Price</td>
            <td>${pick.Price.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Volume</td>
            <td>{formatVolume(pick.Volume)}</td>
          </tr>
          <tr>
            <td>Relative Volume</td>
            <td>{pick.RelativeVolume.toFixed(1)}x</td>
          </tr>
          <tr>
            <td>RSI (14)</td>
            <td className={pick.RSI > 70 ? 'overbought' : pick.RSI < 30 ? 'oversold' : ''}>
              {pick.RSI.toFixed(0)}
            </td>
          </tr>
          <tr>
            <td>SMA 20</td>
            <td>${indicators.sma20?.toFixed(2) || 'N/A'}</td>
          </tr>
          <tr>
            <td>SMA 50</td>
            <td>${indicators.sma50?.toFixed(2) || 'N/A'}</td>
          </tr>
          <tr>
            <td>SMA 200</td>
            <td>${indicators.sma200?.toFixed(2) || 'N/A'}</td>
          </tr>
          <tr>
            <td>ADX (14)</td>
            <td>{indicators.adx14?.toFixed(1) || 'N/A'}</td>
          </tr>
          <tr>
            <td>ATR</td>
            <td>${indicators.atr?.toFixed(2) || 'N/A'}</td>
          </tr>
          <tr>
            <td>20D High</td>
            <td>${indicators.hh20?.toFixed(2) || 'N/A'}</td>
          </tr>
          <tr>
            <td>20D Low</td>
            <td>${indicators.ll20?.toFixed(2) || 'N/A'}</td>
          </tr>
          <tr>
            <td>Trend</td>
            <td className={`trend-${pick.Trend}`}>
              {getTrendEmoji(pick.Trend)} {pick.Trend}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// Trade Plan section for Leo methodology
const TradePlanSection: React.FC<{
  pick: ClassifiedPick;
  params: ScreenerParams;
  meta: TickerMeta;
}> = ({ pick, params, meta }) => {
  const timeline = pick.ReversalTimeline || '3-5 candles';
  const optionsExpiration = params.timeframe === 'daily' ? '2-3 weeks' :
    params.timeframe === 'weekly' ? '1-2 months' : '2-4 months';

  return (
    <div className="trade-plan-section">
      <h3>Leo Reversal Trade Plan</h3>

      {/* Entry Status */}
      <div className="trade-plan-card">
        <h4>Entry Status</h4>
        <div className="status-indicator" style={{
          color: pick.EntryConfirmed ? '#28a745' : '#ffc107',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          {pick.EntryConfirmed ? '✓ Entry Confirmed' : '⏳ Awaiting Confirmation'}
        </div>
        <p className="status-description">
          {pick.EntryConfirmed
            ? 'Price has broken and closed above the previous candle high. Entry is confirmed.'
            : 'Wait for price to break AND close above the previous candle high before entering.'}
        </p>
      </div>

      {/* Setup Details */}
      <div className="trade-plan-card">
        <h4>Setup Details</h4>
        <div className="info-grid">
          <div className="info-item">
            <label>Setup Type:</label>
            <span style={{ color: getSetupReasonColor(pick.SelectionReason), fontWeight: 'bold' }}>
              {pick.SelectionReason.replace(/_/g, ' ')}
            </span>
          </div>
          {pick.CandlestickPattern && pick.CandlestickPattern !== 'none' && (
            <div className="info-item">
              <label>Pattern:</label>
              <span style={{ textTransform: 'capitalize' }}>
                {pick.CandlestickPattern.replace(/_/g, ' ')}
              </span>
            </div>
          )}
          <div className="info-item">
            <label>Volume Shift:</label>
            <span style={{
              color: pick.VolumeShift === 'buyer' ? '#28a745' :
                pick.VolumeShift === 'seller' ? '#dc3545' : '#6c757d',
              fontWeight: 'bold'
            }}>
              {pick.VolumeShift || 'N/A'}
              {pick.VolumeShiftStrength && ` (${pick.VolumeShiftStrength.toFixed(0)}%)`}
            </span>
          </div>
          <div className="info-item">
            <label>BB Position:</label>
            <span style={{
              color: pick.BBPosition === 'lower_bounce' ? '#28a745' :
                pick.BBPosition === 'upper_reject' ? '#dc3545' : '#6c757d'
            }}>
              {pick.BBPosition?.replace(/_/g, ' ') || 'N/A'}
              {pick.BBPercentB != null && ` (${(pick.BBPercentB * 100).toFixed(0)}%)`}
            </span>
          </div>
          <div className="info-item">
            <label>Stochastic:</label>
            <span style={{
              color: pick.StochPosition === 'oversold' ? '#28a745' :
                pick.StochPosition === 'overbought' ? '#dc3545' : '#6c757d'
            }}>
              {pick.StochK?.toFixed(0) || 'N/A'} ({pick.StochPosition || 'N/A'})
            </span>
          </div>
        </div>
      </div>

      {/* Price Targets */}
      <div className="trade-plan-card">
        <h4>Price Targets</h4>
        {pick.PriceTargets && pick.PriceTargets.length > 0 ? (
          <div className="targets-list">
            {pick.PriceTargets.map((target, index) => (
              <div key={index} className="target-item">
                <div className="target-price" style={{ fontWeight: 'bold', color: '#28a745' }}>
                  ${target.price.toFixed(2)}
                </div>
                <div className="target-description" style={{ fontSize: '12px', color: '#6c757d' }}>
                  {target.description}
                </div>
                <div className="target-confidence" style={{ fontSize: '11px' }}>
                  Confidence: {target.confidence}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No specific targets calculated. Use 50% retracement of FVG zones or swing highs.</p>
        )}
        <div className="target-note" style={{ marginTop: '10px', fontSize: '12px', color: '#6c757d' }}>
          Note: Maximum realistic target ~10% per Leo's methodology
        </div>
      </div>

      {/* Timeline & Exit */}
      <div className="trade-plan-card">
        <h4>Timeline & Exit</h4>
        <div className="info-grid">
          <div className="info-item">
            <label>Reversal Timeline:</label>
            <span>{timeline}</span>
          </div>
          <div className="info-item">
            <label>Options Expiration:</label>
            <span>{optionsExpiration}</span>
          </div>
          <div className="info-item">
            <label>Exit Strategy:</label>
            <span>50% profit target (Leo's rule)</span>
          </div>
        </div>
      </div>

      {/* Earnings Warning */}
      {pick.EarningsWarning && (
        <div className="trade-plan-card warning-card" style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107'
        }}>
          <h4 style={{ color: '#856404' }}>⚠️ Earnings Warning</h4>
          <p style={{ color: '#856404' }}>
            Earnings report within {params.earnings_warning_days} days ({meta.nextEarningsDate}).
            Consider avoiding or reducing position size.
          </p>
        </div>
      )}
    </div>
  );
};

// Helper functions
function calculateTickerIndicators(candles: Candle[], params: ScreenerParams): Indicators {
  const indicators: Indicators = {};

  // Simple Moving Averages
  indicators.sma20 = sma(candles.map(c => c.c), 20);
  indicators.sma50 = sma(candles.map(c => c.c), 50);
  indicators.sma200 = sma(candles.map(c => c.c), 200);

  // RSI
  indicators.rsi14 = rsi(candles.map(c => c.c), 14);

  // ADX
  indicators.adx14 = adx(candles, 14);

  // ATR
  indicators.atr = atr(candles, params.atr_lookback);

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

  // Trend determination
  indicators.trend = determineTrend(candles, params.trend_lookback);

  return indicators;
}

function generateReasoning(
  pick: ClassifiedPick, 
  candles: Candle[], 
  indicators: Indicators, 
  params: ScreenerParams
): Array<{ title: string; description: string }> {
  const reasoning: Array<{ title: string; description: string }> = [];
  const lastCandle = candles[candles.length - 1];

  switch (pick.SelectionReason) {
    case 'Breakout':
      reasoning.push({
        title: 'Price Breakout',
        description: `Current price $${pick.Price.toFixed(2)} broke above 20-day high of $${indicators.hh20?.toFixed(2) || 'N/A'}`
      });
      reasoning.push({
        title: 'Volume Confirmation',
        description: `Volume ${formatVolume(pick.Volume)} is ${pick.RelativeVolume.toFixed(1)}x average, confirming breakout strength`
      });
      break;

    case 'Momentum':
      reasoning.push({
        title: 'Strong RSI',
        description: `RSI of ${pick.RSI.toFixed(0)} indicates strong momentum (>60)`
      });
      reasoning.push({
        title: 'Trend Strength',
        description: `ADX of ${indicators.adx14?.toFixed(1) || 'N/A'} shows strong trending market (>25)`
      });
      reasoning.push({
        title: 'Uptrend Confirmed',
        description: `Price trend is ${pick.Trend} over ${params.trend_lookback} days`
      });
      break;

    case 'Pullback':
      reasoning.push({
        title: 'Pullback to Support',
        description: `Price $${pick.Price.toFixed(2)} pulled back near SMA20 of $${indicators.sma20?.toFixed(2) || 'N/A'}`
      });
      reasoning.push({
        title: 'Oversold but Not Extreme',
        description: `RSI of ${pick.RSI.toFixed(0)} is below 50 but above 30, indicating healthy pullback`
      });
      reasoning.push({
        title: 'Overall Uptrend Intact',
        description: `Long-term trend remains ${pick.Trend}`
      });
      break;

    case 'Fib Pullback':
      reasoning.push({
        title: 'Fibonacci Retracement',
        description: `Price hit key Fibonacci level in ${params.fib_zone} zone`
      });
      reasoning.push({
        title: 'Bullish Reaction',
        description: `Price showed bullish reaction at Fibonacci support level`
      });
      break;

    case 'Consolidation':
      reasoning.push({
        title: 'Low Volatility',
        description: `Bollinger Band width indicates tight consolidation pattern`
      });
      reasoning.push({
        title: 'Weak Trend',
        description: `ADX of ${indicators.adx14?.toFixed(1) || 'N/A'} shows sideways market (<20)`
      });
      reasoning.push({
        title: 'Potential Breakout Setup',
        description: `Consolidation often precedes significant price moves`
      });
      break;

    case 'Reversal':
      reasoning.push({
        title: 'Extreme RSI',
        description: `RSI of ${pick.RSI.toFixed(0)} indicates ${pick.RSI > 70 ? 'overbought' : 'oversold'} conditions`
      });
      reasoning.push({
        title: 'Near Support/Resistance',
        description: `Price is within 2% of key support/resistance level`
      });
      break;

    // Leo Methodology Setups
    case 'Reversal_Accumulation':
      reasoning.push({
        title: 'Accumulation Pattern',
        description: `Bullish reversal pattern detected with buyer volume shift`
      });
      if (pick.CandlestickPattern && pick.CandlestickPattern !== 'none') {
        reasoning.push({
          title: 'Candlestick Pattern',
          description: `${pick.CandlestickPattern.replace(/_/g, ' ')} pattern confirms reversal setup`
        });
      }
      if (pick.VolumeShift === 'buyer') {
        reasoning.push({
          title: 'Volume Shift',
          description: `Buyer volume dominance (${pick.VolumeShiftStrength?.toFixed(0) || 0}% strength) indicates accumulation`
        });
      }
      break;

    case 'Reversal_Distribution':
      reasoning.push({
        title: 'Distribution Pattern',
        description: `Bearish reversal pattern detected with seller volume shift`
      });
      if (pick.CandlestickPattern && pick.CandlestickPattern !== 'none') {
        reasoning.push({
          title: 'Candlestick Pattern',
          description: `${pick.CandlestickPattern.replace(/_/g, ' ')} pattern confirms reversal setup`
        });
      }
      if (pick.VolumeShift === 'seller') {
        reasoning.push({
          title: 'Volume Shift',
          description: `Seller volume dominance (${pick.VolumeShiftStrength?.toFixed(0) || 0}% strength) indicates distribution`
        });
      }
      break;

    case 'BB_Lower_Bounce':
      reasoning.push({
        title: 'Bollinger Band Bounce',
        description: `Price at lower Bollinger Band (${((pick.BBPercentB || 0) * 100).toFixed(0)}% BB position)`
      });
      reasoning.push({
        title: 'Oversold Condition',
        description: `Stochastic at ${pick.StochK?.toFixed(0) || 'N/A'} indicates oversold reversal opportunity`
      });
      break;

    case 'BB_Upper_Reject':
      reasoning.push({
        title: 'Bollinger Band Rejection',
        description: `Price rejected at upper Bollinger Band (${((pick.BBPercentB || 0) * 100).toFixed(0)}% BB position)`
      });
      reasoning.push({
        title: 'Overbought Condition',
        description: `Stochastic at ${pick.StochK?.toFixed(0) || 'N/A'} indicates overbought reversal opportunity`
      });
      break;

    case 'Stoch_Oversold_Reversal':
      reasoning.push({
        title: 'Stochastic Oversold',
        description: `Stochastic %K at ${pick.StochK?.toFixed(0) || 'N/A'} (below 20) signals oversold reversal`
      });
      reasoning.push({
        title: 'Mean Reversion',
        description: `Price likely to revert to mean from extreme oversold levels`
      });
      break;

    case 'Stoch_Overbought_Reversal':
      reasoning.push({
        title: 'Stochastic Overbought',
        description: `Stochastic %K at ${pick.StochK?.toFixed(0) || 'N/A'} (above 80) signals overbought reversal`
      });
      reasoning.push({
        title: 'Mean Reversion',
        description: `Price likely to revert to mean from extreme overbought levels`
      });
      break;
  }

  // Add general market context
  reasoning.push({
    title: 'Market Cap',
    description: `${formatMarketCap(pick.MarketCap)} market cap meets minimum liquidity requirements`
  });

  if (pick.RelativeVolume > 2) {
    reasoning.push({
      title: 'High Volume Alert',
      description: `Unusually high volume (${pick.RelativeVolume.toFixed(1)}x average) suggests institutional interest`
    });
  }

  return reasoning;
}

// Technical indicator calculation functions (simplified versions)
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

function determineTrend(candles: Candle[], lookback: number): 'up' | 'down' | 'sideways' {
  if (candles.length < lookback) return 'sideways';
  
  const slice = candles.slice(-lookback);
  const firstClose = slice[0].c;
  const lastClose = slice[slice.length - 1].c;
  
  const change = (lastClose - firstClose) / firstClose;
  
  if (change > 0.05) return 'up';
  if (change < -0.05) return 'down';
  return 'sideways';
}

function calculateSMAForDisplay(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const closes = candles.map(c => c.c);
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      result.push(slice.reduce((sum, val) => sum + val, 0) / period);
    }
  }
  
  return result;
}

function calculateRSIForDisplay(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const closes = candles.map(c => c.c);
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      result.push(null);
    } else {
      let gains = 0;
      let losses = 0;
      
      for (let j = i - period + 1; j <= i; j++) {
        const change = closes[j] - closes[j - 1];
        if (change > 0) gains += change;
        else losses -= change;
      }
      
      const avgGain = gains / period;
      const avgLoss = losses / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
  }
  
  return result;
}

// Utility functions
function getSetupReasonColor(reason: string): string {
  switch (reason) {
    case 'Breakout': return '#28a745';
    case 'Momentum': return '#007bff';
    case 'Pullback': return '#ffc107';
    case 'Fib Pullback': return '#fd7e14';
    case 'Consolidation': return '#6c757d';
    case 'Reversal': return '#dc3545';
    // Leo methodology colors
    case 'Reversal_Accumulation': return '#17a2b8';
    case 'Reversal_Distribution': return '#e83e8c';
    case 'BB_Lower_Bounce': return '#20c997';
    case 'BB_Upper_Reject': return '#fd7e14';
    case 'Stoch_Oversold_Reversal': return '#6f42c1';
    case 'Stoch_Overbought_Reversal': return '#e83e8c';
    default: return '#6c757d';
  }
}

function formatMarketCap(value: number | null): string {
  if (value === null) return 'N/A';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function formatVolume(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
}

function getTrendEmoji(trend: string): string {
  switch (trend) {
    case 'up': return '📈';
    case 'down': return '📉';
    case 'sideways': return '➡️';
    default: return '❓';
  }
}