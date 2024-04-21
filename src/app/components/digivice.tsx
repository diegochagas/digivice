'use client'

import { Crests } from "@/data/types/crest"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { CrestIcon } from "./icons/crest"

interface DigiviceProps {
  crests: Crests
}

export function Digivice({ crests }: DigiviceProps) {
  const [crestIndex, setCrestIndex] = useState<number>(0)
  const digimons = crests[crestIndex].names
  const videoRef = useRef<HTMLVideoElement>(null)
  const [digimonIndex, setDigimonIndex] = useState<number>(0)
  const [digimonName, setDigimonName] = useState<string>('agumon')
  const [isPaused, setIsPaused] = useState(true)

  useEffect(() => {
    setDigimonName(digimons[digimonIndex])
  }, [digimons, digimonIndex])

  // useEffect(() => {
  //   videoRef.current?.load()
  // }, [crestIndex, digimonName])

  useEffect(() => {
    if (videoRef.current?.paused) setIsPaused(true)
    else setIsPaused(false)
  }, [videoRef.current?.paused])
  
  function handleEvolution() {
    videoRef.current?.load()
    videoRef.current?.play()

    if (digimonIndex < digimons.length - 1) setDigimonIndex(prev => prev + 1)
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

  return (
    <div className="relative">
      <button
        className="absolute cursor-pointer bg-transparent border border-black rounded-full top-28 left-4 w-14 h-14 hover:bg-blue-500 hover:bg-opacity-50"
        onClick={handleEvolution}
      />
      <button
        className="absolute cursor-pointer bg-transparent border border-black rounded-full top-20 right-6 w-12 h-9 hover:bg-blue-500 hover:bg-opacity-50"
        onClick={handlePrevCrest}
      />
      <button
        className="absolute cursor-pointer bg-transparent border border-black rounded-full top-36 right-6 w-12 h-9 hover:bg-blue-500 hover:bg-opacity-50"
        onClick={handleNextCrest}
      />

      <Image src="/digivice-1.png" alt="" width={300} height={300} />
      
      {!isPaused && (
        <CrestIcon
          className="fill-red-500 absolute top-20 left-24 w-24 h-24"
          index={crestIndex}
        />
       )}

      <video
        className="absolute w-24 h-24 top-24 left-28"
        ref={videoRef}
        preload="none"
      >
        <source src={`/videos/${crestIndex}/${digimonName}.mp4`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}