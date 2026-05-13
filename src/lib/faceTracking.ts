import type { BoundingBox } from '../types/attention'

interface Track {
  stableId: number
  boundingBox: BoundingBox
  lastSeenAt: number
  velocityX: number
  velocityY: number
}

const TRACK_MAX_AGE_MS = 1500
const MIN_MATCH_SCORE = 0.22
const MAX_CENTER_DISTANCE = 0.28
const MAX_AREA_RATIO_DELTA = 0.7

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
  return Math.max(0, 1 - distance / MAX_CENTER_DISTANCE)
}

function moveBox(box: BoundingBox, dx: number, dy: number): BoundingBox {
  return {
    ...box,
    x: box.x + dx,
    y: box.y + dy,
  }
}

function getAreaRatioDelta(a: BoundingBox, b: BoundingBox) {
  const areaA = getArea(a)
  const areaB = getArea(b)
  if (areaA === 0 || areaB === 0) return 1
  return Math.abs(areaA - areaB) / Math.max(areaA, areaB)
}

function getCenterDistance(a: BoundingBox, b: BoundingBox) {
  const ca = getCenter(a)
  const cb = getCenter(b)
  const dx = ca.x - cb.x
  const dy = ca.y - cb.y
  return Math.sqrt(dx * dx + dy * dy)
}

function getPredictedBox(track: Track, now: number) {
  const elapsedFrames = Math.min(4, Math.max(0, (now - track.lastSeenAt) / 33.33))
  return moveBox(track.boundingBox, track.velocityX * elapsedFrames, track.velocityY * elapsedFrames)
}

function getMatchScore(track: Track, box: BoundingBox, now: number) {
  const predictedBox = getPredictedBox(track, now)
  if (getCenterDistance(predictedBox, box) > MAX_CENTER_DISTANCE) return -Infinity
  if (getAreaRatioDelta(predictedBox, box) > MAX_AREA_RATIO_DELTA) return -Infinity

  return getIoU(predictedBox, box) * 0.55 + getDistanceScore(predictedBox, box) * 0.45
}

function updateTrack(track: Track, box: BoundingBox, now: number) {
  const previousCenter = getCenter(track.boundingBox)
  const nextCenter = getCenter(box)
  const elapsedFrames = Math.max(1, (now - track.lastSeenAt) / 33.33)

  track.velocityX = (nextCenter.x - previousCenter.x) / elapsedFrames
  track.velocityY = (nextCenter.y - previousCenter.y) / elapsedFrames
  track.boundingBox = box
  track.lastSeenAt = now
}

export class FaceTracker {
  private nextStableId = 0
  private tracks = new Map<number, Track>()

  assignStableIds(boxes: BoundingBox[], now: number): number[] {
    this.prune(now)

    const stableIds = new Array<number>(boxes.length)
    const candidates: Array<{ boxIndex: number; trackId: number; score: number }> = []

    for (let boxIndex = 0; boxIndex < boxes.length; boxIndex++) {
      for (const [trackId, track] of this.tracks) {
        const score = getMatchScore(track, boxes[boxIndex], now)
        if (score >= MIN_MATCH_SCORE) {
          candidates.push({ boxIndex, trackId, score })
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score)

    const assignedBoxes = new Set<number>()
    const assignedTracks = new Set<number>()

    for (const candidate of candidates) {
      if (assignedBoxes.has(candidate.boxIndex) || assignedTracks.has(candidate.trackId)) continue
      const track = this.tracks.get(candidate.trackId)
      if (!track) continue

      updateTrack(track, boxes[candidate.boxIndex], now)
      stableIds[candidate.boxIndex] = candidate.trackId
      assignedBoxes.add(candidate.boxIndex)
      assignedTracks.add(candidate.trackId)
    }

    for (let boxIndex = 0; boxIndex < boxes.length; boxIndex++) {
      if (stableIds[boxIndex] !== undefined) continue

      const stableId = this.nextStableId++
      this.tracks.set(stableId, {
        stableId,
        boundingBox: boxes[boxIndex],
        lastSeenAt: now,
        velocityX: 0,
        velocityY: 0,
      })
      stableIds[boxIndex] = stableId
    }

    return stableIds
  }

  clear() {
    this.tracks.clear()
    this.nextStableId = 0
  }

  getRecentlyMissingTrackIds(activeStableIds: number[], now: number, graceMs: number): number[] {
    const activeSet = new Set(activeStableIds)
    const missingTrackIds: number[] = []

    for (const [trackId, track] of this.tracks) {
      if (activeSet.has(trackId)) continue
      if (now - track.lastSeenAt <= graceMs) {
        missingTrackIds.push(trackId)
      }
    }

    return missingTrackIds
  }

  private prune(now: number) {
    for (const [trackId, track] of this.tracks) {
      if (now - track.lastSeenAt > TRACK_MAX_AGE_MS) {
        this.tracks.delete(trackId)
      }
    }
  }
}
