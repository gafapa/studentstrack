import { useEffect, useRef, useState, useCallback } from 'react'
import type { StudentDetection } from '../types/attention'

const FRAME_WIDTH = 640
const FRAME_HEIGHT = 360
const DETECTION_INTERVAL_MS = 180
const DETECTION_RETRY_MS = 50

type WorkerResponse =
  | { type: 'ready' }
  | { type: 'students'; students: StudentDetection[]; processingMs: number }
  | { type: 'error'; message: string }

async function createDetectionFrame(video: HTMLVideoElement) {
  try {
    return await createImageBitmap(video, {
      resizeWidth: FRAME_WIDTH,
      resizeHeight: FRAME_HEIGHT,
      resizeQuality: 'low',
    })
  } catch {
    return createImageBitmap(video)
  }
}

export interface UseFaceLandmarkerReturn {
  students: StudentDetection[]
  isInitializing: boolean
  initError: string | null
  startDetection: (video: HTMLVideoElement) => void
  stopDetection: () => void
}

export function useFaceLandmarker(): UseFaceLandmarkerReturn {
  const workerRef = useRef<Worker | null>(null)
  const timerRef = useRef<number | null>(null)
  const inFlightRef = useRef(false)
  const lastProcessingMsRef = useRef(0)
  const [students, setStudents] = useState<StudentDetection[]>([])
  const [isInitializing, setIsInitializing] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const runningRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setIsInitializing(true)

    const worker = new Worker(new URL('../workers/faceLandmarkerWorker.ts', import.meta.url), {
      type: 'module',
    })

    workerRef.current = worker
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (cancelled) return
      const message = event.data

      if (message.type === 'ready') {
        setIsInitializing(false)
        return
      }

      if (message.type === 'students') {
        inFlightRef.current = false
        lastProcessingMsRef.current = message.processingMs
        setStudents(message.students)
        return
      }

      if (message.type === 'error') {
        inFlightRef.current = false
        setInitError(message.message)
        setIsInitializing(false)
      }
    }

    worker.onerror = () => {
      if (!cancelled) {
        setInitError('Unable to load the face detection model.')
        setIsInitializing(false)
      }
    }

    worker.postMessage({ type: 'init' })

    return () => {
      cancelled = true
      worker.postMessage({ type: 'close' })
      worker.terminate()
      if (workerRef.current === worker) {
        workerRef.current = null
      }
    }
  }, [])

  const stopDetection = useCallback(() => {
    runningRef.current = false
    inFlightRef.current = false
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    workerRef.current?.postMessage({ type: 'reset' })
    setStudents([])
  }, [])

  const startDetection = useCallback((video: HTMLVideoElement) => {
    if (!workerRef.current || runningRef.current) return
    runningRef.current = true
    let lastVideoTime = -1

    const scheduleNext = (delayMs: number) => {
      if (!runningRef.current) return
      timerRef.current = window.setTimeout(loop, delayMs)
    }

    const captureFrame = async () => {
      if (!runningRef.current || !workerRef.current) return

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        scheduleNext(DETECTION_RETRY_MS)
        return
      }

      if (inFlightRef.current || video.currentTime === lastVideoTime) {
        scheduleNext(DETECTION_RETRY_MS)
        return
      }

      lastVideoTime = video.currentTime
      inFlightRef.current = true

      try {
        const image = await createDetectionFrame(video)

        if (!runningRef.current || !workerRef.current) {
          inFlightRef.current = false
          image.close()
          return
        }

        workerRef.current.postMessage(
          { type: 'detect', image, timestamp: performance.now() },
          [image],
        )
      } catch {
        inFlightRef.current = false
        scheduleNext(DETECTION_RETRY_MS)
      }
    }

    const loop = () => {
      timerRef.current = null
      void captureFrame()
      const adaptiveInterval = Math.max(DETECTION_INTERVAL_MS, lastProcessingMsRef.current * 2)
      scheduleNext(adaptiveInterval)
    }

    scheduleNext(0)
  }, [])

  useEffect(() => {
    return () => {
      stopDetection()
    }
  }, [stopDetection])

  return { students, isInitializing, initError, startDetection, stopDetection }
}
