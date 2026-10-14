import { describe, expect, it } from 'vitest'
import { applyOrder, cardAt, moveId, parseOrder, saveOrder, swapAt } from './order'

describe('applyOrder', () => {
  it('puts saved ids first in saved order, the rest after in their own order', () => {
    expect(applyOrder(['a', 'b', 'c', 'd'], ['c', 'a'])).toEqual(['c', 'a', 'b', 'd'])
  })

  it('ignores saved ids that are not shown', () => {
    expect(applyOrder(['a', 'b'], ['x', 'b'])).toEqual(['b', 'a'])
  })

  it('keeps the given order without a saved one', () => {
    expect(applyOrder(['a', 'b'], [])).toEqual(['a', 'b'])
  })
})

describe('moveId', () => {
  it('moves an id forward or back', () => {
    expect(moveId(['a', 'b', 'c', 'd'], 'a', 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveId(['a', 'b', 'c', 'd'], 'd', 0)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('clamps the index to the list', () => {
    expect(moveId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c'])
    expect(moveId(['a', 'b', 'c'], 'b', 9)).toEqual(['a', 'c', 'b'])
  })

  it('leaves the list alone for an unknown id', () => {
    expect(moveId(['a', 'b'], 'x', 0)).toEqual(['a', 'b'])
  })
})

describe('swapAt', () => {
  it('swaps the id with the one at the index, leaving the rest in place', () => {
    expect(swapAt(['a', 'b', 'c', 'd', 'e'], 'a', 3)).toEqual(['d', 'b', 'c', 'a', 'e'])
    expect(swapAt(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'b', 'a'])
  })

  it('leaves the list alone at its own index, out of range or for an unknown id', () => {
    expect(swapAt(['a', 'b'], 'a', 0)).toEqual(['a', 'b'])
    expect(swapAt(['a', 'b'], 'a', 2)).toEqual(['a', 'b'])
    expect(swapAt(['a', 'b'], 'x', 0)).toEqual(['a', 'b'])
  })
})

describe('cardAt', () => {
  const boxes = [
    { id: 'a', left: 0, top: 0, width: 100, height: 200 },
    { id: 'b', left: 120, top: 0, width: 100, height: 200 },
  ]

  it('finds the card whose middle the point is in', () => {
    expect(cardAt(boxes, 50, 100, 0.2)).toBe('a')
    expect(cardAt(boxes, 140, 40, 0.2)).toBe('b')
  })

  it('finds nothing near an edge or between cards', () => {
    expect(cardAt(boxes, 90, 100, 0.2)).toBeNull()
    expect(cardAt(boxes, 130, 100, 0.2)).toBeNull()
    expect(cardAt(boxes, 50, 30, 0.2)).toBeNull()
    expect(cardAt(boxes, 110, 100, 0.2)).toBeNull()
  })
})

describe('saveOrder', () => {
  it('keeps saved ids that are not shown now after the shown ones', () => {
    expect(saveOrder(['b', 'a'], ['a', 'x', 'b', 'y'])).toEqual(['b', 'a', 'x', 'y'])
  })
})

describe('parseOrder', () => {
  it('reads a list of ids, dropping repeats', () => {
    expect(parseOrder(['a', 'b', 'a'])).toEqual(['a', 'b'])
  })

  it('rejects anything else', () => {
    expect(parseOrder(undefined)).toBe('The saved card order is not a list of names.')
    expect(parseOrder(['a', 1])).toBe('The saved card order is not a list of names.')
    expect(parseOrder({})).toBe('The saved card order is not a list of names.')
  })
})
