import { Crests } from '@/data/types/crest'
import { api } from '@/data/api'
import { Digivice } from '../components/digivice'
import { Crest } from '../components/crest'

async function getCrests(): Promise<Crests> {
  const response = await api('/crests', {
    next: {
      revalidate: 60 * 60, // 1 hour
    },
  })

  const crests = await response.json()

  return crests
}

export default async function Home() {
  const crests: Crests = await getCrests()

  return (
    <main className="flex justify-around items-center flex-wrap w-full max-w-[1024px] h-screen my-0 mx-auto">
      <Digivice crests={crests} />

      <Crest crests={crests} />
    </main>
  )
}
