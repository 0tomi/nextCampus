import { describe, expect, it } from 'vitest'
import { limitSeenApunteIds, parseSeenApunteIds } from './seen-apuntes'

describe('seen apunte ids', () => {
  it('keeps only the latest 100 unique ids', () => {
    const ids = Array.from({ length: 105 }, (_, index) => `apunte-${index}`)
    const result = limitSeenApunteIds(ids)
    expect(result).toHaveLength(100)
    expect(result[0]).toBe('apunte-5')
    expect(result.at(-1)).toBe('apunte-104')
  })

  it('ignores invalid storage values', () => {
    expect(parseSeenApunteIds(null)).toEqual([])
    expect(parseSeenApunteIds('no-json')).toEqual([])
    expect(parseSeenApunteIds(JSON.stringify(['a', 1, 'b', null]))).toEqual(['a', 'b'])
  })
})
