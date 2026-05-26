type Pt = { x: number; y: number }

function dist(a: Pt, b: Pt) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

// Gaussian elimination to solve n×n linear system
function gaussSolve(A: number[][], b: number[]): number[] {
  const n = A.length
  const M = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row
    }
    ;[M[col], M[maxRow]] = [M[maxRow], M[col]]
    if (Math.abs(M[col][col]) < 1e-10) throw new Error('Singular matrix')
    for (let row = col + 1; row < n; row++) {
      const f = M[row][col] / M[col][col]
      for (let j = col; j <= n; j++) M[row][j] -= f * M[col][j]
    }
  }

  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n]
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j]
    x[i] /= M[i][i]
  }
  return x
}

// Compute 3×3 homography H (9-element, row-major, h33=1) that maps src→dst.
// Corners in order: TL, TR, BR, BL
function computeHomography(src: [Pt, Pt, Pt, Pt], dst: [Pt, Pt, Pt, Pt]): number[] {
  const A: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i]
    const { x: u, y: v } = dst[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    b.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y])
    b.push(v)
  }
  const h = gaussSolve(A, b)
  return [...h, 1]
}

function applyH(H: number[], x: number, y: number): Pt {
  const w = H[6] * x + H[7] * y + H[8]
  return { x: (H[0] * x + H[1] * y + H[2]) / w, y: (H[3] * x + H[4] * y + H[5]) / w }
}

// Compute the output dimensions that preserve the painting's natural proportions
function naturalSize(tl: Pt, tr: Pt, br: Pt, bl: Pt) {
  return {
    w: Math.round((dist(tl, tr) + dist(bl, br)) / 2),
    h: Math.round((dist(tl, bl) + dist(tr, br)) / 2),
  }
}

export interface DistortParams {
  // Pixel coordinates for e_distort (where each source image corner goes in output)
  // Order: TL, TR, BR, BL of the SOURCE image
  distortCoords: number[]
  // Where to crop in the output to extract just the painting
  cropX: number
  cropY: number
  outW: number
  outH: number
}

// Returns e_distort parameters for perspective-correcting the painting defined by its
// 4 corner positions in the source image. Returns null if corners are nearly rectangular
// (bounding-box crop is sufficient) or if computation fails.
export function perspectiveDistortParams(
  corners: { tl: Pt; tr: Pt; br: Pt; bl: Pt },
  imgW: number,
  imgH: number,
): DistortParams | null {
  const { tl, tr, br, bl } = corners

  // Check if corners deviate significantly from a rectangle
  const maxTilt = Math.max(
    Math.abs(tl.y - tr.y),
    Math.abs(bl.y - br.y),
    Math.abs(tl.x - bl.x),
    Math.abs(tr.x - br.x),
  )
  if (maxTilt < Math.min(imgW, imgH) * 0.015) return null

  const { w: outW, h: outH } = naturalSize(tl, tr, br, bl)
  if (outW < 10 || outH < 10) return null

  let H: number[]
  try {
    H = computeHomography(
      [tl, tr, br, bl],
      [{ x: 0, y: 0 }, { x: outW, y: 0 }, { x: outW, y: outH }, { x: 0, y: outH }],
    )
  } catch {
    return null
  }

  // Map source image corners to output positions via H
  const srcCorners: [Pt, Pt, Pt, Pt] = [
    { x: 0, y: 0 },
    { x: imgW, y: 0 },
    { x: imgW, y: imgH },
    { x: 0, y: imgH },
  ]
  const dstCorners = srcCorners.map(p => applyH(H, p.x, p.y))

  // Shift to keep all positions ≥ 0 (Cloudinary auto-expands canvas leftward/upward)
  const minX = Math.min(...dstCorners.map(p => p.x))
  const minY = Math.min(...dstCorners.map(p => p.y))
  const shiftX = Math.max(0, Math.ceil(-minX))
  const shiftY = Math.max(0, Math.ceil(-minY))

  const distortCoords = dstCorners.flatMap(p => [
    Math.round(p.x + shiftX),
    Math.round(p.y + shiftY),
  ])

  return { distortCoords, cropX: shiftX, cropY: shiftY, outW, outH }
}
