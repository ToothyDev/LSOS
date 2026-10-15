import { describe, expect, it } from 'vitest'
import { PROPERTIES } from '../data/properties'
import { WEEK } from '../data/weekly'
import { setOwned } from './properties'
import { discountText, newsItems, weekProblems, weekStatus, type Week } from './weekly'

const IDS = PROPERTIES.map((property) => property.id)

const SAMPLE: Week = {
  title: 'Sample',
  start: '2026-10-15T09:00:00Z',
  end: '2026-10-22T09:00:00Z',
  source: 'https://gta.wiki/w/Sample',
  multipliers: [
    { activity: 'Dispatch Work', factor: 2, pays: 'GTA$ and RP' },
    { activity: 'Slasher', factor: 3, pays: 'GTA$ and RP' },
    { activity: 'Bounties', factor: 2, pays: 'GTA$', property: 'bail-office' },
  ],
  gifts: ['Free T-shirt'],
  rotations: [{ label: 'Lucky Wheel podium', items: ['Some car'] }],
  discounts: [{ kind: 'weapon', item: 'Baseball Bat', percent: 100 }],
  alsoRunning: [],
}

describe('the committed week', () => {
  it('has no problems', () => {
    expect(weekProblems(WEEK, IDS)).toEqual([])
  })
})

describe('weekStatus', () => {
  it('is upcoming before the start, current until the end, then ended', () => {
    expect(weekStatus(SAMPLE, Date.parse('2026-10-15T08:59:59Z'))).toBe('upcoming')
    expect(weekStatus(SAMPLE, Date.parse('2026-10-15T09:00:00Z'))).toBe('current')
    expect(weekStatus(SAMPLE, Date.parse('2026-10-22T08:59:59Z'))).toBe('current')
    expect(weekStatus(SAMPLE, Date.parse('2026-10-22T09:00:00Z'))).toBe('ended')
  })
})

describe('newsItems', () => {
  it('puts the highest multipliers first, then the gifts', () => {
    expect(newsItems(SAMPLE, {}).map((item) => item.text)).toEqual([
      '3x GTA$ and RP: Slasher',
      '2x GTA$ and RP: Dispatch Work',
      '2x GTA$: Bounties',
      'Free T-shirt',
    ])
  })

  it('puts multipliers on owned properties ahead of everything', () => {
    const owned = setOwned({}, 'bail-office', true)
    expect(newsItems(SAMPLE, owned)[0]).toEqual({ text: '2x GTA$: Bounties', owned: true })
  })
})

describe('discountText', () => {
  it('says Free at 100%', () => {
    expect(discountText({ kind: 'weapon', item: 'Bat', percent: 100 })).toBe('Free')
    expect(discountText({ kind: 'vehicle', item: 'Car', percent: 40 })).toBe('40% off')
  })
})

describe('weekProblems', () => {
  it('finds what the type cannot', () => {
    const bad: Week = {
      ...SAMPLE,
      end: SAMPLE.start,
      source: 'https://example.com',
      multipliers: [{ activity: 'X', factor: 1, pays: 'RP', property: 'nope' }],
      discounts: [{ kind: 'vehicle', item: 'Car', percent: 0 }],
      rotations: [{ label: 'Empty', items: [] }],
    }
    expect(weekProblems(bad, IDS)).toEqual([
      'end is not after start',
      'multiplier "X" is not above 1',
      'multiplier "X" names unknown property "nope"',
      'discount "Car" is not 1-100%',
      'rotation "Empty" lists nothing',
      'source is not a gta.wiki page',
    ])
  })
})
