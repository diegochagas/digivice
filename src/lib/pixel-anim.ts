/**
 * Procedural LCD-style sprite animation, in the spirit of the Digital Monster
 * virtual pets: a 1-bit grid per Digimon plus code-driven motion (bob, walk,
 * hop, shake, squash) and small overlay glyphs (hearts, Zs, sweat, steam...).
 *
 * Everything here is pure: `frameAt(sprite, anim, t)` returns the pixels to
 * paint for time `t`, so the canvas component only has to draw.
 */
import type { Emotion } from './types'

/** 1-bit sprite: rows of '#' (dark) and '.' (clear), all rows the same width. */
export interface PixelSprite {
  w: number
  h: number
  rows: string[]
}

export type Bits = boolean[][]

export function toBits(sprite: PixelSprite): Bits {
  return sprite.rows.map(r => Array.from(r, ch => ch === '#'))
}

export function flipBits(b: Bits): Bits {
  return b.map(row => [...row].reverse())
}

/** Shift a grid by (dx, dy); pixels leaving the grid are dropped. */
export function shiftBits(b: Bits, dx: number, dy: number): Bits {
  const h = b.length
  const w = b[0]?.length ?? 0
  const out: Bits = Array.from({ length: h }, () => Array(w).fill(false))
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!b[y][x]) continue
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) out[ny][nx] = true
    }
  }
  return out
}

/** Squash the sprite vertically by `rows` (bottom-anchored), widening slightly. */
export function squashBits(b: Bits, rows: number): Bits {
  const h = b.length
  const w = b[0]?.length ?? 0
  const bottom = lastRow(b)
  const top = firstRow(b)
  if (bottom < 0 || bottom - top < 4 || rows <= 0) return b
  const srcH = bottom - top + 1
  const dstH = srcH - rows
  const out: Bits = Array.from({ length: h }, () => Array(w).fill(false))
  for (let y = 0; y < dstH; y++) {
    const sy = top + Math.floor((y / dstH) * srcH)
    const dy = bottom - dstH + 1 + y
    for (let x = 0; x < w; x++) {
      if (b[sy][x]) {
        out[dy][x] = true
        // widen a touch near the bottom to sell the squash
        if (y > dstH * 0.6) {
          if (x + 1 < w && !b[sy][x + 1] && x > w / 2) out[dy][x + 1] = true
          if (x - 1 >= 0 && !b[sy][x - 1] && x < w / 2) out[dy][x - 1] = true
        }
      }
    }
  }
  return out
}

/** Stretch the sprite vertically by `rows` (bottom-anchored). */
export function stretchBits(b: Bits, rows: number): Bits {
  const h = b.length
  const w = b[0]?.length ?? 0
  const bottom = lastRow(b)
  const top = firstRow(b)
  if (bottom < 0 || rows <= 0) return b
  const srcH = bottom - top + 1
  const dstH = Math.min(h, srcH + rows)
  const out: Bits = Array.from({ length: h }, () => Array(w).fill(false))
  for (let y = 0; y < dstH; y++) {
    const sy = top + Math.floor((y / dstH) * srcH)
    const dy = bottom - dstH + 1 + y
    if (dy < 0) continue
    for (let x = 0; x < w; x++) if (b[sy][x]) out[dy][x] = true
  }
  return out
}

/** Close the eyes: blank the darkest small clusters in the upper third (cheap heuristic: drop 1-row segments). */
export function sleepyBits(b: Bits): Bits {
  const h = b.length
  const top = firstRow(b)
  const bottom = lastRow(b)
  const eyeBand = [top + Math.floor((bottom - top) * 0.15), top + Math.floor((bottom - top) * 0.45)]
  return b.map((row, y) => {
    if (y < eyeBand[0] || y > eyeBand[1]) return row
    // remove isolated dark pixels (eyes/pupils) inside the band; keep outlines (runs of 2+)
    return row.map((v, x) => v && !(!(row[x - 1] ?? false) && !(row[x + 1] ?? false)))
  })
}

