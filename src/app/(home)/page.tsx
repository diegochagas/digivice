import Image from 'next/image'
import { Crests } from '@/data/types/crest'
import crestsJson from '@/data/crests.json'
import { Digivice } from '../components/digivice'
import { Crest } from '../components/crest'

export default function Home() {
  const { crests } = crestsJson

  return (
    <main className="flex justify-around items-center h-screen relative">
      <div className="flex justify-around items-center flex-wrap w-full max-w-[1024px] my-0 mx-auto">
        <Digivice crests={crests as Crests} />

        <Crest crests={crests as Crests} />
      </div>

      <Image
        className="z-0"
        src="/images/background.webp"
        alt="background"
        fill
        style={{objectFit:"cover"}}
        quality={100}
      />
    </main>
  )
}
