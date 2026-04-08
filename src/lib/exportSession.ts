import type { SessionStats } from '../types/attention'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatDate(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}_${pad2(d.getHours())}-${pad2(d.getMinutes())}-${pad2(d.getSeconds())}`
}

export function exportSessionCSV(stats: SessionStats) {
  if (!stats.startTime || stats.timeline.length === 0) return

  const rows: string[] = [
    'seconds,timestamp,attentive,total,attentive_pct',
  ]

  const startTs = stats.startTime
  stats.timeline.forEach((entry, i) => {
    const pct = entry.totalCount > 0
      ? Math.round((entry.workingCount / entry.totalCount) * 100)
      : 0
    const iso = new Date(entry.timestamp).toISOString()
    rows.push(`${i + 1},${iso},${entry.workingCount},${entry.totalCount},${pct}`)
  })

  rows.push('')
  rows.push('# Session summary')
  rows.push(`start,${new Date(startTs).toISOString()}`)
  rows.push(`duration_seconds,${stats.elapsed}`)
  rows.push(`total_samples,${stats.totalSamples}`)

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `session_${formatDate(startTs)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
