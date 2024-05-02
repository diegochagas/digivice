import { Crests } from '@/data/types/crest'
import { api } from '@/data/api'
import { Digivice } from '../components/digivice'
import { Crest } from '../components/crest'
import Image from 'next/image'

async function getCrests(): Promise<Crests> {
  try {
    const response = await api('/crests', {
      next: {
        revalidate: 60 * 60, // 1 hour
      },
    })
  console.log('RESPONSE: ', response.status)
    const crests = await response.json()
  
    return crests
  } catch(err) {
    console.error('ERROR: ', err)

    return []
  }
}

export default async function Home() {
  const crests: Crests = await getCrests()

  return (
    <main className="flex justify-around items-center h-screen relative">
      <div className="flex justify-around items-center flex-wrap w-full max-w-[1024px] my-0 mx-auto">
        <Digivice crests={crests} />

        <Crest crests={crests} />
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
