/**
 * Server-side perspective correction via backward-mapped homography warp.
 *
 * The user marks 4 corners of the painting in the original photo. We compute
 * the projective transformation (homography) that maps those corners to the 4
 * corners of a rectangle, then apply it pixel-by-pixel with bilinear
 * interpolation using sharp's raw buffer API.
 *
 * Output dimensions use the MAX of each pair of opposite edges — the wider/taller
 * edge is closer to the camera and therefore less perspective-compressed, giving
 * a better estimate of the painting's true physical proportions.
 */

import sharp from 'sharp'
import type { Corners } from '@/types/painting'

type Pt = { x: number; y: number }

// ---------------------------------------------------------------------------
// Gaussian elimination for n×n linear system
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 3×3 homography (9-element row-major, h[8]=1) that maps src → dst.
// Corners in order: TL, TR, BR, BL
// ---------------------------------------------------------------------------
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

// Apply homography H to point (x, y)
function applyH(H: number[], x: number, y: number): Pt {
  const w = H[6] * x + H[7] * y + H[8]
  return { x: (H[0] * x + H[1] * y + H[2]) / w, y: (H[3] * x + H[4] * y + H[5]) / w }
}

// Analytic 3×3 matrix inverse (adjugate / determinant)
function invertH(H: number[]): number[] {
  const [h0, h1, h2, h3, h4, h5, h6, h7, h8] = H
  const det =
    h0 * (h4 * h8 - h5 * h7) -
    h1 * (h3 * h8 - h5 * h6) +
    h2 * (h3 * h7 - h4 * h6)
  if (Math.abs(det) < 1e-10) throw new Error('Singular homography')
  return [
     (h4 * h8 - h5 * h7) / det,
    -(h1 * h8 - h2 * h7) / det,
     (h1 * h5 - h2 * h4) / det,
    -(h3 * h8 - h5 * h6) / det,
     (h0 * h8 - h2 * h6) / det,
    -(h0 * h5 - h2 * h3) / det,
     (h3 * h7 - h4 * h6) / det,
    -(h0 * h7 - h1 * h6) / det,
     (h0 * h4 - h1 * h3) / det,
  ]
}

// ---------------------------------------------------------------------------
// Output dimensions: use the WIDER of each pair of opposite edges.
// The wider edge is closer to the camera (less perspective foreshortening)
// and therefore a better estimate of the painting's true physical size.
// ---------------------------------------------------------------------------
export function naturalOutputSize(tl: Pt, tr: Pt, br: Pt, bl: Pt) {
  return {
    w: Math.round(Math.max(
      Math.hypot(tr.x - tl.x, tr.y - tl.y),  // top edge
      Math.hypot(br.x - bl.x, br.y - bl.y),  // bottom edge
    )),
    h: Math.round(Math.max(
      Math.hypot(bl.x - tl.x, bl.y - tl.y),  // left edge
      Math.hypot(br.x - tr.x, br.y - tr.y),  // right edge
    )),
  }
}

// Clamp to source bounds, return 0 for out-of-bounds alpha
function getPixel(data: Buffer, w: number, h: number, px: number, py: number, c: number): number {
  if (px < 0 || py < 0 || px >= w || py >= h) return 0
  return data[(py * w + px) * 4 + c]
}

// ---------------------------------------------------------------------------
// Apply a perspective-correct warp to srcBuffer so that the quadrilateral
// defined by `corners` (in source image pixel space) fills an outW×outH
// rectangle in the output. Returns a JPEG buffer.
// ---------------------------------------------------------------------------
export async function warpPerspective(
  srcBuffer: Buffer,
  corners: Pick<Corners, 'tl' | 'tr' | 'br' | 'bl'>,
  outW: number,
  outH: number,
): Promise<Buffer> {
  const { tl, tr, br, bl } = corners

  // Decode to raw RGBA pixels
  const { data, info } = await sharp(srcBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const srcW = info.width
  const srcH = info.height

  // Forward homography: source quad corners → output rectangle corners
  const H = computeHomography(
    [tl, tr, br, bl],
    [
      { x: 0,        y: 0        },
      { x: outW - 1, y: 0        },
      { x: outW - 1, y: outH - 1 },
      { x: 0,        y: outH - 1 },
    ],
  )

  // Inverse for backward mapping (output → source)
  const Hinv = invertH(H)

  const output = Buffer.alloc(outW * outH * 4, 0)

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const { x: sx, y: sy } = applyH(Hinv, x, y)

      // Bilinear interpolation
      const x0 = Math.floor(sx)
      const y0 = Math.floor(sy)
      const fx = sx - x0
      const fy = sy - y0

      const i = (y * outW + x) * 4
      for (let c = 0; c < 4; c++) {
        output[i + c] = Math.round(
          getPixel(data, srcW, srcH, x0,     y0,     c) * (1 - fx) * (1 - fy) +
          getPixel(data, srcW, srcH, x0 + 1, y0,     c) *      fx  * (1 - fy) +
          getPixel(data, srcW, srcH, x0,     y0 + 1, c) * (1 - fx) *      fy  +
          getPixel(data, srcW, srcH, x0 + 1, y0 + 1, c) *      fx  *      fy
        )
      }
    }
  }

  return sharp(output, { raw: { width: outW, height: outH, channels: 4 } })
    .jpeg({ quality: 92 })
    .toBuffer()
}
