import { useEffect, useState } from 'react'
import type { StudentDetection } from '../types/attention'
import { FaceOverlay } from './FaceOverlay'

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>
  isReady: boolean
  students: StudentDetection[]
  waitingText: string
}

export function ClassroomView({ videoRef, isReady, students, waitingText }: Props) {
  const [dims, setDims] = useState({ videoW: 1920, videoH: 1080, canvasW: 0, canvasH: 0 })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateDims = () => {
      setDims({
        videoW: video.videoWidth || 1920,
        videoH: video.videoHeight || 1080,
        canvasW: video.clientWidth,
        canvasH: video.clientHeight,
      })
    }

    updateDims()
    video.addEventListener('loadedmetadata', updateDims)
    video.addEventListener('resize', updateDims)

    const ro = new ResizeObserver(updateDims)
    ro.observe(video)

    return () => {
      video.removeEventListener('loadedmetadata', updateDims)
      video.removeEventListener('resize', updateDims)
      ro.disconnect()
    }
  }, [videoRef])

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
        style={{ transform: 'scaleX(-1)' }}
      />

      {isReady && dims.canvasW > 0 && (
        <div className="absolute inset-0">
          <FaceOverlay
            students={students}
            videoWidth={dims.videoW}
            videoHeight={dims.videoH}
            canvasWidth={dims.canvasW}
            canvasHeight={dims.canvasH}
          />
        </div>
      )}

      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.898L15 14M3 8h12a2 2 0 012 2v4a2 2 0 01-2 2H3a2 2 0 01-2-2v-4a2 2 0 012-2z"
            />
          </svg>
          <p className="text-gray-400 text-sm">{waitingText}</p>
        </div>
      )}
    </div>
  )
}
