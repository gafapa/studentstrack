import { useEffect, useRef } from 'react'
import type { StudentDetection } from '../types/attention'
import { STATE_COLORS } from '../constants/thresholds'
import { AttentionState } from '../types/attention'

interface Props {
  students: StudentDetection[]
  videoWidth: number
  videoHeight: number
  canvasWidth: number
  canvasHeight: number
}

const STATE_ICONS: Record<AttentionState, string> = {
  [AttentionState.Working]: 'OK',
  [AttentionState.Watching]: 'ON',
  [AttentionState.Distracted]: '!',
  [AttentionState.Absent]: '--',
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
    const mirrorX = (x: number) => canvasWidth - x

    for (const student of students) {
      const { boundingBox, state, pose, stableId } = student
      const color = STATE_COLORS[state]

      const x = mirrorX((boundingBox.x + boundingBox.width) * videoWidth * scaleX)
      const y = boundingBox.y * videoHeight * scaleY
      const w = boundingBox.width * videoWidth * scaleX
      const h = boundingBox.height * videoHeight * scaleY

      const pad = Math.min(w, h) * 0.12
      const rx = x - pad
      const ry = y - pad
      const rw = w + pad * 2
      const rh = h + pad * 2

      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.shadowColor = color
      ctx.shadowBlur = 8
      roundRect(ctx, rx, ry, rw, rh, 8)
      ctx.stroke()
      ctx.shadowBlur = 0

      const labelText = `#${stableId + 1} ${STATE_ICONS[state]}`
      ctx.font = `bold ${Math.max(12, rw * 0.18)}px sans-serif`
      const textW = ctx.measureText(labelText).width
      const labelH = Math.max(18, rw * 0.2)
      const labelY = ry - labelH - 4

      ctx.fillStyle = `${color}cc`
      roundRect(ctx, rx, labelY, textW + 12, labelH, 4)
      ctx.fill()

      ctx.fillStyle = '#fff'
      ctx.textBaseline = 'middle'
      ctx.fillText(labelText, rx + 6, labelY + labelH / 2)

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
