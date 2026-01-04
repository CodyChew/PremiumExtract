import React, { useMemo, useState } from 'react'

export default function StrategyByMonthCalendar({ data }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Default to most recent month with data
    if (!data || data.length === 0) return new Date().toISOString().slice(0, 7)
    const months = data
      .map(t => t.date?.slice(0, 7))
      .filter(Boolean)
      .sort()
    return months[months.length - 1] || new Date().toISOString().slice(0, 7)
  })

  // Get all unique months
  const allMonths = useMemo(() => {
    if (!data || data.length === 0) return []
    const months = data
      .map(t => t.date?.slice(0, 7))
      .filter(Boolean)
    return [...new Set(months)].sort().reverse() // newest first
  }, [data])

  // Get stats for selected month grouped by strategy
  const monthStats = useMemo(() => {
    if (!data || data.length === 0) return []

    const monthData = data.filter(t => t.date?.slice(0, 7) === selectedMonth)
    if (monthData.length === 0) return []

    const strategyMap = {}
    monthData.forEach(trade => {
      const strategy = (trade.strategy || 'Unknown').trim()
      if (!strategyMap[strategy]) {
        strategyMap[strategy] = {
          strategy,
          trades: [],
        }
      }
      strategyMap[strategy].trades.push(trade)
    })

    return Object.values(strategyMap)
      .map(s => {
        const trades = s.trades
        const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0)
        const winners = trades.filter(t => t.pnl > 0).length
        const losers = trades.filter(t => t.pnl < 0).length
        const winRate = trades.length > 0 ? (winners / trades.length) * 100 : 0
        const avgPnl = trades.length > 0 ? totalPnl / trades.length : 0

        return {
          strategy: s.strategy,
          trades: trades.length,
          totalPnl,
          winRate,
          avgPnl,
          winners,
          losers,
        }
      })
      .sort((a, b) => b.totalPnl - a.totalPnl)
  }, [data, selectedMonth])

  const monthTrades = useMemo(() => {
    if (!data || data.length === 0) return []
    return data
      .filter(t => t.date?.slice(0, 7) === selectedMonth)
      .slice()
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  }, [data, selectedMonth])

  const totalMonthPnl = monthStats.reduce((sum, s) => sum + s.totalPnl, 0)
  const totalMonthTrades = monthStats.reduce((sum, s) => sum + s.trades, 0)
  const totalWinners = monthStats.reduce((sum, s) => sum + s.winners, 0)
  const monthWinRate = totalMonthTrades > 0 ? (totalWinners / totalMonthTrades) * 100 : 0

  return (
    <div className="strategy-by-month-calendar">
      <div className="month-selector">
        <h2>Monthly Performance by Strategy</h2>
        <div className="month-buttons">
          {allMonths.map(month => {
            const monthDate = new Date(month + '-01')
            const monthLabel = monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
            return (
              <button
                key={month}
                className={`month-btn ${selectedMonth === month ? 'active' : ''}`}
                onClick={() => setSelectedMonth(month)}
                title={monthLabel}
              >
                {monthLabel}
              </button>
            )
          })}
        </div>
      </div>

      <div className="month-header">
        <h2>{new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</h2>
      </div>

      <div className="month-stats-summary">
        <div className="summary-card total-trades">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <div className="summary-label">Total Trades</div>
            <div className="summary-value">{totalMonthTrades}</div>
          </div>
        </div>
        <div className={`summary-card total-pnl ${totalMonthPnl >= 0 ? 'positive' : 'negative'}`}>
          <div className="summary-icon">{totalMonthPnl >= 0 ? '📈' : '📉'}</div>
          <div className="summary-content">
            <div className="summary-label">Total P&L</div>
            <div className="summary-value">${totalMonthPnl.toFixed(2)}</div>
          </div>
        </div>
        <div className="summary-card win-rate">
          <div className="summary-icon">🎯</div>
          <div className="summary-content">
            <div className="summary-label">Win Rate</div>
            <div className="summary-value">{monthWinRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div className="strategy-breakdown">
        {monthStats.length === 0 ? (
          <div className="no-data">📭 No trades closed in this month</div>
        ) : (
          <div className="strategy-cards">
            {monthStats.map((s, i) => (
              <div key={i} className={`strategy-card ${s.totalPnl >= 0 ? 'profitable' : 'losing'}`}>
                <div className="strategy-card-header">
                  <div className="strategy-title">
                    <h4>{s.strategy}</h4>
                  </div>
                  <div className={`strategy-badge ${s.totalPnl >= 0 ? 'positive' : 'negative'}`}>
                    ${s.totalPnl.toFixed(2)}
                  </div>
                </div>
                
                <div className="strategy-progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(s.winRate, 100)}%` }}></div>
                </div>

                <div className="strategy-card-stats">
                  <div className="stat-group">
                    <div className="stat-item">
                      <span className="stat-label">Trades</span>
                      <span className="stat-value">{s.trades}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Win Rate</span>
                      <span className="stat-value">{s.winRate.toFixed(0)}%</span>
                    </div>
                  </div>
                  
                  <div className="stat-group">
                    <div className="stat-item winners">
                      <span className="stat-label">✓ Wins</span>
                      <span className="stat-value">{s.winners}</span>
                    </div>
                    <div className="stat-item losers">
                      <span className="stat-label">✗ Losses</span>
                      <span className="stat-value">{s.losers}</span>
                    </div>
                  </div>

                  <div className="stat-group">
                    <div className="stat-item avg">
                      <span className="stat-label">Avg P&L</span>
                      <span className={`stat-value ${s.avgPnl >= 0 ? 'positive' : 'negative'}`}>
                        ${s.avgPnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="month-trades">
        <h3>Trades for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</h3>
        {monthTrades.length === 0 ? (
          <div className="no-data">No trades for this month.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Exit Date</th>
                <th>Symbol</th>
                <th>Strategy</th>
                <th>P&L</th>
                <th>ROI</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {monthTrades.map((t, i) => (
                <tr key={i}>
                  <td>{t.date}</td>
                  <td>{t.symbol}</td>
                  <td>{t.strategy}</td>
                  <td className={t.pnl >= 0 ? 'positive' : 'negative'}>${(t.pnl || 0).toFixed(2)}</td>
                  <td className={t.roi !== undefined ? (t.roi >= 0 ? 'positive' : 'negative') : ''}>
                    {t.roi !== undefined ? `${t.roi.toFixed(2)}%` : 'N/A'}
                  </td>
                  <td className="notes">{t.issues && t.issues.length ? t.issues.join('; ') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
