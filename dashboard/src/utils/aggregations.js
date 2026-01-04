export function aggregateMonthly(trades) {
  // returns [{month: '2024-01', pnl: 100, trades: 2}, ...]
  const map = {}
  trades.forEach(t => {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map[key]) map[key] = { month: key, pnl: 0, trades: 0 }
    map[key].pnl += t.pnl
    map[key].trades += 1
  })
  return Object.values(map).sort((a,b)=>a.month.localeCompare(b.month))
}

export function aggregateYearly(trades) {
  // returns [{year: 2023, cumulativePnl: 50}, ...]
  const map = {}
  trades.forEach(t => {
    const d = new Date(t.date)
    const key = d.getFullYear()
    if (!map[key]) map[key] = { year: key, pnl: 0 }
    map[key].pnl += t.pnl
  })
  const years = Object.values(map).sort((a,b)=>a.year - b.year)
  // cumulative
  let cum = 0
  return years.map(y => {
    cum += y.pnl
    return { year: y.year, cumulativePnl: cum }
  })
}

export function aggregateMonthlyCumulative(trades) {
  // returns [{month: '2024-01', cumulativePnl: 100}, ...]
  const map = {}
  trades.forEach(t => {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map[key]) map[key] = { month: key, pnl: 0 }
    map[key].pnl += t.pnl || 0
  })
  const months = Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
  let cum = 0
  return months.map(m => {
    cum += m.pnl
    return { month: m.month, cumulativePnl: cum }
  })
}

export function computeKPIs(trades) {
  const totalPnl = trades.reduce((s,t)=>s+t.pnl,0)
  const totalMaxRisk = trades.reduce((s, t) => s + (t.maxRisk || 0), 0)
  const tradesCount = trades.length
  const wins = trades.filter(t=>t.pnl>0).length
  const winRate = tradesCount===0?0:wins/tradesCount
  const roi = totalMaxRisk > 0 ? totalPnl / totalMaxRisk : 0
  return { totalPnl, trades: tradesCount, winRate, roi }
}
