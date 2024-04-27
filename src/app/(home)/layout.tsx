import { CrestProvider } from '@/context/crest-context'
import { ReactNode } from 'react'

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <CrestProvider>
      {children}
    </CrestProvider>
  )
}
