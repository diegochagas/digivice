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
}

export function Assets({
  crests,
  crestIndex,
  digimonIndex,
  hasAlternativeEvolution,
  isVideoPlaying,
  setIsVideoPlaying
 }: AssetsProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoSrc, setVideoSrc] = useState('/videos/courage/agumon.mp4')
  const [imageSrc, setImageSrc] = useState('/images/courage/koromon.png')
  const [hasVideoEnded, setHasVideoEnded] = useState(false)
  const digimons = crests[crestIndex]?.digimons
  const digimonLastIndex = digimons?.length ? digimons.length - 1 : 0
  const [isLastDigimon, setIsLastDigimon] = useState(digimonIndex >= digimonLastIndex)
  const [isLoading, setIsLoading] = useState(false)
  // const isLoading = !isVideoPlaying && !isShowingImage


  const isCourageCrest = crestIndex === 0
  const isSkullGreymon = hasAlternativeEvolution && isCourageCrest && digimonIndex === 2
  const isShowingSkullGreymon = hasAlternativeEvolution && isCourageCrest && digimonIndex === 3
    
  useEffect(() => {
    const isUltimateForm = digimonIndex === 5
    const digimonNewIndex = isUltimateForm ? 1 : digimonIndex + 1
    // const digimon = crests[crestIndex]?.digimons[digimonNewIndex]
    const digimon = (hasAlternativeEvolution) ? crests[crestIndex]?.alternativeEvolution : crests[crestIndex]?.digimons[digimonIndex]
    const folderName = isUltimateForm ? 'ultimate' : crests[crestIndex]?.name
  //   if (digimonIndex >= 4) {
  //     setVideoSrc(`/videos/${digimon}.mp4`)
  //   } else if {
  //     (isSkullGreymon) setVideoSrc(`/videos/${crest}/${crests[crestIndex]?.alternativeEvolution}.mp4`)
  //   } else {
  //     setVideoSrc(`/videos/${crest}/${digimon}.mp4`)
  //   }
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
      setIsLoading(false)
      videoRef.current?.play()
    }
  }, [isVideoPlaying, digimonIndex])

  // useEffect(() => {
  //   if (isShowingSkullGreymon) {
  //     setIsLastDigimon(true)
  //   } else {
  //     setIsLastDigimon(digimonIndex >= digimonLastIndex)
  //   }
  // }, [digimonIndex, digimonLastIndex, isShowingSkullGreymon, setIsLastDigimon])
  
  // function handleEvolution() {
  //   setIsShowingImage(false)

  //   if (isLastDigimon) {
  //     videoRef.current?.pause()
      
  //     setIsVideoPlaying(false)
  //     setHasVideoEnded(true)
      
  //     setDigimonIndex(0)
  //   } else {
  //     videoRef.current?.load()
  //     videoRef.current?.play()
      
  //     setIsVideoPlaying(true)
  //     setHasVideoEnded(false)

  //     setDigimonIndex(prev => prev + 1)
  //   }
  // }
  
  // function handlePrevCrest() {
  //   setDigimonIndex(0)
  //   setIsVideoPlaying(false)
  //   setIsShowingImage(true)
  //   if (crestIndex > 0) setCrestIndex(prev => prev - 1)
  //   else setCrestIndex(crests.length - 1)
  //   videoRef.current?.load()
  // }
  
  // function handleNextCrest() {
  //   setDigimonIndex(0)
  //   setIsVideoPlaying(false)
  //   setIsShowingImage(true)
  //   if (crestIndex < crests.length - 1) setCrestIndex(prev => prev + 1)
  //   else setCrestIndex(0)
  //   videoRef.current?.load()
  // }

  const handleVideoEnd = () => {
  //   setHasVideoEnded(true)
    setIsVideoPlaying(false)
  //   setIsShowingImage(true)
  }

  const handleLoadedData = () => {
    setIsLoading(true)
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

      {!isVideoPlaying && !videoRef.current && (
        <div className="text-white box-border inline-block absolute w-20 h-20 z-50 top-[86px] left-[99px] -rotate-90">
          <div className="box-border inline-block absolute left-2 w-4 bg-current animate-loading animation-delay-[-0.24s]" />
          <div className="box-border inline-block absolute left-8 w-4 bg-current animate-loading animation-delay-[-0.12s]" />
          <div className="box-border inline-block absolute left-14 w-4 bg-current animate-loading animation-delay-[0s]" />
        </div>
      )}

      {(!isVideoPlaying) && (
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
          onEnded={handleVideoEnd}
          playsInline
          onLoadedData={handleLoadedData}
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser can&apos;t show the digimon evolution.
        </video>
      )}
    </>
  )
}