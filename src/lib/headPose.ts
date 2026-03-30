import type { HeadPose } from '../types/attention'

/**
 * Extract Euler angles (pitch/yaw/roll) from a MediaPipe 4×4 column-major
 * facial transformation matrix.
 *
 * The matrix is stored as a flat Float32Array of 16 values in column-major order:
 *   col 0: [m00, m10, m20, m30]  (indices 0-3)
 *   col 1: [m01, m11, m21, m31]  (indices 4-7)
 *   col 2: [m02, m12, m22, m32]  (indices 8-11)
 *   col 3: [m03, m13, m23, m33]  (indices 12-15)
 *
 * MediaPipe coordinate system: X right, Y down, Z forward (into screen).
 * Pitch positive = head tilts back (looking up), negative = looking down.
 * Yaw positive = head turns right, negative = turns left.
 */
export function extractHeadPose(matrixData: number[]): HeadPose {
  // Rotation matrix elements (column-major → row access)
  const m00 = matrixData[0]
  const m10 = matrixData[1]
  const m20 = matrixData[2]
  const m01 = matrixData[4]
  const m11 = matrixData[5]
  const m21 = matrixData[6]
  const m02 = matrixData[8]
  const m12 = matrixData[9]
  const m22 = matrixData[10]

  // ZYX Tait-Bryan decomposition
  // Yaw (Y-axis rotation)
  const yaw = Math.atan2(m20, Math.sqrt(m00 * m00 + m10 * m10))

  // Pitch (X-axis rotation)
  const pitch = Math.atan2(-m21, m22)

  // Roll (Z-axis rotation)
  const roll = Math.atan2(-m10, m00)

  const toDeg = (r: number) => (r * 180) / Math.PI

  return {
    pitch: toDeg(pitch),
    yaw: toDeg(yaw),
    roll: toDeg(roll),
  }
}

/**
 * Validate that the transformation matrix contains finite, reasonable values.
 */
export function isMatrixValid(matrixData: number[]): boolean {
  if (matrixData.length < 16) return false
  for (let i = 0; i < 16; i++) {
    if (!isFinite(matrixData[i])) return false
  }
  return true
}