/** Leftmost / rightmost occupied column, or -1 when the grid is empty. */
export function firstCol(b: Bits): number {
  const w = b[0]?.length ?? 0
  for (let x = 0; x < w; x++) if (b.some(row => row[x])) return x
  return -1
}

export function lastCol(b: Bits): number {
  const w = b[0]?.length ?? 0
  for (let x = w - 1; x >= 0; x--) if (b.some(row => row[x])) return x
  return -1
}

/**
 * X for a prop (food, ball) sitting in front of the creature: just beyond its
 * leading edge on the side it faces, clamped to stay on screen. Anchored to the
 * creature rather than to the screen edge, so props follow it as it turns.
 */
export function frontX(b: Bits, glyphW: number, face: number, w: number, gap = 1): number {
  const right = lastCol(b)
  const left = firstCol(b)
  if (right < 0) return face > 0 ? w - glyphW : 0
  const x = face > 0 ? right + gap : left - gap - glyphW
  return Math.max(0, Math.min(w - glyphW, x))
}

export function firstRow(b: Bits): number {
  return b.findIndex(r => r.some(Boolean))
}

export function lastRow(b: Bits): number {
  for (let y = b.length - 1; y >= 0; y--) if (b[y].some(Boolean)) return y
  return -1
}

// ---------------------------------------------------------------------------
// Glyphs drawn around the sprite
// ---------------------------------------------------------------------------
export const GLYPHS: Record<string, string[]> = {
  heart: ['.#.#.', '#####', '#####', '.###.', '..#..'],
  heartSmall: ['#.#', '###', '.#.'],
  z: ['###', '..#', '.#.', '#..', '###'],
  zSmall: ['##', '.#', '#.', '##'],
  question: ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'],
  exclaim: ['#', '#', '#', '.', '#'],
  sweat: ['.#.', '.#.', '###', '###', '.#.'],
  steam: ['.#.', '#.#', '.#.', '#.#'],
  star: ['..#..', '.###.', '#####', '.###.', '..#..'],
  sparkle: ['.#.', '###', '.#.'],
  music: ['..#', '..#', '.##', '###', '##.'],
  meat: ['..####..', '.######.', '########', '########', '.######.', '..#..#..', '..#..#..', '.##..##.'],
  meatBitten: ['..###...', '.#####..', '######..', '######..', '.#####..', '..#..#..', '..#..#..', '.##..##.'],
  meatBitten2: ['........', '.##.....', '####....', '####....', '.###....', '..#..#..', '..#..#..', '.##..##.'],
  ball: ['.####.', '#.####', '#.####', '######', '######', '.####.'],
  dots: ['#.#.#'],
  drop: ['.#.', '###', '.#.'],
}

export interface GlyphPlacement {
  glyph: string
  x: number
  y: number
}

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------
export type AnimName = Emotion | 'eat' | 'play' | 'sleep' | 'evolve' | 'walk'

export interface Frame {
  bits: Bits
  glyphs: GlyphPlacement[]
  /** Whole-screen inversion flash (evolution). */
  invert?: boolean
  /** Sprite hidden this frame (evolution flicker). */
  hidden?: boolean
}

/** Frames per second for the LCD feel. */
export const FPS = 4

interface AnimContext {
  base: Bits
  /** Second sprite for evolution transitions. */
  target?: Bits
  /** Grid width/height. */
  w: number
  h: number
  /** Facing: 1 = right, -1 = left. */
  facing: number
}

const rnd = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

/**
 * Layout of the sprite grid, matching scripts/build-pixel-sprites.py: the
 * creature stands in the lower band, leaving the top rows free for glyphs and
 * a few columns each side to walk into.
 */
export const HEADROOM = 10
export const FLOOR = 2
const SIDEROOM = 5

