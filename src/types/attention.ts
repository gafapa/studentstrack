export enum AttentionState {
  Working = 'working',
  Watching = 'watching',
  Distracted = 'distracted',
  Absent = 'absent',
}

export type Emotion = 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry' | 'sleepy'

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

export interface NormalizedLandmark {
  x: number
  y: number
  z: number
}

export interface StudentDetection {
  stableId: number
  boundingBox: BoundingBox
  pose: HeadPose | null
  state: AttentionState
  landmarks: NormalizedLandmark[]
  emotion: Emotion
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
