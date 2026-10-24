/** Clamp `value` into [lo, hi]; the pet stats all live in 0..100. Example: clamp(130) → 100. */
export function clamp(value: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, value))
}
