'use client'

import { useCrest } from '@/context/crest-context'
import { Crests } from '@/data/types/crest'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

interface DigiviceProps {
  crests: Crests
}

export function Digivice({ crests }: DigiviceProps) {
  const { crestIndex, setCrestIndex } = useCrest()
  const digimons = crests[crestIndex].digimons
  const videoRef = useRef<HTMLVideoElement>(null)
  const [digimonIndex, setDigimonIndex] = useState<number>(0)
  const getVideoURL = (crest: string, digimon: string) => `/videos/${crest}/${digimon}.mp4`
  const [videoURL, setVideoURL] = useState(getVideoURL('courage', 'agumon'))
  const getDigimonSrc = (crest: string, digimon: string) => `/images/${crest}/${digimon}.jpg`
  const [digimonSrc, setDigimonSrc] = useState(getDigimonSrc('courage', 'koromon'))
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [hasVideoEnded, setHasVideoEnded] = useState(false)

  useEffect(() => {
    const crest = crests[crestIndex].name
    const digimon = crests[crestIndex].digimons[digimonIndex + 1]
    setVideoURL(getVideoURL(crest, digimon))
  }, [crestIndex, crests, digimonIndex])

  useEffect(() => {
    const crest = crests[crestIndex].name
    const imageIndex = (!hasVideoEnded && digimonIndex >= 1) ? digimonIndex - 1 : digimonIndex
    const digimon = crests[crestIndex].digimons[imageIndex]
    setDigimonSrc(getDigimonSrc(crest, digimon))
  }, [crestIndex, crests, digimonIndex, hasVideoEnded])

  function getDigimonModifier() {
    if (crestIndex === 0 && digimonIndex === 1) {
      const randomNumber = Math.floor(Math.random() * 3) + 1
      if (randomNumber === 3) return 5
      return 2
    }
    return 1
  }
  
  function handleEvolution() {
    videoRef.current?.load()
    videoRef.current?.play()
    
    setIsVideoPlaying(true)
    setHasVideoEnded(false)
    
    if (digimonIndex < digimons.length - 1) setDigimonIndex(prev => prev + getDigimonModifier())
    else setDigimonIndex(0)
  }
  
  function handlePrevCrest() {
    setDigimonIndex(0)
    if (crestIndex > 0) setCrestIndex(prev => prev - 1)
    else setCrestIndex(crests.length - 1)
    videoRef.current?.load()
  }
  
  function handleNextCrest() {
    setDigimonIndex(0)
    if (crestIndex < crests.length - 1) setCrestIndex(prev => prev + 1)
    else setCrestIndex(0)
    videoRef.current?.load()
  }

  const handleVideoEnd = () => {
    setHasVideoEnded(true)
    setIsVideoPlaying(false)
  }

  return (
    <div className="relative">
      <button
        className="absolute cursor-pointer bg-transparent rounded-full top-[99px] left-4 w-[54px] h-[54px] hover:bg-blue-500 hover:bg-opacity-50"
        onClick={handleEvolution}
      />
      <button
        className="absolute cursor-pointer bg-transparent rounded-full top-[77px] right-6 w-12 h-8 hover:bg-blue-500 hover:bg-opacity-50"
        onClick={handlePrevCrest}
      />
      <button
        className="absolute cursor-pointer bg-transparent rounded-full top-[139px] right-6 w-12 h-8 hover:bg-blue-500 hover:bg-opacity-50"
        onClick={handleNextCrest}
      />

      <Image src="/images/digivice-1.png" alt="digivice frame" width={280} height={248} />

      {!isVideoPlaying && (
        <Image
          className="absolute top-[82px] left-[95px] z-20"
          src={digimonSrc}
          alt="digimon"
          width={88}
          height={88}
        />
      )}

      <video
        className="absolute w-[90px] h-[90px] top-[81px] left-[94px]"
        ref={videoRef}
        preload="none"
        onEnded={handleVideoEnd}
      >
        <source src={videoURL} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}