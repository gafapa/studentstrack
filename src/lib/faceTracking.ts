import type { BoundingBox } from '../types/attention'

interface Track {
  stableId: number
  boundingBox: BoundingBox
  lastSeenAt: number
}

const TRACK_MAX_AGE_MS = 1500
const MIN_MATCH_SCORE = 0.15

function getCenter(box: BoundingBox) {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  }
}

function getArea(box: BoundingBox) {
  return Math.max(0, box.width) * Math.max(0, box.height)
}

function getIoU(a: BoundingBox, b: BoundingBox) {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const union = getArea(a) + getArea(b) - intersection
  return union > 0 ? intersection / union : 0
}

function getDistanceScore(a: BoundingBox, b: BoundingBox) {
  const ca = getCenter(a)
  const cb = getCenter(b)
  const dx = ca.x - cb.x
  const dy = ca.y - cb.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  return Math.max(0, 1 - distance / 0.35)
}

function getMatchScore(track: Track, box: BoundingBox) {
  return getIoU(track.boundingBox, box) * 0.7 + getDistanceScore(track.boundingBox, box) * 0.3
}

export class FaceTracker {
  private nextStableId = 0
  private tracks = new Map<number, Track>()

  assignStableIds(boxes: BoundingBox[], now: number): number[] {
    this.prune(now)

    const remainingTracks = new Set(this.tracks.keys())
    const stableIds: number[] = []

    for (const box of boxes) {
      let bestTrackId: number | null = null
      let bestScore = -Infinity

      for (const trackId of remainingTracks) {
        const track = this.tracks.get(trackId)
        if (!track) continue
        const score = getMatchScore(track, box)
        if (score > bestScore) {
          bestScore = score
          bestTrackId = trackId
        }
      }

      if (bestTrackId !== null && bestScore >= MIN_MATCH_SCORE) {
        const matchedTrack = this.tracks.get(bestTrackId)!
        matchedTrack.boundingBox = box
        matchedTrack.lastSeenAt = now
        stableIds.push(bestTrackId)
        remainingTracks.delete(bestTrackId)
        continue
      }

      const stableId = this.nextStableId++
      this.tracks.set(stableId, { stableId, boundingBox: box, lastSeenAt: now })
      stableIds.push(stableId)
    }

    return stableIds
  }

  clear() {
    this.tracks.clear()
    this.nextStableId = 0
  }

  private prune(now: number) {
    for (const [trackId, track] of this.tracks) {
      if (now - track.lastSeenAt > TRACK_MAX_AGE_MS) {
        this.tracks.delete(trackId)
      }
    }
  }
}
