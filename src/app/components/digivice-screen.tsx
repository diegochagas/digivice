'use client'

import { useEffect, useRef, useState } from 'react'
import { PixelDigimon, type PixelEvent } from './pixel-digimon'
import type { AnimName, PixelSprite } from '@/lib/pixel-anim'

interface DigiviceScreenProps {
  imageSrc: string | null
  alt: string
  evolutionVideo: string | null
  onEvolutionEnd?: () => void
  sleeping?: boolean
  onLeftButton?: () => void
  onTopRight?: () => void
  onBottomRight?: () => void
  leftLabel?: string
  topRightLabel?: string
  bottomRightLabel?: string
  /** LCD mode: animated 1-bit sprite instead of the illustration. */
  pixel?: { sprite: PixelSprite | null; mood: AnimName; event: PixelEvent | null; onEventEnd: (e: PixelEvent) => void } | null
}

/** The Digivice frame from the original digivice app, with a Digimon (or evolution video) on the screen. */
export function DigiviceScreen({
  imageSrc, alt, evolutionVideo, onEvolutionEnd, sleeping,
  onLeftButton, onTopRight, onBottomRight, leftLabel, topRightLabel, bottomRightLabel, pixel,
}: DigiviceScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  // Play the evolution clip once, and never let a stalled/blocked video keep the
  // Digivice stuck: whatever happens, finish after the clip length (5 s) + margin.
  useEffect(() => {
    if (!evolutionVideo) {
      setPlaying(false)
      return
    }
    setPlaying(true)
    const finish = () => {
      setPlaying(false)
      onEvolutionEnd?.()
    }
    const kick = setTimeout(() => videoRef.current?.play().catch(() => undefined), 50)
    const safety = setTimeout(finish, 8000)
    return () => {
      clearTimeout(kick)
      clearTimeout(safety)
    }
  }, [evolutionVideo]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative mx-auto select-none" style={{ width: 280, height: 248 }}>
      <button
        aria-label={leftLabel}
        title={leftLabel}
        className="absolute z-50 rounded-full bg-transparent hover:bg-sky-400/40 active:bg-sky-400/60"
        style={{ top: 99, left: 16, width: 54, height: 54 }}
        onClick={onLeftButton}
      />
      <button
        aria-label={topRightLabel}
        title={topRightLabel}
        className="absolute z-50 rounded-full bg-transparent hover:bg-sky-400/40 active:bg-sky-400/60"
        style={{ top: 77, right: 24, width: 48, height: 32 }}
        onClick={onTopRight}
      />
      <button
        aria-label={bottomRightLabel}
        title={bottomRightLabel}
        className="absolute z-50 rounded-full bg-transparent hover:bg-sky-400/40 active:bg-sky-400/60"
        style={{ top: 139, right: 24, width: 48, height: 32 }}
        onClick={onBottomRight}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/digivice.png" alt="digivice frame" className="relative z-40" width={280} height={248} draggable={false} />

      {pixel && (
        <div className="absolute z-30" style={{ top: 64, left: 80, width: 112, height: 112 }}>
          <PixelDigimon sprite={pixel.sprite} mood={pixel.mood} event={pixel.event} onEventEnd={pixel.onEventEnd} size={112} />
        </div>
      )}

      {!pixel && !playing && imageSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={imageSrc}
          src={imageSrc}
          alt={alt}
          width={88}
          height={88}
          draggable={false}
          className={`absolute z-30 pixel ${sleeping ? 'opacity-60 grayscale-[0.3]' : 'animate-bob'}`}
          style={{ top: 82, left: 95 }}
        />
      )}

      {!pixel && sleeping && !playing && (
        <div className="absolute z-30 text-sky-200 text-xs font-bold blink" style={{ top: 74, left: 150 }}>z z z</div>
      )}

      {!pixel && evolutionVideo && playing && (
        <video
          key={evolutionVideo}
          ref={videoRef}
          className="absolute z-30"
          style={{ width: 110, height: 110, top: 69, left: 84 }}
          src={evolutionVideo}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={() => {
            setPlaying(false)
            onEvolutionEnd?.()
          }}
          onError={() => {
            setPlaying(false)
            onEvolutionEnd?.()
          }}
        />
      )}

      <div className="absolute z-10" style={{ top: 64, left: 80, width: 112, height: 112, backgroundColor: 'var(--screen)' }} />
    </div>
  )
}
