import data from '@/data/pixel-sprites.json'
import type { PixelSprite } from './pixel-anim'

interface SpriteFile {
  grid: number
  sprites: Record<string, PixelSprite>
}

const file = data as SpriteFile

export const PIXEL_GRID = file.grid

/** 1-bit sprite for a form, or null when it has not been built yet. */
export function getPixelSprite(form: string | null | undefined): PixelSprite | null {
  if (!form) return null
  return file.sprites[form] ?? null
}
