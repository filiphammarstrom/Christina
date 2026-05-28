import sharp from 'sharp'
import type { Corners } from '@/types/painting'

type Pt = { x: number; y: number }

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

// Output dimensions: use the wider of each pair of opposite edges.
export function naturalOutputSize(tl: Pt, tr: Pt, br: Pt, bl: Pt) {
  return {
    w: Math.round(Math.max(
      Math.hypot(tr.x - tl.x, tr.y - tl.y),
      Math.hypot(br.x - bl.x, br.y - bl.y),
    )),
    h: Math.round(Math.max(
      Math.hypot(bl.x - tl.x, bl.y - tl.y),
      Math.hypot(br.x - tr.x, br.y - tr.y),
    )),
  }
}

export async function warpPerspective(
  srcBuffer: Buffer,
  corners: Pick<Corners, 'tl' | 'tr' | 'br' | 'bl'>,
  outW: number,
  outH: number,
): Promise<Buffer> {
  const { tl, tr, br, bl } = corners

  // Decode to raw RGB (no alpha — JPEG output doesn't need it, saves 25% memory/compute)
  const { data: src, info } = await sharp(srcBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const srcW = info.width
  const srcH = info.height

  const H = computeHomography(
    [tl, tr, br, bl],
    [
      { x: 0,        y: 0        },
      { x: outW - 1, y: 0        },
      { x: outW - 1, y: outH - 1 },
      { x: 0,        y: outH - 1 },
    ],
  )
  const Hinv = invertH(H)

  // Unpack inverse homography for inline use (avoids array indexing in hot loop)
  const hi0 = Hinv[0], hi1 = Hinv[1], hi2 = Hinv[2]
  const hi3 = Hinv[3], hi4 = Hinv[4], hi5 = Hinv[5]
  const hi6 = Hinv[6], hi7 = Hinv[7]  // hi8 = 1 (normalised)

  const output = Buffer.alloc(outW * outH * 3)
  const srcRowStride = srcW * 3

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      // Backward-map output pixel to source coords via inverse homography
      const wInv = 1 / (hi6 * x + hi7 * y + 1)
      const sx = (hi0 * x + hi1 * y + hi2) * wInv
      const sy = (hi3 * x + hi4 * y + hi5) * wInv

      const x0 = Math.floor(sx)
      const y0 = Math.floor(sy)
      const fx = sx - x0
      const fy = sy - y0

      const oi = (y * outW + x) * 3

      if (x0 >= 0 && y0 >= 0 && x0 + 1 < srcW && y0 + 1 < srcH) {
        // Fast path: all 4 bilinear samples are in-bounds — no branching per channel
        const s00 = y0 * srcRowStride + x0 * 3
        const s10 = s00 + 3
        const s01 = s00 + srcRowStride
        const s11 = s01 + 3
        const w00 = (1 - fx) * (1 - fy)
        const w10 = fx * (1 - fy)
        const w01 = (1 - fx) * fy
        const w11 = fx * fy
        output[oi    ] = (src[s00    ] * w00 + src[s10    ] * w10 + src[s01    ] * w01 + src[s11    ] * w11 + 0.5) | 0
        output[oi + 1] = (src[s00 + 1] * w00 + src[s10 + 1] * w10 + src[s01 + 1] * w01 + src[s11 + 1] * w11 + 0.5) | 0
        output[oi + 2] = (src[s00 + 2] * w00 + src[s10 + 2] * w10 + src[s01 + 2] * w01 + src[s11 + 2] * w11 + 0.5) | 0
      } else {
        // Slow path for border pixels: clamp-to-zero outside source bounds
        const w00 = (1 - fx) * (1 - fy)
        const w10 = fx * (1 - fy)
        const w01 = (1 - fx) * fy
        const w11 = fx * fy
        for (let c = 0; c < 3; c++) {
          let v = 0
          if (x0 >= 0 && y0 >= 0 && x0 < srcW && y0 < srcH)
            v += src[y0 * srcRowStride + x0 * 3 + c] * w00
          if (x0 + 1 >= 0 && y0 >= 0 && x0 + 1 < srcW && y0 < srcH)
            v += src[y0 * srcRowStride + (x0 + 1) * 3 + c] * w10
          if (x0 >= 0 && y0 + 1 >= 0 && x0 < srcW && y0 + 1 < srcH)
            v += src[(y0 + 1) * srcRowStride + x0 * 3 + c] * w01
          if (x0 + 1 >= 0 && y0 + 1 >= 0 && x0 + 1 < srcW && y0 + 1 < srcH)
            v += src[(y0 + 1) * srcRowStride + (x0 + 1) * 3 + c] * w11
          output[oi + c] = (v + 0.5) | 0
        }
      }
    }
  }

  return sharp(output, { raw: { width: outW, height: outH, channels: 3 } })
    .jpeg({ quality: 92 })
    .toBuffer()
}

export { applyH, invertH, computeHomography }
