import Papa from 'papaparse'

function parseDate(dateStr) {
  if (!dateStr) return ''
  const parsed = new Date(dateStr)
  if (Number.isNaN(parsed.getTime())) return dateStr
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const d = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map(cell => (cell || '').toString().trim().toLowerCase())
    if (row.includes('date placed') || (row.includes('ticker') && row.includes('p&l'))) {
      return i
    }
  }
  return -1
}

function normalizeRow(rawRow, headerMap) {
  const obj = {}
  for (const key in headerMap) {
    obj[key] = rawRow[headerMap[key]] !== undefined ? rawRow[headerMap[key]] : ''
  }

  const p = (obj['PnL'] || obj['P&L']) !== '' ? Number(obj['PnL'] || obj['P&L']) : undefined
  const m = obj['Max risk'] ? Number(obj['Max risk']) : obj['Max Risk'] ? Number(obj['Max Risk']) : undefined

  const issues = []
  if (p === undefined || Number.isNaN(p)) issues.push('Missing PnL')
  if (m === undefined || m === 0 || Number.isNaN(m)) issues.push('Missing Max risk')

  const roi = issues.length === 0 ? (p / m) * 100 : undefined

  return {
    date: parseDate(obj['Exit Date'] || obj['exit date'] || obj['date'] || ''),
    dateOpened: parseDate(obj['Date placed'] || obj['date placed'] || ''),
    symbol: obj['Ticker'] || obj['ticker'] || '',
    quantity: obj['contracts'] ? Number(obj['contracts']) : undefined,
    pnl: p,
    maxRisk: m,
    strategy: obj['strategy type'] || obj['Strategy'] || obj['strategy'] || '',
    side: obj['Side'] || obj['side'] || '',
    roi,
    issues,
    raw: obj,
  }
}

/**
 * Fetches a public Google Sheet as JSON rows (header row -> keys)
 * @param {string} sheetId - the spreadsheet ID
 * @param {string|number} gid - the sheet gid (defaults to 0)
 * @returns {Promise<Array<Object>>}
 */
export async function fetchSheetAsJson(sheetId, gid = 0) {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
  const res = await fetch(csvUrl)
  if (!res.ok) throw new Error('Failed to fetch sheet')
  const text = await res.text()
  const parsed = Papa.parse(text, { skipEmptyLines: true, dynamicTyping: false })
  const rows = parsed.data

  if (!rows || !rows.length) throw new Error('Empty sheet')

  const headerIdx = findHeaderRow(rows)
  if (headerIdx === -1) {
    throw new Error('Could not find header row in sheet (expected: Date placed, Ticker, P&L, etc.)')
  }

  const headerRow = rows[headerIdx]
  const headers = headerRow.map(h => (h || '').toString().trim())
  const headerMap = {}
  headers.forEach((h, i) => (headerMap[h] = i))

  console.log('Sheet header row detected at index:', headerIdx)
  console.log('Headers found:', headers)
  console.log('First data row raw:', rows[headerIdx + 1])

  const dataRows = rows.slice(headerIdx + 1)
  return dataRows.map(r => normalizeRow(r, headerMap)).filter(r => (r.symbol || r.date))
}
