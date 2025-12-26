import React from 'react';
import { EngineOutput, ClassifiedPick, VolumeShift, BBPosition, CandlestickPattern, PriceTarget } from '../contract';
import { QuoteData, formatPriceChange, getPriceChangeColor } from '../providers/twelveData';

interface ResultsDisplayProps {
  results: EngineOutput;
  onSelectTicker: (ticker: string) => void;
  realTimePrices?: Record<string, QuoteData>;
  leoModeEnabled?: boolean;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  results,
  onSelectTicker,
  realTimePrices = {},
  leoModeEnabled = false
}) => {
  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatMarketCap = (value: number | null) => {
    if (value === null) return 'N/A';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return formatCurrency(value);
  };

  const formatNumber = (value: number | null, decimals: number = 2) => {
    if (value === null) return 'N/A';
    return value.toFixed(decimals);
  };

  const formatVolume = (value: number) => {
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const getTrendEmoji = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'sideways': return '➡️';
      default: return '❓';
    }
  };

  const getSetupReasonColor = (reason: string) => {
    switch (reason) {
      case 'Breakout': return '#28a745';
      case 'Momentum': return '#007bff';
      case 'Pullback': return '#ffc107';
      case 'Fib Pullback': return '#fd7e14';
      case 'Consolidation': return '#6c757d';
      case 'Reversal': return '#dc3545';
      // Leo methodology colors
      case 'Reversal_Accumulation': return '#17a2b8';  // cyan
      case 'Reversal_Distribution': return '#e83e8c';  // pink
      case 'BB_Lower_Bounce': return '#20c997';        // teal
      case 'BB_Upper_Reject': return '#fd7e14';        // orange
      case 'Stoch_Oversold_Reversal': return '#6f42c1'; // purple
      case 'Stoch_Overbought_Reversal': return '#e83e8c'; // pink
      default: return '#6c757d';
    }
  };

  const getVolumeShiftColor = (shift: VolumeShift | null | undefined) => {
    switch (shift) {
      case 'buyer': return '#28a745';  // green
      case 'seller': return '#dc3545'; // red
      case 'neutral': return '#6c757d'; // gray
      default: return '#6c757d';
    }
  };

  const getBBPositionDisplay = (position: BBPosition | null | undefined) => {
    switch (position) {
      case 'lower_bounce': return { text: 'Lower', color: '#28a745' };
      case 'upper_reject': return { text: 'Upper', color: '#dc3545' };
      case 'middle': return { text: 'Middle', color: '#6c757d' };
      default: return { text: '-', color: '#6c757d' };
    }
  };

  const formatPattern = (pattern: CandlestickPattern | null | undefined) => {
    if (!pattern || pattern === 'none') return '-';
    return pattern.replace(/_/g, ' ');
  };

  const formatTargets = (targets: PriceTarget[] | null | undefined) => {
    if (!targets || targets.length === 0) return '-';
    return targets.slice(0, 2).map(t => `$${t.price.toFixed(2)}`).join(', ');
  };

  const groupedResults = results.picks.reduce((groups, pick) => {
    const reason = pick.SelectionReason;
    if (!groups[reason]) {
      groups[reason] = [];
    }
    groups[reason].push(pick);
    return groups;
  }, {} as Record<string, ClassifiedPick[]>);

  return (
    <div className="results-display">
      <div className="results-header">
        <h3>Screening Results</h3>
        <div className="results-meta">
          <span className="results-count">{results.picks.length} stocks found</span>
          <span className="results-date">As of: {results.as_of_date}</span>
        </div>
      </div>

      {results.picks.length === 0 ? (
        <div className="no-results-message">
          <p>No stocks match your screening criteria. Try adjusting your parameters.</p>
        </div>
      ) : (
        <div className="results-content">
          {Object.entries(groupedResults).map(([reason, picks]) => (
            <div key={reason} className="setup-group">
              <h4 className="setup-reason" style={{ color: getSetupReasonColor(reason) }}>
                {reason} ({picks.length})
              </h4>
              
              <div className="results-table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>Company</th>
                      <th>Price</th>
                      <th>Change</th>
                      <th>Market Cap</th>
                      <th>Volume</th>
                      <th>Rel Vol</th>
                      <th>RSI</th>
                      <th>Trend</th>
                      {leoModeEnabled && (
                        <>
                          <th>Pattern</th>
                          <th>Vol Shift</th>
                          <th>BB</th>
                          <th>Entry</th>
                          <th>Targets</th>
                        </>
                      )}
                      <th>Sector</th>
                      <th>Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {picks.map((pick, index) => {
                      const realTimeQuote = realTimePrices[pick.Ticker];
                      const hasRealTimeData = !!realTimeQuote;
                      const displayPrice = hasRealTimeData ? realTimeQuote.price : pick.Price;
                      const displayVolume = hasRealTimeData ? realTimeQuote.volume : pick.Volume;
                      
                      return (
                        <tr
                          key={`${pick.Ticker}-${index}`}
                          className="result-row clickable-row"
                          onClick={() => onSelectTicker(pick.Ticker)}
                          title="Click to view detailed analysis"
                        >
                          <td className="ticker-cell">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <strong>{pick.Ticker}</strong>
                              {hasRealTimeData && (
                                <span style={{
                                  fontSize: '10px',
                                  color: realTimeQuote.is_market_open ? '#28a745' : '#6c757d'
                                }}>
                                  {realTimeQuote.is_market_open ? '🟢' : '🔴'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="company-cell" title={pick.Company || 'N/A'}>
                            {pick.Company ?
                              (pick.Company.length > 20 ?
                                `${pick.Company.substring(0, 20)}...` :
                                pick.Company
                              ) : 'N/A'
                            }
                          </td>
                          <td className="price-cell">
                            <div>
                              <div style={{ fontWeight: hasRealTimeData ? 'bold' : 'normal' }}>
                                {formatCurrency(displayPrice)}
                              </div>
                              {hasRealTimeData && (
                                <div style={{ fontSize: '10px', color: '#6c757d' }}>
                                  Sample: {formatCurrency(pick.Price)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="change-cell">
                            {hasRealTimeData ? (
                              <div style={{
                                color: getPriceChangeColor(realTimeQuote.change),
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}>
                                {formatPriceChange(realTimeQuote.change, realTimeQuote.percent_change)}
                              </div>
                            ) : (
                              <span style={{ color: '#6c757d', fontSize: '12px' }}>-</span>
                            )}
                          </td>
                          <td className="market-cap-cell">
                            {formatMarketCap(pick.MarketCap)}
                          </td>
                          <td className="volume-cell">
                            <div>
                              <div style={{ fontWeight: hasRealTimeData ? 'bold' : 'normal' }}>
                                {formatVolume(displayVolume)}
                              </div>
                              {hasRealTimeData && (
                                <div style={{ fontSize: '10px', color: '#6c757d' }}>
                                  Sample: {formatVolume(pick.Volume)}
                                </div>
                              )}
                            </div>
                          </td>
                        <td className="rel-vol-cell">
                          <span className={pick.RelativeVolume > 2 ? 'high-volume' : ''}>
                            {formatNumber(pick.RelativeVolume, 1)}x
                          </span>
                        </td>
                        <td className="rsi-cell">
                          <span className={
                            pick.RSI > 70 ? 'overbought' : 
                            pick.RSI < 30 ? 'oversold' : ''
                          }>
                            {formatNumber(pick.RSI, 0)}
                          </span>
                        </td>
                        <td className="trend-cell">
                          <span className={`trend-${pick.Trend}`}>
                            {getTrendEmoji(pick.Trend)} {pick.Trend}
                          </span>
                        </td>
                        {leoModeEnabled && (
                          <>
                            <td className="pattern-cell">
                              <span style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                                {formatPattern(pick.CandlestickPattern)}
                              </span>
                            </td>
                            <td className="volume-shift-cell">
                              <span style={{
                                color: getVolumeShiftColor(pick.VolumeShift),
                                fontWeight: pick.VolumeShift !== 'neutral' ? 'bold' : 'normal'
                              }}>
                                {pick.VolumeShift || '-'}
                                {pick.VolumeShiftStrength && pick.VolumeShiftStrength > 50 && ' ⚡'}
                              </span>
                            </td>
                            <td className="bb-cell">
                              {(() => {
                                const bb = getBBPositionDisplay(pick.BBPosition);
                                return (
                                  <span style={{ color: bb.color, fontSize: '11px' }}>
                                    {bb.text}
                                    {pick.BBPercentB != null && ` (${(pick.BBPercentB * 100).toFixed(0)}%)`}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="entry-cell">
                              <span style={{
                                color: pick.EntryConfirmed ? '#28a745' : '#ffc107',
                                fontWeight: 'bold'
                              }}>
                                {pick.EntryConfirmed ? '✓' : '⏳'}
                              </span>
                            </td>
                            <td className="targets-cell" style={{ fontSize: '11px' }}>
                              {formatTargets(pick.PriceTargets)}
                            </td>
                          </>
                        )}
                        <td className="sector-cell" title={pick.Sector || 'N/A'}>
                          {pick.Sector ? 
                            (pick.Sector.length > 15 ? 
                              `${pick.Sector.substring(0, 15)}...` : 
                              pick.Sector
                            ) : 'N/A'
                          }
                        </td>
                        <td className="earnings-cell">
                          {pick.NextEarningsDate ? (
                            <span style={{
                              color: pick.EarningsWarning ? '#ffc107' : 'inherit',
                              fontWeight: pick.EarningsWarning ? 'bold' : 'normal'
                            }}>
                              {pick.EarningsWarning && '⚠️ '}
                              {pick.NextEarningsDate}
                            </span>
                          ) : 'N/A'}
                        </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="results-footer">
        <div className="legend">
          <h5>Legend:</h5>
          <div className="legend-items">
            <span className="legend-item">
              <span className="legend-color high-volume"></span>
              High Relative Volume ({'>'}2x)
            </span>
            <span className="legend-item">
              <span className="legend-color overbought"></span>
              Overbought RSI ({'>'}70)
            </span>
            <span className="legend-item">
              <span className="legend-color oversold"></span>
              Oversold RSI ({'<'}30)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};