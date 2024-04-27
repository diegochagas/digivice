'use client'

import Image from 'next/image';
import { CrestIcon } from './icons/crest';
import { useCrest } from '@/context/crest-context'
import { Crests } from '@/data/types/crest';

interface CrestProps {
  crests: Crests
}

export function Crest({ crests }: CrestProps) {
  const { crestIndex } = useCrest()

  return (
    <div className="relative">
      <Image className="relative z-30" src="/images/crest-0-tag.png" alt="tag frame" width={186} height={350} />

      <CrestIcon
        className="absolute top-[175px] left-[64px] w-14 h-14 z-20"
        index={crestIndex}
        fill={crests[crestIndex].fill}
      />

      <div className="absolute w-28 h-28 top-36 left-9 z-0" style={{ background: crests[crestIndex].backgroundColor }} />
    </div>
  )
}