import type { SessionStats } from '../types/attention'
import { AttentionState } from '../types/attention'
import { STATE_COLORS } from '../constants/thresholds'

interface Props {
  stats: SessionStats
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function ClassSummary({ stats }: Props) {
  const detected = stats.currentStudents.length
  const attentive = stats.currentStudents.filter(
    (s) => s.state === AttentionState.Working || s.state === AttentionState.Watching
  ).length
  const distracted = stats.currentStudents.filter((s) => s.state === AttentionState.Distracted).length
  const absent = stats.currentStudents.filter((s) => s.state === AttentionState.Absent).length

  const pct = (n: number) => (detected > 0 ? Math.round((n / detected) * 100) : 0)

  const green = STATE_COLORS[AttentionState.Working]
  const red = STATE_COLORS[AttentionState.Distracted]
  const gray = STATE_COLORS[AttentionState.Absent]

  const attentionPct = detected > 0 ? Math.round((attentive / detected) * 100) : 100
  const showAlert = stats.isRunning && detected > 0 && attentionPct < 50

  return (
    <div className="bg-gray-900 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-xs uppercase tracking-wide">Resumen</h2>
        <span className="text-gray-400 text-xs font-mono">{formatTime(stats.elapsed)}</span>
      </div>

      {showAlert && (
        <div className="flex items-center gap-1.5 bg-red-900/50 border border-red-600/60 rounded-lg px-2 py-1.5">
          <span className="text-red-400 text-sm animate-pulse">⚠</span>
          <span className="text-red-300 text-xs font-medium">Solo el {attentionPct}% atiende</span>
        </div>
      )}

      <div className="text-center py-1">
        <span className="text-4xl font-bold text-white">{detected}</span>
        <span className="text-gray-400 text-xs ml-1">alumnos</span>
      </div>

      <div className="space-y-1.5">
        <SummaryRow icon="✓" label="Atentos"    count={attentive}  pct={pct(attentive)}  color={green} />
        <SummaryRow icon="!" label="Distraídos" count={distracted} pct={pct(distracted)} color={red}   />
        <SummaryRow icon="?" label="Ausentes"   count={absent}     pct={pct(absent)}     color={gray}  />
      </div>

      {detected > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden gap-px">
          {attentive  > 0 && <div style={{ flex: attentive,  backgroundColor: green }} />}
          {distracted > 0 && <div style={{ flex: distracted, backgroundColor: red   }} />}
          {absent     > 0 && <div style={{ flex: absent,     backgroundColor: gray  }} />}
        </div>
      )}
    </div>
  )
}

function SummaryRow({ icon, label, count, pct, color }: {
  icon: string; label: string; count: number; pct: number; color: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs w-3 text-center font-bold" style={{ color }}>{icon}</span>
      <span className="text-gray-300 text-xs flex-1">{label}</span>
      <span className="text-white text-xs font-semibold w-5 text-right">{count}</span>
      <span className="text-gray-500 text-xs w-8 text-right">{pct}%</span>
    </div>
  )
}
