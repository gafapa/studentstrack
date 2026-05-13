import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import type { StudentDetection } from '../types/attention'
import { extractHeadPose, isMatrixValid } from '../lib/headPose'
import { classifyAttention, StateSmoother } from '../lib/attentionClassifier'
import { FaceTracker } from '../lib/faceTracking'

const MAX_FACES = 30
const LOST_FACE_GRACE_MS = 900
const ASSET_BASE = import.meta.env.BASE_URL
const MEDIAPIPE_WASM_PATH = `${ASSET_BASE}vendor/mediapipe/wasm`
const FACE_LANDMARKER_MODEL_PATH = `${ASSET_BASE}vendor/mediapipe/models/face_landmarker.task`

type WorkerRequest =
  | { type: 'init' }
  | { type: 'detect'; image: ImageBitmap; timestamp: number }
  | { type: 'reset' }
  | { type: 'close' }

type WorkerResponse =
  | { type: 'ready' }
  | { type: 'students'; students: StudentDetection[]; processingMs: number }
  | { type: 'error'; message: string }

let landmarker: FaceLandmarker | null = null
let initPromise: Promise<void> | null = null
const smoother = new StateSmoother()
const tracker = new FaceTracker()
let lastKnownStudents = new Map<number, StudentDetection>()

function postResponse(response: WorkerResponse) {
  self.postMessage(response)
}

async function initLandmarker() {
  if (landmarker) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH)
    landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: FACE_LANDMARKER_MODEL_PATH,
        delegate: 'GPU',
      },
      minFaceDetectionConfidence: 0.35,
      minFacePresenceConfidence: 0.3,
      minTrackingConfidence: 0.3,
      outputFacialTransformationMatrixes: true,
      outputFaceBlendshapes: false,
      numFaces: MAX_FACES,
      runningMode: 'VIDEO',
    })
  })()

  return initPromise
}

function resetTracking() {
  smoother.clear()
  tracker.clear()
  lastKnownStudents.clear()
}

function detectStudents(image: ImageBitmap, timestamp: number): StudentDetection[] {
  if (!landmarker) return []

  const result = landmarker.detectForVideo(image, timestamp)
  const boxes = (result.faceLandmarks ?? []).map((landmarks) => {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const landmark of landmarks) {
      if (landmark.x < minX) minX = landmark.x
      if (landmark.y < minY) minY = landmark.y
      if (landmark.x > maxX) maxX = landmark.x
      if (landmark.y > maxY) maxY = landmark.y
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  })

  const now = performance.now()
  const stableIds = tracker.assignStableIds(boxes, now)
  const detected: StudentDetection[] = []

  for (let i = 0; i < boxes.length; i++) {
    const stableId = stableIds[i]
    let pose = null
    const matrix = result.facialTransformationMatrixes?.[i]

    if (matrix?.data && isMatrixValid(matrix.data)) {
      pose = extractHeadPose(matrix.data)
    }

    detected.push({
      stableId,
      boundingBox: boxes[i],
      pose,
      state: smoother.update(stableId, classifyAttention(pose)),
    })
  }

  const nextStudents = [...detected]
  const recentMissingIds = tracker.getRecentlyMissingTrackIds(stableIds, now, LOST_FACE_GRACE_MS)

  for (const stableId of recentMissingIds) {
    const previousStudent = lastKnownStudents.get(stableId)
    if (previousStudent) nextStudents.push(previousStudent)
  }

  lastKnownStudents = new Map(nextStudents.map((student) => [student.stableId, student]))
  return nextStudents
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data

  try {
    if (request.type === 'init') {
      await initLandmarker()
      postResponse({ type: 'ready' })
      return
    }

    if (request.type === 'detect') {
      await initLandmarker()
      const startedAt = performance.now()
      const students = detectStudents(request.image, request.timestamp)
      request.image.close()
      postResponse({ type: 'students', students, processingMs: performance.now() - startedAt })
      return
    }

    if (request.type === 'reset') {
      resetTracking()
      return
    }

    if (request.type === 'close') {
      resetTracking()
      landmarker?.close()
      landmarker = null
      initPromise = null
    }
  } catch {
    if (request.type === 'detect') {
      request.image.close()
    }
    postResponse({ type: 'error', message: 'Unable to process face detection.' })
  }
}
