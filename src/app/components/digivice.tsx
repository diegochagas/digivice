'use client'

import { useRef, useState } from 'react'
import { useCrest } from '@/context/crest-context'
import { Crests } from '@/data/types/crest'
import { Assets } from './assets'

interface DigiviceProps {
  crests: Crests
}

export function Digivice({ crests }: DigiviceProps) {
  const { crestIndex, setCrestIndex } = useCrest()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [digimonIndex, setDigimonIndex] = useState<number>(0)
  const isLastDigimon = digimonIndex >= crests[crestIndex]?.digimons?.length - 1
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isShowingImage, setIsShowingImage] = useState(true)
  const [hasVideoEnded, setHasVideoEnded] = useState(false)
  
  function handleEvolution() {
    setIsShowingImage(false)

    if (isLastDigimon) {
      videoRef.current?.pause()
      
      setIsVideoPlaying(false)
      setHasVideoEnded(true)
      
      setDigimonIndex(0)
    } else {
      videoRef.current?.load()
      videoRef.current?.play()
      
      setIsVideoPlaying(true)
      setHasVideoEnded(false)

      setDigimonIndex(prev => prev + 1)
    }
  }
  
  function handlePrevCrest() {
    setDigimonIndex(0)
    setIsVideoPlaying(false)
    if (crestIndex > 0) setCrestIndex(prev => prev - 1)
    else setCrestIndex(crests.length - 1)
    videoRef.current?.load()
  }
  
  function handleNextCrest() {
    setDigimonIndex(0)
    setIsVideoPlaying(false)
    if (crestIndex < crests.length - 1) setCrestIndex(prev => prev + 1)
    else setCrestIndex(0)
    videoRef.current?.load()
  }

  const handleVideoEnd = () => {
    setHasVideoEnded(true)
    setIsVideoPlaying(false)
    setIsShowingImage(true)
  }

  return (
    <div className="relative">
      <button
        className="absolute cursor-pointer bg-transparent rounded-full top-[99px] left-4 w-[54px] h-[54px] hover:bg-blue-500 hover:bg-opacity-50 z-50"
        onClick={handleEvolution}
      />
      <button
        className="absolute cursor-pointer bg-transparent rounded-full top-[77px] right-6 w-12 h-8 hover:bg-blue-500 hover:bg-opacity-50 z-50"
        onClick={handlePrevCrest}
      />
      <button
        className="absolute cursor-pointer bg-transparent rounded-full top-[139px] right-6 w-12 h-8 hover:bg-blue-500 hover:bg-opacity-50 z-50"
        onClick={handleNextCrest}
      />

      <Assets
        videoRef={videoRef}
        isVideoPlaying={isVideoPlaying}
        isShowingImage={isShowingImage}
        hasVideoEnded={hasVideoEnded}
        handleVideoEnd={handleVideoEnd}
        crests={crests}
        crestIndex={crestIndex}
        digimonIndex={digimonIndex}
      />
    </div>
  )
}