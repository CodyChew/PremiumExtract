import React, { useMemo, useEffect, useState } from 'react'
import sampleData from './data/sample_data.json'
import { aggregateMonthly, aggregateMonthlyCumulative, computeKPIs } from './utils/aggregations'
import MonthlyBarChart from './components/MonthlyBarChart'
import YearlyLineChart from './components/YearlyLineChart'
import StrategyStats from './components/StrategyStats'

const SHEET_ID = import.meta.env.VITE_SHEET_ID || ''
const SHEET_GID = import.meta.env.VITE_SHEET_GID || '0' 

export default function App() {
  const [rows, setRows] = useState(sampleData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [scope, setScope] = useState('all')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    // Prefer VITE_SHEET_ID if set, fallback to local CSV in /docs
    if (SHEET_ID) {
      import('./utils/fetchSheet')
        .then(m => m.fetchSheetAsJson(SHEET_ID, SHEET_GID))
        .then(data => {
          if (cancelled) return
          console.log('Loaded from Google Sheet:', data.slice(0, 3))
          setRows(data)
          setLoading(false)
        })
        .catch(err => {
          // fallback to local CSV
          import('./utils/loadCsv')
            .then(m => m.loadLocalCsv())
            .then(data => {
              if (cancelled) return
              setRows(data)
              setLoading(false)
            })
            .catch(err2 => {
              if (cancelled) return
              console.error('Failed to load data from sheet or CSV', err2)
              setError(err2.message)
              setLoading(false)
            })
        })
    } else {
      // No sheet ID, try local CSV
      import('./utils/loadCsv')
        .then(m => m.loadLocalCsv())
        .then(data => {
          if (cancelled) return
          setRows(data)
          setLoading(false)
        })
        .catch(err => {
          if (cancelled) return
          console.error('Failed to load CSV', err)
          setError(err.message)
          setLoading(false)
        })
    }

    return () => {
      cancelled = true
    }
  }, [])

  const years = useMemo(() => {
    if (!rows || rows.length === 0) return []
    const allYears = rows
      .map(t => t.date?.slice(0, 4))
      .filter(Boolean)
    return [...new Set(allYears)].sort()
  }, [rows])

  const monthsForYear = useMemo(() => {
    if (!rows || rows.length === 0 || !selectedYear) return []
    const months = rows
      .map(t => t.date?.slice(0, 7))
      .filter(m => m && m.startsWith(selectedYear))
    return [...new Set(months)].sort().reverse()
  }, [rows, selectedYear])

  const yearPnlMap = useMemo(() => {
    const map = {}
    rows.forEach(t => {
      const year = t.date?.slice(0, 4)
      if (!year) return
      map[year] = (map[year] || 0) + (t.pnl || 0)
    })
    return map
  }, [rows])

  const monthPnlMap = useMemo(() => {
    const map = {}
    rows.forEach(t => {
      const month = t.date?.slice(0, 7)
      if (!month) return
      map[month] = (map[month] || 0) + (t.pnl || 0)
    })
    return map
  }, [rows])

  useEffect(() => {
    if (years.length === 0) return
    if (!selectedYear || !years.includes(selectedYear)) {
      setSelectedYear(years[years.length - 1])
    }
  }, [years, selectedYear])

  useEffect(() => {
    if (monthsForYear.length === 0) return
    if (!selectedMonth || !monthsForYear.includes(selectedMonth)) {
      setSelectedMonth(monthsForYear[0])
    }
  }, [monthsForYear, selectedMonth])

  const filteredRows = useMemo(() => {
    if (!rows || rows.length === 0) return []
    if (scope === 'year' && selectedYear) {
      return rows.filter(t => t.date?.startsWith(selectedYear))
    }
    if (scope === 'month' && selectedMonth) {
      return rows.filter(t => t.date?.slice(0, 7) === selectedMonth)
    }
    return rows
  }, [rows, scope, selectedYear, selectedMonth])

  const monthStrategyStats = useMemo(() => {
    if (scope !== 'month' || !filteredRows.length) return []
    const strategyMap = {}
    filteredRows.forEach(trade => {
      const strategy = (trade.strategy || 'Unknown').trim()
      if (!strategyMap[strategy]) {
        strategyMap[strategy] = { strategy, trades: [], totalPnl: 0 }
      }
      strategyMap[strategy].trades.push(trade)
      strategyMap[strategy].totalPnl += trade.pnl || 0
    })

    return Object.values(strategyMap)
      .map(s => {
        const wins = s.trades.filter(t => t.pnl > 0).length
        const winRate = s.trades.length ? (wins / s.trades.length) * 100 : 0
        const avgPnl = s.trades.length ? s.totalPnl / s.trades.length : 0
        return {
          strategy: s.strategy,
          trades: s.trades.length,
          totalPnl: s.totalPnl,
          winRate,
          avgPnl,
          winners: wins,
          losers: s.trades.length - wins,
        }
      })
      .sort((a, b) => b.totalPnl - a.totalPnl)
  }, [filteredRows, scope])

  const monthly = useMemo(() => aggregateMonthly(filteredRows), [filteredRows])
  const monthlyCumulative = useMemo(() => aggregateMonthlyCumulative(filteredRows), [filteredRows])
  const kpis = useMemo(() => computeKPIs(filteredRows), [filteredRows])

  const formatPnl = value => {
    const v = Number(value) || 0
    const sign = v > 0 ? '+' : ''
    return `${sign}$${v.toFixed(0)}`
  }

  const issueRows = useMemo(() => rows.filter(r => r.issues && r.issues.length), [rows])
  const issueCount = issueRows.length

  return (
    <div className="app">
      <header className="header">
        <h1>Trading Dashboard</h1>
        <div className="tabs">
          <button
            className={`tab ${tab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`tab ${tab === 'strategy-stats' ? 'active' : ''}`}
            onClick={() => setTab('strategy-stats')}
          >
            Strategy Stats
          </button>
        </div>
      </header>

      <section className="premium-banner">
        <div className="premium-banner__content">
          <div className="premium-banner__title">Welcome to PremiumExtract</div>
          <div className="premium-banner__subtitle">
            Risk-controlled swing trading focused on Put Credit Spreads, Call Credit Spreads, and Iron Condors to capture premium over time.
          </div>
        </div>
      </section>

      {SHEET_ID && (
        <div className="notice">
          Loading data from Google Sheet: <code>{SHEET_ID}</code>
        </div>
      )}

      {loading && (
        <div className="notice">Loading data…</div>
      )}

      {error && (
        <div className="notice error">Failed to load data: {error}</div>
      )}

      {issueCount > 0 && (
        <div className="notice warning">⚠️ {issueCount} rows contain data issues — see Notes column</div>
      )}

      {tab === 'dashboard' && (
        <>
          <section className="filter-bar">
            <div className="filter-group">
              <div className="filter-label">Scope</div>
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${scope === 'all' ? 'active' : ''}`}
                  onClick={() => setScope('all')}
                >
                  All
                </button>
                <button
                  className={`filter-btn ${scope === 'year' ? 'active' : ''}`}
                  onClick={() => setScope('year')}
                >
                  Year
                </button>
                <button
                  className={`filter-btn ${scope === 'month' ? 'active' : ''}`}
                  onClick={() => setScope('month')}
                >
                  Month
                </button>
              </div>
            </div>
            {scope === 'year' && (
              <div className="filter-group">
                <div className="filter-label">Year</div>
                <div className="filter-buttons year-buttons">
                  {years.map(y => (
                    <button
                      key={y}
                      className={`filter-btn ${selectedYear === y ? 'active' : ''}`}
                      onClick={() => setSelectedYear(y)}
                    >
                      <span>{y}</span>
                      <span className={`pnl-badge ${yearPnlMap[y] >= 0 ? 'positive' : 'negative'}`}>
                        {formatPnl(yearPnlMap[y])}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {scope === 'month' && (
              <div className="filter-group month-filter">
                <div className="filter-group">
                  <div className="filter-label">Year</div>
                  <div className="filter-buttons year-buttons">
                    {years.map(y => (
                      <button
                        key={y}
                        className={`filter-btn ${selectedYear === y ? 'active' : ''}`}
                        onClick={() => setSelectedYear(y)}
                      >
                        <span>{y}</span>
                        <span className={`pnl-badge ${yearPnlMap[y] >= 0 ? 'positive' : 'negative'}`}>
                          {formatPnl(yearPnlMap[y])}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="filter-group month-buttons">
                  {monthsForYear.map(month => {
                    const monthDate = new Date(month + '-01')
                    const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short' })
                    const monthPnl = monthPnlMap[month] || 0
                    return (
                      <button
                        key={month}
                        className={`month-btn ${selectedMonth === month ? 'active' : ''}`}
                        onClick={() => setSelectedMonth(month)}
                        title={monthLabel}
                      >
                        <span>{monthLabel}</span>
                        <span className={`pnl-badge ${monthPnl >= 0 ? 'positive' : 'negative'}`}>
                          {formatPnl(monthPnl)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="kpis">
            <div className="kpi">
              <div className="kpi-label">Total P&L</div>
              <div className="kpi-value">${kpis.totalPnl.toFixed(2)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Trades</div>
              <div className="kpi-value">{kpis.trades}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Win Rate</div>
              <div className="kpi-value">{(kpis.winRate * 100).toFixed(1)}%</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">ROI</div>
              <div className="kpi-value">{(kpis.roi * 100).toFixed(1)}%</div>
            </div>
          </section>

          {scope === 'month' ? (
            <section className="strategy-breakdown">
              <h3>
                Strategy Breakdown for{' '}
                {selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Selected Month'}
              </h3>
              {monthStrategyStats.length === 0 ? (
                <div className="no-data">No trades in this month.</div>
              ) : (
                <div className="strategy-cards">
                  {monthStrategyStats.map((s, i) => (
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
                            <span className="stat-label">Wins</span>
                            <span className="stat-value">{s.winners}</span>
                          </div>
                          <div className="stat-item losers">
                            <span className="stat-label">Losses</span>
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
            </section>
          ) : (
            <section className="charts">
              <div className="chart-card">
                <h3>Monthly P&L</h3>
                <MonthlyBarChart data={monthly} />
              </div>
              <div className="chart-card">
                <h3>Cumulative P&L by Month</h3>
                <YearlyLineChart data={monthlyCumulative} />
              </div>
            </section>
          )}

          <section className="trades">
            <h3>Trades</h3>
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
                {filteredRows.slice().reverse().map((t, i) => (
                  <tr key={i}>
                    <td>{t.date}</td>
                    <td>{t.symbol}</td>
                    <td>{t.strategy}</td>
                    <td className={t.pnl >= 0 ? 'positive' : 'negative'}>${(t.pnl || 0).toFixed(2)}</td>
                    <td className={t.roi !== undefined ? (t.roi >= 0 ? 'positive' : 'negative') : ''}>
                      {t.roi !== undefined ? `${t.roi.toFixed(2)}%` : '—'}
                    </td>
                    <td className="notes">{t.issues && t.issues.length ? t.issues.join('; ') : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {tab === 'strategy-stats' && (
        <section className="strategy-stats-section">
          <h2>Strategy Performance</h2>
          <StrategyStats data={rows} />
        </section>
      )}
    </div>
  )
}
