import { useEffect, useRef, useState } from 'react'
import type { TimelineEntry } from '../types/attention'
import { STATE_COLORS } from '../constants/thresholds'
import { AttentionState } from '../types/attention'

interface Copy {
  timeline: string
  attentive: string
  distracted: string
  sleepy: string
  startSessionToSeeTimeline: string
  now: string
}

interface Props {
  timeline: TimelineEntry[]
  maxEntries: number
  copy: Copy
}

export function TimelineChart({ timeline, maxEntries, copy }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(900)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(Math.floor(entry.contentRect.width))
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    if (timeline.length === 0) {
      ctx.fillStyle = '#374151'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#6b7280'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(copy.startSessionToSeeTimeline, W / 2, H / 2)
      return
    }

    const barW = W / maxEntries
    const startIndex = Math.max(0, maxEntries - timeline.length)

    ctx.fillStyle = '#1f2937'
    ctx.fillRect(0, 0, W, H)

    for (let i = 0; i < timeline.length; i++) {
      const entry = timeline[i]
      const x = (startIndex + i) * barW
      const total = entry.totalCount

      if (total === 0) {
        ctx.fillStyle = '#374151'
        ctx.fillRect(x, 0, Math.max(barW - 0.5, 1), H)
        continue
      }

      const workingH = (entry.workingCount / total) * H
      const sleepyH = (entry.sleepyCount / total) * H
      const distractedH = Math.max(0, H - workingH - sleepyH)

      ctx.fillStyle = STATE_COLORS[AttentionState.Working]
      ctx.fillRect(x, H - workingH, Math.max(barW - 0.5, 1), workingH)

      ctx.fillStyle = `${STATE_COLORS[AttentionState.Distracted]}88`
      ctx.fillRect(x, 0, Math.max(barW - 0.5, 1), distractedH)

      ctx.fillStyle = '#f59e0b'
      ctx.fillRect(x, distractedH, Math.max(barW - 0.5, 1), sleepyH)
    }

    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 1
    for (let i = 0; i <= maxEntries; i += 30) {
      const x = i * barW
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }

    ctx.fillStyle = '#6b7280'
    ctx.font = '9px monospace'
    ctx.textBaseline = 'bottom'
    for (let i = 0; i <= maxEntries; i += 60) {
      const secsAgo = maxEntries - i
      const label = secsAgo === 0 ? copy.now : `-${secsAgo}s`
      ctx.textAlign = i === 0 ? 'left' : i === maxEntries ? 'right' : 'center'
      ctx.fillText(label, i * barW, H - 2)
    }
  }, [timeline, maxEntries, width, copy])

  return (
    <div className="bg-gray-900 rounded-xl px-3 py-2 flex items-center gap-3">
      <div className="flex flex-col gap-1 flex-shrink-0">
        <span className="text-white font-semibold text-xs uppercase tracking-wide">{copy.timeline}</span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: STATE_COLORS[AttentionState.Working] }} />
          {copy.attentive}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: STATE_COLORS[AttentionState.Distracted] }} />
          {copy.distracted}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full inline-block bg-amber-500" />
          {copy.sleepy}
        </span>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={48}
          className="w-full rounded-lg"
          style={{ imageRendering: 'pixelated', height: 48 }}
        />
      </div>
    </div>
  )
}
