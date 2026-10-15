import { describe, expect, it } from 'vitest'
import { PROPERTIES } from '../data/properties'
import { WEEK } from '../data/weekly'
import { setOwned } from './properties'
import {
  discountText,
  discountTiers,
  sortMultipliers,
  timeLeftText,
  weekProblems,
  weekStatus,
  type Week,
} from './weekly'

const HOUR = 60 * 60_000
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

describe('sortMultipliers', () => {
  it('puts the highest first', () => {
    expect(sortMultipliers(SAMPLE.multipliers, {}).map((m) => m.activity)).toEqual([
      'Slasher',
      'Dispatch Work',
      'Bounties',
    ])
  })

  it('puts the ones paid through an owned property ahead of everything', () => {
    const owned = setOwned({}, 'bail-office', true)
    expect(sortMultipliers(SAMPLE.multipliers, owned)[0]?.activity).toBe('Bounties')
  })
})

describe('timeLeftText', () => {
  it('shows days and hours, or hours only in the last day', () => {
    expect(timeLeftText((6 * 24 + 16) * HOUR + 59 * 60_000)).toBe('6d 16h left')
    expect(timeLeftText(3 * HOUR + 1)).toBe('3h left')
    expect(timeLeftText(-5)).toBe('0h left')
  })
})

describe('discountText', () => {
  it('says Free at 100%', () => {
    expect(discountText({ kind: 'weapon', item: 'Bat', percent: 100 })).toBe('Free')
    expect(discountText({ kind: 'vehicle', item: 'Car', percent: 40 })).toBe('40% off')
  })
})

describe('discountTiers', () => {
  it('groups one kind by percentage, highest first', () => {
    expect(
      discountTiers(
        [
          { kind: 'vehicle', item: 'A', percent: 30 },
          { kind: 'weapon', item: 'Bat', percent: 100 },
          { kind: 'vehicle', item: 'B', percent: 40 },
          { kind: 'vehicle', item: 'C', percent: 30 },
        ],
        'vehicle',
      ),
    ).toEqual([
      { percent: 40, items: ['B'] },
      { percent: 30, items: ['A', 'C'] },
    ])
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
