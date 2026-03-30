import { useEffect, useRef, useState, useCallback } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import type { StudentDetection } from '../types/attention'
import { AttentionState } from '../types/attention'
import { extractHeadPose, isMatrixValid } from '../lib/headPose'
import { classifyAttention, classifyEmotion, StateSmoother } from '../lib/attentionClassifier'

const MAX_FACES = 30

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
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )
        if (cancelled) return
        const lm = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
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
      } catch (e) {
        if (!cancelled) {
          setInitError('No se pudo cargar el modelo de detección.')
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
    setStudents([])
  }, [])

  const startDetection = useCallback((video: HTMLVideoElement) => {
    if (!landmarkerRef.current) return
    runningRef.current = true

    const loop = () => {
      if (!runningRef.current || !landmarkerRef.current) return
      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const result = landmarkerRef.current.detectForVideo(video, performance.now())

      const detected: StudentDetection[] = []

      const faceCount = result.faceLandmarks?.length ?? 0
      for (let i = 0; i < faceCount; i++) {
        const landmarks = result.faceLandmarks[i]

        // Compute bounding box from landmarks (normalized 0-1)
        let minX = 1, minY = 1, maxX = 0, maxY = 0
        for (const lm of landmarks) {
          if (lm.x < minX) minX = lm.x
          if (lm.y < minY) minY = lm.y
          if (lm.x > maxX) maxX = lm.x
          if (lm.y > maxY) maxY = lm.y
        }
        const boundingBox = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        }

        // Extract head pose from transformation matrix
        let pose = null
        const matrices = result.facialTransformationMatrixes
        if (matrices && matrices[i]) {
          const mat = matrices[i]
          if (mat.data && isMatrixValid(mat.data)) {
            pose = extractHeadPose(mat.data)
          }
        }

        const rawState = classifyAttention(pose)
        const state = smootherRef.current.update(i, rawState)

        const blendshapes = result.faceBlendshapes?.[i]?.categories ?? []
        const emotion = classifyEmotion(blendshapes)

        detected.push({ faceIndex: i, boundingBox, pose, state, landmarks, emotion })
      }

      // Mark faces no longer detected as Absent for the smoother
      setStudents(detected)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => {
    return () => {
      runningRef.current = false
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      landmarkerRef.current?.close()
    }
  }, [])

  return { students, isInitializing, initError, startDetection, stopDetection }
}
