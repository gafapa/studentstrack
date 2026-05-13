export enum AttentionState {
  Working = 'working',
  Watching = 'watching',
  Distracted = 'distracted',
  Absent = 'absent',
}

export interface HeadPose {
  pitch: number // degrees, negative = looking down
  yaw: number   // degrees, negative = left
  roll: number  // degrees
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface StudentDetection {
  stableId: number
  boundingBox: BoundingBox
  pose: HeadPose | null
  state: AttentionState
}

export interface TimelineEntry {
  timestamp: number
  workingCount: number
  totalCount: number
}

export interface SessionStats {
  isRunning: boolean
  startTime: number | null
  elapsed: number // seconds
  totalSamples: number
  stateCounts: Record<AttentionState, number>
  timeline: TimelineEntry[]
  currentStudents: StudentDetection[]
}
