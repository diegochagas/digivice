'use client'

import { useEffect, useRef } from 'react'
import { animLength, FPS, frameAt, flipBits, GLYPHS, toBits, type AnimName, type PixelSprite } from '@/lib/pixel-anim'

export interface PixelEvent {
  /** One-shot animation to play before returning to the mood loop. */
  anim: 'eat' | 'play' | 'evolve'
  /** Sprite to end on (evolution). */
  target?: PixelSprite | null
  /** Unique id so the same event can fire twice in a row. */
  id: number
}

interface PixelDigimonProps {
  sprite: PixelSprite | null
  mood: AnimName
  event?: PixelEvent | null
  onEventEnd?: (event: PixelEvent) => void
  size: number
  /** LCD colours. */
  ink?: string
  paper?: string
}

/**
 * Canvas renderer for the LCD Digimon: draws the frame produced by
 * `frameAt` `FPS` times per second, with the sprite facing its walking
 * direction. Pure drawing, no React state per frame.
 */
export function PixelDigimon({ sprite, mood, event, onEventEnd, size, ink = '#16241a', paper = '#a9bf95' }: PixelDigimonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ tick: 0, facing: 1, event: null as PixelEvent | null, eventStart: 0, lastAnim: '' as string })
  const propsRef = useRef({ sprite, mood, event, onEventEnd, ink, paper })
  propsRef.current = { sprite, mood, event, onEventEnd, ink, paper }

  // Register a new one-shot event.
  useEffect(() => {
    if (!event) return
    const s = stateRef.current
    if (s.event?.id === event.id) return
    s.event = event
    s.eventStart = s.tick
  }, [event])

  useEffect(() => {
    let raf = 0
    let last = 0
    const interval = 1000 / FPS

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      if (now - last < interval) return
      last = now
      const canvas = canvasRef.current
      const { sprite, mood, onEventEnd, ink, paper } = propsRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const s = stateRef.current
      s.tick++

      ctx.fillStyle = paper
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      if (!sprite) return

      const w = sprite.w
      const h = sprite.h
      const cell = Math.floor(size / Math.max(w, h))
      const ox = Math.floor((size - w * cell) / 2)
      const oy = Math.floor((size - h * cell) / 2)

      let anim: AnimName = mood
      let localTick = s.tick
      let target: PixelSprite | null | undefined
      if (s.event) {
        anim = s.event.anim
        localTick = s.tick - s.eventStart
        target = s.event.target
        const len = animLength(anim)
        if (len !== null && localTick >= len) {
          const done = s.event
          s.event = null
          anim = mood
          localTick = s.tick
          onEventEnd?.(done)
        }
      }

      // Facing flips when the idle wander reverses direction. Sprites are built
      // facing right, so eating and playing lock to that: the creature must look
      // at the food or the ball, never away from it.
      if (anim === 'eat' || anim === 'play') {
        s.facing = 1
      } else if (anim === 'neutral') {
        const cycle = s.tick % 48
        s.facing = cycle < 24 ? 1 : -1
      }
      if (anim !== s.lastAnim) s.lastAnim = anim

      const baseBits = toBits(sprite)
      const targetBits = target ? toBits(target) : undefined
      const frame = frameAt(anim, localTick, {
        base: s.facing < 0 ? flipBits(baseBits) : baseBits,
        target: targetBits && s.facing < 0 ? flipBits(targetBits) : targetBits,
        w,
        h,
        facing: s.facing,
      })

      if (frame.invert) {
        ctx.fillStyle = ink
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      const fg = frame.invert ? paper : ink
      ctx.fillStyle = fg
      if (!frame.hidden) {
        for (let y = 0; y < h; y++) {
          const row = frame.bits[y]
          if (!row) continue
          for (let x = 0; x < w; x++) {
            if (row[x]) ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell)
          }
        }
      }
      for (const g of frame.glyphs) {
        const rows = GLYPHS[g.glyph]
        if (!rows) continue
        for (let gy = 0; gy < rows.length; gy++) {
          for (let gx = 0; gx < rows[gy].length; gx++) {
            if (rows[gy][gx] !== '#') continue
            const x = g.x + gx
            const y = g.y + gy
            if (x < 0 || y < 0 || x >= w || y >= h) continue
            ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell)
          }
        }
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size])

  return <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size, imageRendering: 'pixelated' }} />
}
