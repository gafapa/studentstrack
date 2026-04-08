export const THRESHOLDS = {
  // Head pitch: negative = looking down at paper
  WORKING_PITCH_MAX: -12,      // below this -> Working
  WATCHING_PITCH_MAX: 20,      // below this (and above WORKING) -> Watching

  // Head yaw: large magnitude = looking sideways
  DISTRACTED_YAW_MIN: 22,      // |yaw| above this -> Distracted

  // Temporal smoothing
  SMOOTHING_WINDOW_FRAMES: 10, // ~400ms at 25fps

  // Timeline sampling
  TIMELINE_SAMPLE_MS: 1000,    // record one entry per second

  // Max timeline entries (5 min * 60 sec)
  TIMELINE_MAX_ENTRIES: 300,
} as const

export const STATE_COLORS: Record<string, string> = {
  working: '#22c55e',
  watching: '#22c55e',
  distracted: '#ef4444',
  absent: '#6b7280',
}

export const STATE_LABELS: Record<string, string> = {
  working: 'Working',
  watching: 'Watching',
  distracted: 'Distracted',
  absent: 'Absent',
}

export const EMOTION_LABELS: Record<string, string> = {
  neutral: 'Neutral',
  happy: 'Happy',
  sad: 'Sad',
  surprised: 'Surprised',
  angry: 'Angry',
  sleepy: 'Sleepy',
}

export const EMOTION_ICONS: Record<string, string> = {
  neutral: ':|',
  happy: ':)',
  sad: ':(',
  surprised: ':O',
  angry: '>:(',
  sleepy: 'Zz',
}
