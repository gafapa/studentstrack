import { AttentionState, type HeadPose } from '../types/attention'
import { THRESHOLDS } from '../constants/thresholds'

/**
 * Classify attention state from head pose.
 * Priority: no pose -> Absent, big yaw -> Distracted, low pitch -> Working, else -> Watching
 */
export function classifyAttention(pose: HeadPose | null): AttentionState {
  if (!pose) return AttentionState.Absent

  const { pitch, yaw } = pose

  if (Math.abs(yaw) > THRESHOLDS.DISTRACTED_YAW_MIN) {
    return AttentionState.Distracted
  }

  if (pitch < THRESHOLDS.WORKING_PITCH_MAX) {
    return AttentionState.Working
  }

  return AttentionState.Watching
}

/**
 * Per-face temporal smoothing via majority vote over a sliding window.
 */
export class StateSmoother {
  private buffers = new Map<number, AttentionState[]>()

  update(stableId: number, state: AttentionState): AttentionState {
    let buf = this.buffers.get(stableId)
    if (!buf) {
      buf = []
      this.buffers.set(stableId, buf)
    }

    buf.push(state)
    if (buf.length > THRESHOLDS.SMOOTHING_WINDOW_FRAMES) {
      buf.shift()
    }

    return this.majority(buf)
  }

  private majority(states: AttentionState[]): AttentionState {
    const counts: Partial<Record<AttentionState, number>> = {}
    for (const s of states) {
      counts[s] = (counts[s] ?? 0) + 1
    }
    let best = states[states.length - 1]
    let bestCount = 0
    for (const [s, c] of Object.entries(counts) as [AttentionState, number][]) {
      if (c > bestCount) {
        bestCount = c
        best = s
      }
    }
    return best
  }

  clear() {
    this.buffers.clear()
  }
}
