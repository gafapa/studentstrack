import { useEffect, useRef } from 'react'
import type { StudentDetection } from '../types/attention'
import { STATE_COLORS, EMOTION_ICONS } from '../constants/thresholds'
import { AttentionState } from '../types/attention'

// MediaPipe face landmark indices for eyes
const LEFT_EYE = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7]
const RIGHT_EYE = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382]
const LEFT_IRIS = 468
const RIGHT_IRIS = 473

interface Props {
  students: StudentDetection[]
  videoWidth: number
  videoHeight: number
  canvasWidth: number
  canvasHeight: number
}

const STATE_ICONS: Record<AttentionState, string> = {
  [AttentionState.Working]: '✓',
  [AttentionState.Watching]: '●',
  [AttentionState.Distracted]: '!',
  [AttentionState.Absent]: '?',
}

export function FaceOverlay({ students, videoWidth, videoHeight, canvasWidth, canvasHeight }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    const scaleX = canvasWidth / videoWidth
    const scaleY = canvasHeight / videoHeight

    for (const student of students) {
      const { boundingBox, state, pose, faceIndex, landmarks, emotion } = student
      const color = STATE_COLORS[state]

      const x = boundingBox.x * videoWidth * scaleX
      const y = boundingBox.y * videoHeight * scaleY
      const w = boundingBox.width * videoWidth * scaleX
      const h = boundingBox.height * videoHeight * scaleY

      const pad = Math.min(w, h) * 0.12
      const rx = x - pad
      const ry = y - pad
      const rw = w + pad * 2
      const rh = h + pad * 2

      // Bounding box
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.shadowColor = color
      ctx.shadowBlur = 8
      roundRect(ctx, rx, ry, rw, rh, 8)
      ctx.stroke()
      ctx.shadowBlur = 0

      // Label: #N + state icon + emotion icon
      const emotionIcon = EMOTION_ICONS[emotion] ?? ''
      const labelText = `#${faceIndex + 1} ${STATE_ICONS[state]} ${emotionIcon}`
      ctx.font = `bold ${Math.max(12, rw * 0.18)}px sans-serif`
      const textW = ctx.measureText(labelText).width
      const labelH = Math.max(18, rw * 0.2)
      const labelY = ry - labelH - 4

      ctx.fillStyle = color + 'cc'
      roundRect(ctx, rx, labelY, textW + 12, labelH, 4)
      ctx.fill()

      ctx.fillStyle = '#fff'
      ctx.textBaseline = 'middle'
      ctx.fillText(labelText, rx + 6, labelY + labelH / 2)

      // Eye landmarks
      if (landmarks.length >= 478) {
        drawEyeContour(ctx, landmarks, LEFT_EYE, videoWidth, videoHeight, scaleX, scaleY, color)
        drawEyeContour(ctx, landmarks, RIGHT_EYE, videoWidth, videoHeight, scaleX, scaleY, color)

        // Iris dots
        const leftIris = landmarks[LEFT_IRIS]
        const rightIris = landmarks[RIGHT_IRIS]
        if (leftIris && rightIris) {
          const irisR = Math.max(3, rw * 0.04)
          drawIris(ctx, leftIris.x * videoWidth * scaleX, leftIris.y * videoHeight * scaleY, irisR, color)
          drawIris(ctx, rightIris.x * videoWidth * scaleX, rightIris.y * videoHeight * scaleY, irisR, color)
        }
      } else if (landmarks.length > 0) {
        // Fallback: approximate eye positions from bounding box
        const eyeY = ry + rh * 0.35
        const eyeR = Math.max(3, rw * 0.05)
        drawIris(ctx, rx + rw * 0.3, eyeY, eyeR, color)
        drawIris(ctx, rx + rw * 0.7, eyeY, eyeR, color)
      }

      // Pitch indicator bar (right side)
      if (pose) {
        const barX = rx + rw + 6
        const barH = rh
        const barW = Math.max(6, rw * 0.08)
        const clampedPitch = Math.max(-60, Math.min(60, pose.pitch))
        const ratio = (clampedPitch + 60) / 120
        const indicatorY = ry + barH * ratio
        const indicatorH = Math.max(4, barH * 0.12)

        ctx.fillStyle = '#ffffff22'
        roundRect(ctx, barX, ry, barW, barH, 3)
        ctx.fill()

        ctx.fillStyle = color
        roundRect(ctx, barX, indicatorY - indicatorH / 2, barW, indicatorH, 2)
        ctx.fill()
      }
    }
  }, [students, videoWidth, videoHeight, canvasWidth, canvasHeight])

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}

function drawEyeContour(
  ctx: CanvasRenderingContext2D,
  landmarks: { x: number; y: number }[],
  indices: number[],
  videoWidth: number,
  videoHeight: number,
  scaleX: number,
  scaleY: number,
  color: string,
) {
  ctx.beginPath()
  for (let i = 0; i < indices.length; i++) {
    const lm = landmarks[indices[i]]
    if (!lm) continue
    const px = lm.x * videoWidth * scaleX
    const py = lm.y * videoHeight * scaleY
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.strokeStyle = color + 'cc'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function drawIris(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = color + 'dd'
  ctx.fill()
  ctx.strokeStyle = '#fff8'
  ctx.lineWidth = 1
  ctx.stroke()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
