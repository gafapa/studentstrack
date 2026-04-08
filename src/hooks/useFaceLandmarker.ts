import { useEffect, useRef, useState, useCallback } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import type { StudentDetection } from '../types/attention'
import { extractHeadPose, isMatrixValid } from '../lib/headPose'
import { classifyAttention, classifyEmotion, StateSmoother } from '../lib/attentionClassifier'
import { FaceTracker } from '../lib/faceTracking'

const MAX_FACES = 30
const LOST_FACE_GRACE_MS = 900

export interface UseFaceLandmarkerReturn {
  students: StudentDetection[]
  isInitializing: boolean
  initError: string | null
  startDetection: (video: HTMLVideoElement) => void
  stopDetection: () => void
}

export function useFaceLandmarker(): UseFaceLandmarkerReturn {
  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const rafRef = useRef<number | null>(null)
  const smootherRef = useRef(new StateSmoother())
  const trackerRef = useRef(new FaceTracker())
  const lastKnownStudentsRef = useRef(new Map<number, StudentDetection>())
  const [students, setStudents] = useState<StudentDetection[]>([])
  const [isInitializing, setIsInitializing] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const runningRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setIsInitializing(true)

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
        )
        if (cancelled) return

        const lm = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          minFaceDetectionConfidence: 0.35,
          minFacePresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
          outputFacialTransformationMatrixes: true,
          outputFaceBlendshapes: true,
          numFaces: MAX_FACES,
          runningMode: 'VIDEO',
        })

        if (cancelled) {
          lm.close()
          return
        }

        landmarkerRef.current = lm
        setIsInitializing(false)
      } catch {
        if (!cancelled) {
          setInitError('Unable to load the face detection model.')
          setIsInitializing(false)
        }
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [])

  const stopDetection = useCallback(() => {
    runningRef.current = false
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    smootherRef.current.clear()
    trackerRef.current.clear()
    lastKnownStudentsRef.current.clear()
    setStudents([])
  }, [])

  const startDetection = useCallback((video: HTMLVideoElement) => {
    if (!landmarkerRef.current || runningRef.current) return
    runningRef.current = true

    const loop = () => {
      if (!runningRef.current || !landmarkerRef.current) return

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const result = landmarkerRef.current.detectForVideo(video, performance.now())
      const boxes = (result.faceLandmarks ?? []).map((landmarks) => {
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        for (const lm of landmarks) {
          if (lm.x < minX) minX = lm.x
          if (lm.y < minY) minY = lm.y
          if (lm.x > maxX) maxX = lm.x
          if (lm.y > maxY) maxY = lm.y
        }

        return {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        }
      })

      const now = performance.now()
      const stableIds = trackerRef.current.assignStableIds(boxes, now)
      const detected: StudentDetection[] = []

      for (let i = 0; i < boxes.length; i++) {
        const landmarks = result.faceLandmarks?.[i] ?? []
        const boundingBox = boxes[i]
        const stableId = stableIds[i]

        let pose = null
        const matrix = result.facialTransformationMatrixes?.[i]
        if (matrix?.data && isMatrixValid(matrix.data)) {
          pose = extractHeadPose(matrix.data)
        }

        const rawState = classifyAttention(pose)
        const state = smootherRef.current.update(stableId, rawState)
        const blendshapes = result.faceBlendshapes?.[i]?.categories ?? []
        const emotion = classifyEmotion(blendshapes)

        detected.push({
          stableId,
          boundingBox,
          pose,
          state,
          landmarks,
          emotion,
        })
      }

      const nextStudents = [...detected]
      const recentMissingIds = trackerRef.current.getRecentlyMissingTrackIds(stableIds, now, LOST_FACE_GRACE_MS)
      for (const stableId of recentMissingIds) {
        const previousStudent = lastKnownStudentsRef.current.get(stableId)
        if (!previousStudent) continue
        nextStudents.push(previousStudent)
      }

      lastKnownStudentsRef.current = new Map(
        nextStudents.map((student) => [student.stableId, student]),
      )

      setStudents(nextStudents)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => {
    return () => {
      stopDetection()
      landmarkerRef.current?.close()
    }
  }, [stopDetection])

  return { students, isInitializing, initError, startDetection, stopDetection }
}
