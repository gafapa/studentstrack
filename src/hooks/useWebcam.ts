import { useRef, useState, useCallback, useEffect } from 'react'

export type CameraError = 'permission-denied' | 'not-found' | 'unknown'

export interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  isReady: boolean
  error: CameraError | null
  startCamera: () => Promise<boolean>
  stopCamera: () => void
}

export function useWebcam(): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<CameraError | null>(null)

  const attachStream = useCallback(() => {
    if (!videoRef.current || !streamRef.current) return
    if (videoRef.current.srcObject === streamRef.current) return

    videoRef.current.srcObject = streamRef.current
    videoRef.current.onloadeddata = () => setIsReady(true)
    void videoRef.current.play().catch(() => {
      setError('unknown')
    })
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)
    setIsReady(false)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

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
      attachStream()
      return true
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') setError('permission-denied')
        else if (err.name === 'NotFoundError') setError('not-found')
        else setError('unknown')
      } else {
        setError('unknown')
      }
      return false
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.onloadeddata = null
    }
    setIsReady(false)
  }, [])

  useEffect(() => {
    attachStream()
  })

  useEffect(() => stopCamera, [stopCamera])

  return { videoRef, isReady, error, startCamera, stopCamera }
}
