import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Crests } from '@/data/types/crest'

interface AssetsProps {
  crests: Crests
  crestIndex: number
  digimonIndex: number
  hasAlternativeEvolution: boolean
  isVideoPlaying: boolean
  setIsVideoPlaying: (isVideoPlaying: boolean) => void
  videoLoaded: boolean
  setVideoLoaded: (videoLoaded: boolean) => void
}

export function Assets({
  crests,
  crestIndex,
  digimonIndex,
  hasAlternativeEvolution,
  isVideoPlaying,
  setIsVideoPlaying,
  videoLoaded,
  setVideoLoaded,
 }: AssetsProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoSrc, setVideoSrc] = useState('/videos/courage/agumon.mp4')
  const [imageSrc, setImageSrc] = useState('/images/courage/koromon.png')
    
  useEffect(() => {
    const isUltimateForm = digimonIndex === 5
    const digimon = (hasAlternativeEvolution) ? crests[crestIndex]?.alternativeEvolution : crests[crestIndex]?.digimons[digimonIndex]
    const folderName = isUltimateForm ? 'ultimate' : crests[crestIndex]?.name
    setVideoSrc(`/videos/${folderName}/${digimon}.mp4`)
  }, [crestIndex, crests, digimonIndex, hasAlternativeEvolution])

  useEffect(() => {
    const isUltimateForm = digimonIndex === 5
    const folderName = isUltimateForm ? 'ultimate' : crests[crestIndex]?.name
    const digimon = (hasAlternativeEvolution) ? crests[crestIndex]?.alternativeEvolution : crests[crestIndex]?.digimons[digimonIndex]
    setImageSrc(`/images/${folderName}/${digimon}.png`)
  }, [crestIndex, crests, digimonIndex, hasAlternativeEvolution])
  
  useEffect(() => {
    if (isVideoPlaying) {
      videoRef.current?.load()
      videoRef.current?.play()
    }
  }, [isVideoPlaying, digimonIndex])

  const handleVideoEnd = () => {
    setIsVideoPlaying(false)
  }

  return (
    <>
      <Image
        className="relative z-40"
        src="/images/digivice.png"
        alt="digivice frame"
        style={{ width:'280px', height: "248px" }}
        width={280}
        height={248}
        priority={true}
      />

      {!isVideoPlaying && ( 
        <Image
          className="absolute top-[82px] left-[95px] z-30"
          src={imageSrc}
          alt="digimon"
          width={88}
          height={88}
        />
      )}

      {videoLoaded && (
        <div className="text-white box-border inline-block absolute w-20 h-20 z-50 top-[86px] left-[99px] -rotate-90">
          <div className="box-border inline-block absolute left-2 w-4 bg-current animate-loading animation-delay-[-0.24s]" />
          <div className="box-border inline-block absolute left-8 w-4 bg-current animate-loading animation-delay-[-0.12s]" />
          <div className="box-border inline-block absolute left-14 w-4 bg-current animate-loading animation-delay-[0s]" />
        </div>
      )}

      {(!isVideoPlaying || videoLoaded) && (
        <div
          className="absolute top-16 left-20 w-28 h-28 z-20"
          style={{ backgroundColor: '#0f2425' }}
        />
      )}

      {isVideoPlaying && (
        <video
          className="absolute w-[110px] h-[110px] top-[69px] left-[84px] z-10"
          ref={videoRef}
          preload="none"
          onLoadedData={() => setVideoLoaded(false)}
          onEnded={handleVideoEnd}
          playsInline
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser can&apos;t show the digimon evolution.
        </video>
      )}
    </>
  )
}