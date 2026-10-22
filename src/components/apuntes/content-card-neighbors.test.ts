import { describe, expect, it } from 'vitest'
import { buildContentCardIndex, getContentCardNeighbors } from './content-card-neighbors'

describe('content card neighbors', () => {
  it('reuses one index for every card and keeps row boundaries and apunte identity', () => {
    const cards = ['a', 'a', 'a', 'b', 'b'].map((id, index) => ({ row: Math.floor(index / 2), col: index % 2, apunte: { id } }))
    const index = buildContentCardIndex(cards)
    expect(getContentCardNeighbors(index, cards[0])).toEqual({ sameApunteDown: true, sameApunteLeft: false, sameApunteRight: true, sameApunteUp: false })
    expect(getContentCardNeighbors(index, cards[1])).toEqual({ sameApunteDown: false, sameApunteLeft: true, sameApunteRight: false, sameApunteUp: false })
    expect(getContentCardNeighbors(index, cards[2])).toEqual({ sameApunteDown: false, sameApunteLeft: false, sameApunteRight: false, sameApunteUp: true })
    expect(getContentCardNeighbors(index, cards[4])).toEqual({ sameApunteDown: false, sameApunteLeft: false, sameApunteRight: false, sameApunteUp: false })
    expect(index.size).toBe(cards.length)
  })
  it('handles an empty list', () => expect(buildContentCardIndex([]).size).toBe(0))
})
