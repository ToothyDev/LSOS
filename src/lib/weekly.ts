// This week's GTA Online events (issue #16, decisions 005 and 027). The week itself is a typed
// object in `src/data/weekly.ts`, replaced by a pull request each week; this file holds its shape
// and the pure logic around it.

import type { OwnedProperties } from './properties'
import { isOwned } from './properties'

/** One week of events, copied from its gta.wiki weekly event page. */
export interface Week {
  /** Page title on gta.wiki, e.g. "Halloween 2026 (Week 3)". */
  title: string
  /** When the week starts and ends, as UTC ISO instants (Thursday 2:00 AM US Pacific). */
  start: string
  end: string
  /** The gta.wiki page the week was copied from. */
  source: string
  /** Rockstar's Newswire article, when the page links one. */
  newswire?: string
  /** Activities paying more than usual. GTA+ only values are left out. */
  multipliers: Multiplier[]
  /** The Weekly Challenge, when the page names one. */
  challenge?: { task: string; reward: string }
  /** Free items and one-off rewards, one line each, with any deadline in the text. */
  gifts: string[]
  /** What changed this week: podium, Prize Ride, Salvage Yard, showrooms, Gun Van stock, ... */
  rotations: Rotation[]
  discounts: Discount[]
  /** Seasonal activities still running from earlier weeks without a bonus this week. */
  alsoRunning: string[]
}

export interface Multiplier {
  activity: string
  /** 2 for 2x, 3 for 3x, ... */
  factor: number
  pays: 'GTA$ and RP' | 'GTA$' | 'RP'
  /** The property it pays through, if any (`src/data/properties.ts` id): owners see it first. */
  property?: string
}

export interface Rotation {
  /** What rotates, e.g. "Lucky Wheel podium". */
  label: string
  items: string[]
  /** What it takes, e.g. the Prize Ride's challenge. */
  note?: string
}

export interface Discount {
  kind: 'vehicle' | 'property' | 'weapon'
  item: string
  /** Percent off; 100 is free. */
  percent: number
}

export type WeekStatus = 'upcoming' | 'current' | 'ended'

/** Whether the week has started and whether it is over at `now` (ms). */
export function weekStatus(week: Pick<Week, 'start' | 'end'>, now: number): WeekStatus {
  if (now < Date.parse(week.start)) return 'upcoming'
  return now < Date.parse(week.end) ? 'current' : 'ended'
}

/** "3x GTA$ and RP: Slasher" */
export function multiplierText(multiplier: Multiplier): string {
  return `${multiplier.factor}x ${multiplier.pays}: ${multiplier.activity}`
}

/** "Free" or "40% off" */
export function discountText(discount: Discount): string {
  return discount.percent >= 100 ? 'Free' : `${discount.percent}% off`
}

/**
 * The Breaking News lines: multipliers, highest first, with the ones paid through an owned
 * property ahead of the rest; then the gifts.
 */
export function newsItems(week: Week, owned: OwnedProperties): { text: string; owned: boolean }[] {
  const multipliers = week.multipliers
    .map((multiplier) => ({
      text: multiplierText(multiplier),
      owned: multiplier.property !== undefined && isOwned(owned, multiplier.property),
      factor: multiplier.factor,
    }))
    .sort((a, b) => Number(b.owned) - Number(a.owned) || b.factor - a.factor)
    .map(({ text, owned }) => ({ text, owned }))
  return [...multipliers, ...week.gifts.map((text) => ({ text, owned: false }))]
}

/** Problems with a week's data that the type does not catch; empty when it is fine. */
export function weekProblems(week: Week, propertyIds: readonly string[]): string[] {
  const problems: string[] = []
  const start = Date.parse(week.start)
  const end = Date.parse(week.end)
  if (Number.isNaN(start) || Number.isNaN(end)) problems.push('start or end is not a date')
  else if (end <= start) problems.push('end is not after start')
  for (const m of week.multipliers) {
    if (!(m.factor > 1)) problems.push(`multiplier "${m.activity}" is not above 1`)
    if (m.property !== undefined && !propertyIds.includes(m.property)) {
      problems.push(`multiplier "${m.activity}" names unknown property "${m.property}"`)
    }
  }
  for (const d of week.discounts) {
    if (!(d.percent > 0 && d.percent <= 100)) problems.push(`discount "${d.item}" is not 1-100%`)
  }
  for (const r of week.rotations) {
    if (r.items.length === 0) problems.push(`rotation "${r.label}" lists nothing`)
  }
  if (!/^https:\/\/gta\.wiki\//.test(week.source)) problems.push('source is not a gta.wiki page')
  return problems
}
