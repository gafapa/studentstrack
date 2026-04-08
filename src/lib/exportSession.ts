import type { SessionStats } from '../types/attention'
import { translations, type Locale } from './i18n'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatDate(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}_${pad2(d.getHours())}-${pad2(d.getMinutes())}-${pad2(d.getSeconds())}`
}

export function exportSessionCSV(stats: SessionStats, _copy: { exportSessionCsv: string }, locale: Locale) {
  if (!stats.startTime || stats.timeline.length === 0) return

  const text = translations[locale]
  const rows: string[] = [
    `${text.seconds},${text.timestamp},${text.attentive},${text.sleepy},${text.total},${text.attentivePct},${text.sleepyPct}`,
  ]

  const startTs = stats.startTime
  stats.timeline.forEach((entry, i) => {
    const pct = entry.totalCount > 0
      ? Math.round((entry.workingCount / entry.totalCount) * 100)
      : 0
    const sleepyPct = entry.totalCount > 0
      ? Math.round((entry.sleepyCount / entry.totalCount) * 100)
      : 0
    const iso = new Date(entry.timestamp).toISOString()
    rows.push(`${i + 1},${iso},${entry.workingCount},${entry.sleepyCount},${entry.totalCount},${pct},${sleepyPct}`)
  })

  rows.push('')
  rows.push(text.sessionSummary)
  rows.push(`${text.start},${new Date(startTs).toISOString()}`)
  rows.push(`${text.durationSeconds},${stats.elapsed}`)
  rows.push(`${text.totalSamples},${stats.totalSamples}`)
  rows.push(`${text.sleepySamples},${stats.sleepySamples}`)

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `session_${locale}_${formatDate(startTs)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
