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

/** "Free" or "40% off" */
export function discountText(discount: Discount): string {
  return discount.percent >= 100 ? 'Free' : `${discount.percent}% off`
}

/** The bonus payouts, the ones paid through an owned property first, then highest first. */
export function sortMultipliers(
  multipliers: readonly Multiplier[],
  owned: OwnedProperties,
): Multiplier[] {
  const ownsIt = (m: Multiplier) => m.property !== undefined && isOwned(owned, m.property)
  return [...multipliers].sort(
    (a, b) => Number(ownsIt(b)) - Number(ownsIt(a)) || b.factor - a.factor,
  )
}

/** Time left in the week, e.g. "6d 16h left" or "3h left". */
export function timeLeftText(ms: number): string {
  const hours = Math.max(0, Math.floor(ms / 3_600_000))
  const days = Math.floor(hours / 24)
  return days > 0 ? `${days}d ${hours % 24}h left` : `${hours}h left`
}

/** Discounts of one kind, by percentage (highest first), keeping the file's item order. */
export function discountTiers(
  discounts: readonly Discount[],
  kind: Discount['kind'],
): { percent: number; items: string[] }[] {
  const tiers = new Map<number, string[]>()
  for (const d of discounts) {
    if (d.kind === kind) tiers.set(d.percent, [...(tiers.get(d.percent) ?? []), d.item])
  }
  return [...tiers].sort(([a], [b]) => b - a).map(([percent, items]) => ({ percent, items }))
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
