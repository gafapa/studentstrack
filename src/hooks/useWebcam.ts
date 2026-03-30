import { useRef, useState, useCallback } from 'react'

export type CameraError = 'permission-denied' | 'not-found' | 'unknown'

export interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  isReady: boolean
  error: CameraError | null
  startCamera: () => Promise<void>
  stopCamera: () => void
}

export function useWebcam(): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<CameraError | null>(null)

  const startCamera = useCallback(async () => {
    setError(null)
    setIsReady(false)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          facingMode: 'user',
          frameRate: { ideal: 30 },
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadeddata = () => setIsReady(true)
      }
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') setError('permission-denied')
        else if (err.name === 'NotFoundError') setError('not-found')
        else setError('unknown')
      } else {
        setError('unknown')
      }
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setIsReady(false)
  }, [])

  return { videoRef, isReady, error, startCamera, stopCamera }
}
