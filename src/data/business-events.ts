// What business events do to the stock and supplies bars (decision 004: every value sourced).

export type Bar = 'stock' | 'supplies'

export interface BusinessEvent {
  label: string
  /** Bars the event sets to zero. */
  empties: Bar[]
  /** Also cancels bought supplies that are still on their way. */
  cancelsDelivery: boolean
  source: string
  checked: string
}

export const BUSINESS_EVENTS: Record<'sold' | 'raided', BusinessEvent> = {
  sold: {
    label: 'Sold',
    empties: ['stock'],
    cancelsDelivery: false,
    source: 'Maintainer, from play (issue #4): selling empties the stock, supplies stay.',
    checked: '2026-10-14',
  },
  raided: {
    label: 'Raided',
    empties: ['stock', 'supplies'],
    cancelsDelivery: true,
    source:
      'Maintainer, from play (issue #4): a successful police raid zeroes stock and supplies ' +
      'and cancels supplies still on their way.',
    checked: '2026-10-14',
  },
}

/** Buying supplies: they arrive after a delay and fill the supplies bar. */
export const SUPPLY_PURCHASE = {
  label: 'Supplies bought',
  deliveryMs: 10 * 60_000,
  /** Supplies after delivery, in percent. */
  fillsTo: 100,
  /** Not confirmed yet which clock the wait runs on; real time until it is (issue #4). */
  clock: 'real' as const,
  source:
    'Maintainer, from play (issue #4): about 10 minutes for every business, then supplies are full. ' +
    'Community wiki (gta.wiki, Business Supplies) also says about ten minutes for MC businesses.',
  checked: '2026-10-14',
}

/** The stock and supplies bars are split into equal segments, as on the in-game HUD. */
export const BAR_SEGMENTS = {
  count: 5,
  source:
    'gta.wiki, Business Supplies: both bars "are broken up into five segments" (MC businesses). ' +
    'Bunker: segments seen in play (issue #32); gta.wiki, Supplies: most resupply missions fill ' +
    '"1/5th, or 20 units".',
  checked: '2026-10-14',
}
