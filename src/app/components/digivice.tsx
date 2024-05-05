'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCrest } from '@/context/crest-context'
import { Crests } from '@/data/types/crest'
import { Assets } from './assets'

interface DigiviceProps {
  crests: Crests
}

export function Digivice({ crests }: DigiviceProps) {
  const { crestIndex, setCrestIndex } = useCrest()
  const [digimonIndex, setDigimonIndex] = useState<number>(0)
  // const [isEvolving, setIsEvolving] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const lastCrestIndex = crests.length - 1
  
  const isLastDigimon = useMemo(() => {
    const lastDigimonIndex = crests[crestIndex]?.digimons?.length - 1
    return digimonIndex === lastDigimonIndex
  }, [crestIndex, crests, digimonIndex])
  
  const hasAlternativeEvolution = useMemo(() => {
    const randomNumber = Math.floor(Math.random() * 4) + 1
    const isPerfectForm = digimonIndex === 3
    const isCourageCrest = crestIndex === 0
    return (randomNumber === 4 && isCourageCrest && isPerfectForm)
  }, [crestIndex, digimonIndex])
  
  function resetDigimon() {
    setDigimonIndex(0)
    setIsVideoPlaying(false)
  }

  function onHandleNextDigimon() {
    if (isLastDigimon || hasAlternativeEvolution) {
      resetDigimon()
    } else {
      setDigimonIndex(prev => prev + 1)
      setIsVideoPlaying(true)
    }
  }
  
  function onHandlePrevCrest() {
    resetDigimon()
    
    if (crestIndex > 0) {
      setCrestIndex(prev => prev - 1)
    } else {
      setCrestIndex(lastCrestIndex)
    }
  }
  
  function onHandleNextCrest() {
    resetDigimon()
    
    if (crestIndex < lastCrestIndex) {
      setCrestIndex(prev => prev + 1)
    } else {
      setCrestIndex(0)
    }
  }

  return (
    <div className="relative">
      <button
        className="absolute cursor-pointer bg-transparent rounded-full top-[99px] left-4 w-[54px] h-[54px] hover:bg-blue-500 hover:bg-opacity-50 z-50"
        onClick={onHandleNextDigimon}
      />
      <button
        className="absolute cursor-pointer bg-transparent rounded-full top-[77px] right-6 w-12 h-8 hover:bg-blue-500 hover:bg-opacity-50 z-50"
        onClick={onHandlePrevCrest}
      />
      <button
        className="absolute cursor-pointer bg-transparent rounded-full top-[139px] right-6 w-12 h-8 hover:bg-blue-500 hover:bg-opacity-50 z-50"
        onClick={onHandleNextCrest}
      />

      <Assets
        crests={crests}
        crestIndex={crestIndex}
        digimonIndex={digimonIndex}
        hasAlternativeEvolution={hasAlternativeEvolution}
        isVideoPlaying={isVideoPlaying}
        setIsVideoPlaying={setIsVideoPlaying}
      />
    </div>
  )
}