import { useEffect, useState } from 'react'
import { useWebcam } from './hooks/useWebcam'
import { useFaceLandmarker } from './hooks/useFaceLandmarker'
import { useAttentionSession } from './hooks/useAttentionSession'
import { ClassroomView } from './components/ClassroomView'
import { ClassSummary } from './components/ClassSummary'
import { StudentGrid } from './components/StudentGrid'
import { TimelineChart } from './components/TimelineChart'
import { SessionControls } from './components/SessionControls'
import { THRESHOLDS } from './constants/thresholds'
import { getPluralSuffix, interpolate, localeOptions, translations, type Locale } from './lib/i18n'

export default function App() {
  const { videoRef, isReady, error, startCamera, stopCamera } = useWebcam()
  const { students, isInitializing, initError, startDetection, stopDetection } = useFaceLandmarker()
  const { stats, startSession, stopSession, resetSession } = useAttentionSession(students)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [locale, setLocale] = useState<Locale>('es')
  const copy = translations[locale]

  const handleStart = async () => {
    const started = await startCamera()
    if (started) {
      setCameraStarted(true)
    }
  }

  const handleReset = () => {
    resetSession()
  }

  const handleStopCamera = () => {
    stopSession()
    resetSession()
    stopDetection()
    stopCamera()
    setCameraStarted(false)
  }

  useEffect(() => {
    if (isReady && videoRef.current && !isInitializing) {
      startDetection(videoRef.current)
    }

    if (!isReady) {
      stopDetection()
    }
  }, [isReady, isInitializing, startDetection, stopDetection, videoRef])

  useEffect(() => {
    return () => {
      stopSession()
      stopDetection()
      stopCamera()
    }
  }, [stopCamera, stopDetection, stopSession])

  if (!cameraStarted) {
    return (
      <div className="h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 px-6">
        {(initError || error) && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300 text-sm max-w-sm text-center">
            {initError ?? (
              error === 'permission-denied' ? copy.permissionDenied
              : error === 'not-found' ? copy.cameraNotFound
              : copy.cameraUnknown
            )}
          </div>
        )}
        <div className="text-center max-w-md">
          <h1 className="font-bold text-2xl mb-1">{copy.welcomeTitle}</h1>
          <p className="text-gray-400 text-sm">
            {copy.welcomeSubtitlePrefix}
            <strong className="text-white">{copy.welcomeSubtitleStrong}</strong>
            {copy.welcomeSubtitleSuffix}
          </p>
        </div>
        <label className="w-full max-w-xs flex flex-col gap-2 text-sm text-gray-300">
          <span>{copy.language}</span>
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
          >
            {localeOptions.map((option) => (
              <option key={option} value={option}>
                {translations[option].languageName}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={handleStart}
          disabled={isInitializing}
          className="bg-blue-600 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-xl text-base transition-colors"
        >
          {isInitializing ? copy.loadingModel : copy.startCamera}
        </button>
      </div>
    )
  }

  return (
    <main className="h-screen overflow-hidden bg-gray-950 text-white flex flex-col p-2 gap-2">
      <header className="flex items-center justify-between flex-shrink-0 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-xs font-semibold" aria-hidden="true">
            AI
          </div>
          <span className="font-bold text-sm truncate">{copy.welcomeTitle}</span>
          {isInitializing && (
            <span className="text-gray-400 text-xs animate-pulse ml-2">{copy.loadingModel}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(initError || error) && (
            <span className="text-red-400 text-xs">
              {initError ?? copy.cameraError}
            </span>
          )}
          {stats.isRunning && (
            <div className="flex items-center gap-1.5 bg-red-900/40 border border-red-700/50 rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 text-xs font-mono font-semibold">{copy.record}</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex gap-2 min-h-0">
        <aside className="w-56 flex-shrink-0 flex flex-col gap-2">
          <ClassSummary
            stats={stats}
            copy={copy}
            sleepyText={(count) =>
              interpolate(copy.sleepyTracker, {
                count,
                suffix: getPluralSuffix(count),
                suffix2: locale === 'fr' ? getPluralSuffix(count) : '',
              })
            }
            attentionAlertText={(value) => interpolate(copy.attentionDropped, { value })}
          />
          <SessionControls
            isRunning={stats.isRunning}
            hasStarted={stats.startTime !== null}
            stats={stats}
            copy={copy}
            locale={locale}
            onStart={startSession}
            onStop={stopSession}
            onReset={handleReset}
            onStopCamera={handleStopCamera}
          />
        </aside>

        <section className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
          <div className="flex-1 min-h-0">
            <ClassroomView
              videoRef={videoRef}
              isReady={isReady}
              students={stats.currentStudents}
              waitingText={copy.waitingForCamera}
            />
          </div>
          <div className="flex-shrink-0">
            <TimelineChart timeline={stats.timeline} maxEntries={THRESHOLDS.TIMELINE_MAX_ENTRIES} copy={copy} />
          </div>
        </section>

        <aside className="w-56 flex-shrink-0 overflow-y-auto">
          <StudentGrid students={stats.currentStudents} copy={copy} />
        </aside>
      </div>
    </main>
  )
}
