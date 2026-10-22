interface PositionedContentCard {
  row: number
  col: number
  apunte: { id: string }
}

export interface ContentCardNeighbors {
  sameApunteDown: boolean
  sameApunteLeft: boolean
  sameApunteRight: boolean
  sameApunteUp: boolean
}

export function buildContentCardIndex<T extends PositionedContentCard>(cards: readonly T[]): ReadonlyMap<string, T> {
  return new Map(cards.map((card) => [`${card.row}:${card.col}`, card]))
}

export function getContentCardNeighbors(
  byPosition: ReadonlyMap<string, PositionedContentCard>,
  card: PositionedContentCard,
): ContentCardNeighbors {
  const sameApunte = (candidate: PositionedContentCard | undefined) => candidate?.apunte.id === card.apunte.id
  return {
    sameApunteDown: sameApunte(byPosition.get(`${card.row + 1}:${card.col}`)),
    sameApunteLeft: sameApunte(byPosition.get(`${card.row}:${card.col - 1}`)),
    sameApunteRight: sameApunte(byPosition.get(`${card.row}:${card.col + 1}`)),
    sameApunteUp: sameApunte(byPosition.get(`${card.row - 1}:${card.col}`)),
  }
}
