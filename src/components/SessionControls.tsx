import type { SessionStats } from '../types/attention'
import { exportSessionCSV } from '../lib/exportSession'
import type { Locale } from '../lib/i18n'

interface Copy {
  startSession: string
  resume: string
  pause: string
  reset: string
  stopCamera: string
  exportSessionCsv: string
}

interface Props {
  isRunning: boolean
  hasStarted: boolean
  stats: SessionStats
  copy: Copy
  locale: Locale
  onStart: () => void
  onStop: () => void
  onReset: () => void
  onStopCamera: () => void
}

export function SessionControls({
  isRunning,
  hasStarted,
  stats,
  copy,
  locale,
  onStart,
  onStop,
  onReset,
  onStopCamera,
}: Props) {
  const canExport = !isRunning && hasStarted && stats.timeline.length > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {!isRunning ? (
          <button
            onClick={onStart}
            className="flex-1 bg-green-600 hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
          >
            {hasStarted ? copy.resume : copy.startSession}
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex-1 bg-yellow-600 hover:bg-yellow-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
          >
            {copy.pause}
          </button>
        )}
        <button
          onClick={onReset}
          disabled={!hasStarted}
          className="bg-gray-700 hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
        >
          {copy.reset}
        </button>
      </div>

      <button
        onClick={onStopCamera}
        className="w-full bg-gray-800 hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
      >
        {copy.stopCamera}
      </button>

      {canExport && (
        <button
          onClick={() => exportSessionCSV(stats, copy, locale)}
          className="w-full bg-blue-700 hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          {copy.exportSessionCsv}
        </button>
      )}
    </div>
  )
}