/** Compute the frame for animation `anim` at LCD tick `tick` (integer, FPS per second). */
export function frameAt(anim: AnimName, tick: number, ctx: AnimContext): Frame {
  const { base, w, h } = ctx
  const cx = Math.floor(w / 2)
  const g: GlyphPlacement[] = []
  const face = ctx.facing
  // Glyphs live in the free band above the creature.
  const skyLow = HEADROOM - 5
  const skyHigh = 1

  switch (anim) {
    case 'neutral':
    case 'walk': {
      // Stroll a few columns one way, pause, then the renderer flips the facing.
      const cycle = tick % 20
      const dx = cycle < 10 ? Math.min(SIDEROOM - 1, cycle) : Math.max(0, SIDEROOM - 1 - (cycle - 10))
      const step = tick % 2 === 0 ? base : squashBits(base, 1)
      return { bits: shiftBits(step, dx * face, 0), glyphs: g }
    }

    case 'happy': {
      const phase = tick % 4
      const dy = phase === 1 ? -2 : phase === 2 ? -3 : phase === 3 ? -1 : 0
      const bits = phase === 0 ? squashBits(base, 2) : shiftBits(base, 0, dy)
      if (phase >= 1) g.push({ glyph: 'music', x: cx + 6, y: skyLow - (phase - 1) })
      return { bits, glyphs: g }
    }

    case 'excited': {
      const phase = tick % 3
      const dy = phase === 1 ? -4 : phase === 2 ? -2 : 0
      const bits = phase === 0 ? squashBits(base, 2) : shiftBits(base, 0, dy)
      g.push({ glyph: 'sparkle', x: 2, y: skyLow - (tick % 2) })
      g.push({ glyph: 'sparkle', x: w - 5, y: skyHigh + (tick % 2) })
      if (tick % 2) g.push({ glyph: 'star', x: cx - 2, y: skyHigh })
      return { bits, glyphs: g }
    }

    case 'sad': {
      // Head hangs: the whole body sinks and stays down, with a slow tear.
      const bits = shiftBits(squashBits(base, 1), 0, tick % 4 < 2 ? 1 : 0)
      g.push({ glyph: 'drop', x: cx + 5, y: HEADROOM + 2 + (tick % 4) })
      return { bits, glyphs: g }
    }

    case 'angry': {
      const shake = tick % 2 === 0 ? -2 : 2
      const bits = shiftBits(base, shake, 0)
      g.push({ glyph: 'steam', x: cx + 7, y: skyLow + (tick % 2) })
      g.push({ glyph: 'steam', x: cx - 9, y: skyLow - (tick % 2) })
      return { bits, glyphs: g }
    }

    case 'hungry': {
      // Leans toward the food and back, drooling.
      const lean = tick % 4 < 2 ? 1 : 0
      const bits = shiftBits(tick % 4 < 2 ? squashBits(base, 1) : base, lean * face, 0)
      g.push({ glyph: 'meat', x: frontX(base, 8, face, w, 1), y: HEADROOM - 2 })
      if (tick % 4 >= 2) g.push({ glyph: 'drop', x: cx + 2, y: HEADROOM + 3 })
      return { bits, glyphs: g }
    }

    case 'sleepy': {
      // Awake but drooping: eyes half shut, head nodding, no wandering.
      const nod = tick % 6 < 3 ? 1 : 0
      const bits = shiftBits(squashBits(sleepyBits(base), 1), 0, nod)
      if (tick % 6 >= 3) g.push({ glyph: 'zSmall', x: cx + 7, y: skyLow })
      return { bits, glyphs: g }
    }

    case 'sleep': {
      // Lying down: squashed flat on the floor, eyes closed, Zs drifting up.
      const rise = tick % 8
      const bits = shiftBits(squashBits(sleepyBits(base), rise < 4 ? 2 : 3), 0, FLOOR)
      g.push({ glyph: 'z', x: cx + 6, y: Math.max(skyHigh, skyLow - rise) })
      if (rise >= 4) g.push({ glyph: 'zSmall', x: cx + 10, y: Math.max(skyHigh, skyLow - rise + 3) })
      return { bits, glyphs: g }
    }

    case 'thinking': {
      const bits = tick % 6 === 5 ? shiftBits(base, 1, 0) : base
      if (tick % 4 !== 3) g.push({ glyph: 'question', x: cx + 6, y: skyHigh })
      return { bits, glyphs: g }
    }

    case 'surprised': {
      const phase = tick % 4
      const bits = phase === 0 ? stretchBits(base, 3) : phase === 1 ? shiftBits(base, -2 * face, 0) : base
      g.push({ glyph: 'exclaim', x: cx + 7, y: skyHigh })
      if (phase < 2) g.push({ glyph: 'sweat', x: cx - 9, y: skyLow })
      return { bits, glyphs: g }
    }

    case 'love': {
      const bits = shiftBits(base, 0, tick % 2)
      const t = tick % 8
      g.push({ glyph: 'heart', x: cx + 5, y: Math.max(skyHigh, skyLow - t) })
      if (t > 3) g.push({ glyph: 'heartSmall', x: cx - 8, y: Math.max(skyHigh, skyLow - (t - 4)) })
      return { bits, glyphs: g }
    }

    case 'eat': {
      // 12 ticks: lunge at the food, which shrinks bite by bite.
      const t = tick % 12
      const lunge = t % 2 === 0 ? 0 : 2
      const bits = shiftBits(t % 2 === 1 ? squashBits(base, 1) : base, lunge * face, 0)
      const meat = t < 4 ? 'meat' : t < 8 ? 'meatBitten' : t < 11 ? 'meatBitten2' : ''
      if (meat) g.push({ glyph: meat, x: frontX(base, 8, face, w, 2), y: HEADROOM - 2 })
      if (t >= 11) g.push({ glyph: 'heartSmall', x: cx + 4, y: skyLow })
      return { bits, glyphs: g }
    }

    case 'play': {
      // 16 ticks, a clear beat: run at the ball, crouch, leap over it, kick it
      // away, then celebrate. Big horizontal travel so it reads as playing.
      const t = tick % 16
      const ballHome = frontX(base, 6, face, w, 5)
      let dx = 0
      let dy = 0
      let bits = base
      if (t < 5) {
        dx = t < 4 ? t : 4
        bits = t % 2 ? squashBits(base, 1) : base
      } else if (t === 5) {
        dx = 4
        bits = squashBits(base, 3)   // crouch before the leap
      } else if (t < 9) {
        dx = 4
        dy = t === 6 ? -6 : t === 7 ? -8 : -4
      } else if (t < 12) {
        dx = 4 - (t - 9)
        bits = t % 2 ? squashBits(base, 1) : base
      } else {
        dx = 0
        dy = t % 2 ? -3 : 0
        bits = t % 2 ? base : squashBits(base, 2)
      }
      bits = shiftBits(bits, dx * face, dy)
      if (t < 8) {
        // the ball bounces in place while the Digimon runs up to it
        g.push({ glyph: 'ball', x: ballHome, y: h - FLOOR - 6 - (t % 2 ? 2 : 0) })
      } else if (t < 12) {
        // kicked: flies away and upward, out of frame
        const k = t - 8
        const bx = ballHome + k * 3 * face
        g.push({ glyph: 'ball', x: bx, y: Math.max(skyHigh, h - FLOOR - 6 - k * 4) })
      } else {
        g.push({ glyph: 'sparkle', x: cx + (t % 2 ? 7 : -9), y: skyLow })
      }
      return { bits, glyphs: g }
    }

    case 'evolve': {
      // 16 ticks: flicker faster and faster with inverted flashes, then the new form.
      const t = tick % 16
      const target = ctx.target ?? base
      if (t >= 13) return { bits: target, glyphs: [{ glyph: 'star', x: 2, y: skyHigh }, { glyph: 'star', x: w - 7, y: skyHigh + 1 }] }
      const showTarget = t >= 8 && t % 2 === 0
      const hidden = t % 3 === 2 && t < 8
      const invert = t >= 6 && t % 2 === 1
      const jitter = Math.floor(rnd(t) * 3) - 1
      return { bits: shiftBits(showTarget ? target : base, jitter, 0), glyphs: g, invert, hidden }
    }

    default:
      return { bits: base, glyphs: g }
  }
}

/** Length in ticks of a one-shot animation, or null for looping ones. */
export function animLength(anim: AnimName): number | null {
  switch (anim) {
    case 'eat':
      return 12
    case 'play':
      return 16
    case 'evolve':
      return 16
    default:
      return null
  }
}
