interface Crest {
  id: number
  name: string
  fill: string
  color: string
  backgroundColor: string
  digimons: string[]
  alternativeEvolution?: string
}

export type Crests = Crest[]