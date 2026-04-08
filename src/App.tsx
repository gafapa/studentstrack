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

export default function App() {
  const { videoRef, isReady, error, startCamera, stopCamera } = useWebcam()
  const { students, isInitializing, initError, startDetection, stopDetection } = useFaceLandmarker()
  const { stats, startSession, stopSession, resetSession } = useAttentionSession(students)
  const [cameraStarted, setCameraStarted] = useState(false)

  const handleStart = async () => {
    await startCamera()

    if (videoRef.current?.srcObject) {
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
              error === 'permission-denied' ? 'Camera permission was denied.'
              : error === 'not-found' ? 'No camera was found on this device.'
              : 'An unknown camera error occurred.'
            )}
          </div>
        )}
        <div className="text-center">
          <h1 className="font-bold text-2xl mb-1">Student Attention Monitor</h1>
          <p className="text-gray-400 text-sm">
            Track up to <strong className="text-white">30 students</strong> directly in the browser.
          </p>
        </div>
        <button
          onClick={handleStart}
          disabled={isInitializing}
          className="bg-blue-600 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-xl text-base transition-colors"
        >
          {isInitializing ? 'Loading Model...' : 'Start Camera'}
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
          <span className="font-bold text-sm truncate">Student Attention Monitor</span>
          {isInitializing && (
            <span className="text-gray-400 text-xs animate-pulse ml-2">Loading Model...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(initError || error) && (
            <span className="text-red-400 text-xs">
              {initError ?? 'Camera error'}
            </span>
          )}
          {stats.isRunning && (
            <div className="flex items-center gap-1.5 bg-red-900/40 border border-red-700/50 rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 text-xs font-mono font-semibold">REC</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleStopCamera}
            className="bg-gray-800 hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors"
          >
            Stop Camera
          </button>
        </div>
      </header>

      <div className="flex-1 flex gap-2 min-h-0">
        <aside className="w-56 flex-shrink-0 flex flex-col gap-2">
          <ClassSummary stats={stats} />
          <SessionControls
            isRunning={stats.isRunning}
            hasStarted={stats.startTime !== null}
            stats={stats}
            onStart={startSession}
            onStop={stopSession}
            onReset={handleReset}
          />
        </aside>

        <section className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
          <div className="flex-1 min-h-0">
            <ClassroomView
              videoRef={videoRef}
              isReady={isReady}
              students={stats.currentStudents}
            />
          </div>
          <div className="flex-shrink-0">
            <TimelineChart timeline={stats.timeline} maxEntries={THRESHOLDS.TIMELINE_MAX_ENTRIES} />
          </div>
        </section>

        <aside className="w-56 flex-shrink-0 overflow-y-auto">
          <StudentGrid students={stats.currentStudents} />
        </aside>
      </div>
    </main>
  )
}
