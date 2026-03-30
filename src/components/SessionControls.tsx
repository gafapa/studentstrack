import type { SessionStats } from '../types/attention'
import { exportSessionCSV } from '../lib/exportSession'

interface Props {
  isRunning: boolean
  hasStarted: boolean
  stats: SessionStats
  onStart: () => void
  onStop: () => void
  onReset: () => void
}

export function SessionControls({ isRunning, hasStarted, stats, onStart, onStop, onReset }: Props) {
  const canExport = !isRunning && hasStarted && stats.timeline.length > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {!isRunning ? (
          <button
            onClick={onStart}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
          >
            {hasStarted ? '▶ Continuar' : '▶ Iniciar sesión'}
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
          >
            ⏸ Pausar
          </button>
        )}
        <button
          onClick={onReset}
          disabled={!hasStarted}
          className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
        >
          ↺ Reiniciar
        </button>
      </div>

      {canExport && (
        <button
          onClick={() => exportSessionCSV(stats)}
          className="w-full bg-blue-700 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          ⬇ Exportar sesión CSV
        </button>
      )}
    </div>
  )
}
