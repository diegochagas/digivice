'use client'

import { Dispatch, ReactNode, SetStateAction, createContext, useContext, useState } from 'react'

interface CrestContextType {
  crestIndex: number
  setCrestIndex: Dispatch<SetStateAction<number>>
}

const CrestContext = createContext<CrestContextType>({
  crestIndex: 0,
  setCrestIndex: () => {}
})

export function CrestProvider({ children }: { children: ReactNode }) {
  const [crestIndex, setCrestIndex] = useState<number>(0)

  return (
    <CrestContext.Provider value={{ crestIndex, setCrestIndex }}>
      {children}
    </CrestContext.Provider>
  )
}

export const useCrest = () => useContext(CrestContext)
