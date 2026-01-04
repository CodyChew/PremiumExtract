import Papa from 'papaparse'

const CANDIDATES = [
  '/docs/PremiumExtract Strategy.csv',
  '/docs/PremiumExtract%20Strategy.csv',
]

function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map(cell => (cell || '').toString().trim().toLowerCase())
    if (row.includes('date placed') || row.includes('date placed'.toLowerCase()) || row.includes('date')) {
      // very likely the header
      return i
    }
    if (row.includes('ticker') && row.includes('p&l')) return i
  }
  return -1
}

function normalizeRow(rawRow, headerMap) {
  const obj = {}
  for (const key in headerMap) {
    obj[key] = rawRow[headerMap[key]] !== undefined ? rawRow[headerMap[key]] : ''
  }

  // Map to app fields — use EXIT DATE as primary date
  const mapped = {
    date: obj['Exit Date'] || obj['exit date'] || obj['date'] || obj['Date'] || '',
    dateOpened: obj['Date placed'] || obj['date placed'] || '',
    symbol: obj['Ticker'] || obj['ticker'] || '',
    quantity: obj['contracts'] ? Number(obj['contracts']) : undefined,
    pnl: obj['P&L'] !== undefined ? Number(obj['P&L']) : obj['PnL'] !== undefined ? Number(obj['PnL']) : undefined,
    maxRisk: obj['Max risk'] ? Number(obj['Max risk']) : obj['Max Risk'] ? Number(obj['Max Risk']) : undefined,
    strategy: obj['strategy type'] || obj['Strategy'] || obj['strategy'] || '',
    raw: obj,
  }

  // basic data-quality checks and compute ROI
  const issues = []
  if (mapped.pnl === undefined || Number.isNaN(mapped.pnl)) issues.push('Missing PnL')
  if (mapped.maxRisk === undefined || mapped.maxRisk === 0 || Number.isNaN(mapped.maxRisk)) issues.push('Missing Max risk')

  if (issues.length === 0) {
    mapped.roi = (mapped.pnl / mapped.maxRisk) * 100
  } else {
    mapped.roi = undefined
  }

  mapped.issues = issues

  // Parse exit date to YYYY-MM-DD
  if (mapped.date) {
    const parsed = new Date(mapped.date)
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear()
      const m = String(parsed.getMonth() + 1).padStart(2, '0')
      const d = String(parsed.getDate()).padStart(2, '0')
      mapped.date = `${y}-${m}-${d}`
    }
  }

  // Parse open date too
  if (mapped.dateOpened) {
    const parsed = new Date(mapped.dateOpened)
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear()
      const m = String(parsed.getMonth() + 1).padStart(2, '0')
      const d = String(parsed.getDate()).padStart(2, '0')
      mapped.dateOpened = `${y}-${m}-${d}`
    }
  }

  return mapped
}

export async function loadLocalCsv() {
  // Try known candidate paths
  for (const path of CANDIDATES) {
    try {
      const res = await fetch(path)
      if (!res.ok) continue
      const text = await res.text()
      const parsed = Papa.parse(text, { skipEmptyLines: true, dynamicTyping: false })
      const rows = parsed.data

      if (!rows || !rows.length) throw new Error('Empty CSV')

      const headerIdx = findHeaderRow(rows)
      if (headerIdx === -1) {
        // fallback to first non-empty row as header
        if (rows.length < 2) throw new Error('No header row found')
        const headerRow = rows[0]
        const headers = headerRow.map(h => (h || '').toString().trim())
        const headerMap = {}
        headers.forEach((h, i) => (headerMap[h] = i))
        const dataRows = rows.slice(1)
        return dataRows.map(r => normalizeRow(r, headerMap)).filter(r => (r.symbol || r.date))
      }

      const headerRow = rows[headerIdx]
      const headers = headerRow.map(h => (h || '').toString().trim())
      const headerMap = {}
      headers.forEach((h, i) => (headerMap[h] = i))
      const dataRows = rows.slice(headerIdx + 1)
      return dataRows.map(r => normalizeRow(r, headerMap)).filter(r => (r.symbol || r.date))
    } catch (err) {
      // try next
      // console.warn('Failed to load CSV at', path, err)
    }
  }
  throw new Error('No local CSV found in /docs')
}
