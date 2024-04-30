import { Ref, useEffect, useState } from 'react'
import Image from 'next/image'
import { Crests } from '@/data/types/crest'

interface DigiviceProps {
  crests: Crests
  crestIndex: number
  digimonIndex: number
  videoRef: Ref<HTMLVideoElement>
  isVideoPlaying: boolean
  hasVideoEnded: boolean
  handleVideoEnd: () => void
}

export function Assets({
  crests,
  crestIndex,
  digimonIndex,
  videoRef,
  isVideoPlaying,
  hasVideoEnded,
  handleVideoEnd
 }: DigiviceProps) {
  const [videoSrc, setVideoSrc] = useState('/videos/courage/agumon.mp4')
  const [imageSrc, setImageSrc] = useState('/images/courage/koromon.png')
  const digimons = crests[crestIndex].digimons
  const [isLastDigimon, setIsLastDigimon] = useState(digimonIndex >= digimons.length - 1)
  const randomNumber = Math.floor(Math.random() * 4) + 1
  const isAlternativeEvolution = randomNumber === 4
  const isCourageCrest = crestIndex === 0
  const isSkullGreymon = isAlternativeEvolution && isCourageCrest && digimonIndex === 2
  const isShowingSkullGreymon = isAlternativeEvolution && isCourageCrest && digimonIndex === 3
    
  useEffect(() => {
    const digimonNewIndex = isLastDigimon ? 1 : digimonIndex + 1
    const digimon = crests[crestIndex].digimons[digimonNewIndex]
    const crest = crests[crestIndex].name
    if (digimonIndex >= 4) setVideoSrc(`/videos/${digimon}.mp4`)
    else if (isSkullGreymon) setVideoSrc(`/videos/${crest}/${crests[crestIndex]?.alternativeEvolution}.mp4`)
    else setVideoSrc(`/videos/${crest}/${digimon}.mp4`)
  }, [crestIndex, crests, digimonIndex, isLastDigimon, isSkullGreymon, setVideoSrc])

  useEffect(() => {
    const crest = crests[crestIndex].name
    const imageIndex = !hasVideoEnded && digimonIndex >= 1 ? digimonIndex - 1 : digimonIndex
    const digimon = crests[crestIndex].digimons[imageIndex]
    if (digimonIndex >= 5 ) setImageSrc(`/images/${digimon}.png`)
    else if (isShowingSkullGreymon) setImageSrc(`/images/${crest}/${crests[crestIndex]?.alternativeEvolution}.png`)
    else setImageSrc(`/images/${crest}/${digimon}.png`)
  }, [crestIndex, crests, digimonIndex, hasVideoEnded, isShowingSkullGreymon, setImageSrc])

  useEffect(() => {
    if (isShowingSkullGreymon) setIsLastDigimon(true)
    else setIsLastDigimon(digimonIndex >= digimons.length - 1)
  }, [digimonIndex, digimons.length, isShowingSkullGreymon, setIsLastDigimon])
  
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
        <>
          <Image
            className="absolute top-[82px] left-[95px] z-30"
            src={imageSrc}
            alt="digimon"
            width={88}
            height={88}
          />
          <div className="absolute top-16 left-20 w-28 h-28 z-20" style={{ backgroundColor: '#0f2425' }} />
        </>
      )}

      <video
        className="absolute w-[90px] h-[90px] top-[81px] left-[94px] z-10"
        ref={videoRef}
        preload="none"
        onEnded={handleVideoEnd}
      >
        <source src={videoSrc} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </>
  )
}