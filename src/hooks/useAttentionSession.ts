import { useState, useRef, useCallback, useEffect } from 'react'
import type { StudentDetection, SessionStats, TimelineEntry } from '../types/attention'
import { AttentionState } from '../types/attention'
import { THRESHOLDS } from '../constants/thresholds'

const EMPTY_COUNTS: Record<AttentionState, number> = {
  [AttentionState.Working]: 0,
  [AttentionState.Watching]: 0,
  [AttentionState.Distracted]: 0,
  [AttentionState.Absent]: 0,
}

function makeInitialStats(): SessionStats {
  return {
    isRunning: false,
    startTime: null,
    elapsed: 0,
    totalSnapshots: 0,
    stateCounts: { ...EMPTY_COUNTS },
    timeline: [],
    currentStudents: [],
  }
}

export function useAttentionSession(students: StudentDetection[]) {
  const [stats, setStats] = useState<SessionStats>(makeInitialStats)
  const accRef = useRef({ ...EMPTY_COUNTS })
  const totalRef = useRef(0)
  const timelineRef = useRef<TimelineEntry[]>([])
  const lastSampleRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startSession = useCallback(() => {
    accRef.current = { ...EMPTY_COUNTS }
    totalRef.current = 0
    timelineRef.current = []
    lastSampleRef.current = performance.now()
    setStats((prev) => ({
      ...makeInitialStats(),
      isRunning: true,
      startTime: Date.now(),
      currentStudents: prev.currentStudents,
    }))
  }, [])

  const stopSession = useCallback(() => {
    setStats((prev) => ({ ...prev, isRunning: false }))
  }, [])

  const resetSession = useCallback(() => {
    setStats(makeInitialStats())
    accRef.current = { ...EMPTY_COUNTS }
    totalRef.current = 0
    timelineRef.current = []
  }, [])

  // Accumulate stats and sample timeline each second when running
  useEffect(() => {
    setStats((prev) => {
      if (!prev.isRunning) return { ...prev, currentStudents: students }

      // Accumulate state counts for all detected students this frame
      const newCounts = { ...accRef.current }
      let added = 0
      for (const s of students) {
        newCounts[s.state] = (newCounts[s.state] ?? 0) + 1
        added++
      }
      accRef.current = newCounts
      totalRef.current += added

      // Timeline sample (once per second)
      const now = performance.now()
      let timeline = timelineRef.current
      if (now - lastSampleRef.current >= THRESHOLDS.TIMELINE_SAMPLE_MS) {
        lastSampleRef.current = now
        const workingCount = students.filter(
          (s) => s.state === AttentionState.Working || s.state === AttentionState.Watching
        ).length
        const entry: TimelineEntry = {
          timestamp: Date.now(),
          workingCount,
          totalCount: students.length,
        }
        timeline = [...timeline, entry]
        if (timeline.length > THRESHOLDS.TIMELINE_MAX_ENTRIES) {
          timeline = timeline.slice(-THRESHOLDS.TIMELINE_MAX_ENTRIES)
        }
        timelineRef.current = timeline
      }

      const elapsed = prev.startTime ? Math.floor((Date.now() - prev.startTime) / 1000) : 0

      return {
        ...prev,
        elapsed,
        totalSnapshots: totalRef.current,
        stateCounts: { ...newCounts },
        timeline,
        currentStudents: students,
      }
    })
  }, [students])

  // Elapsed timer
  useEffect(() => {
    if (stats.isRunning) {
      timerRef.current = setInterval(() => {
        setStats((prev) =>
          prev.isRunning && prev.startTime
            ? { ...prev, elapsed: Math.floor((Date.now() - prev.startTime) / 1000) }
            : prev
        )
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [stats.isRunning])

  return { stats, startSession, stopSession, resetSession }
}
