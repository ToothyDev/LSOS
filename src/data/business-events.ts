// What business events do to the stock and supplies bars (decision 004: every value sourced).

export type Bar = 'stock' | 'supplies'

export interface BusinessEvent {
  label: string
  /** Bars the event sets to zero. */
  empties: Bar[]
  source: string
  checked: string
}

export const BUSINESS_EVENTS: Record<'sold' | 'raided', BusinessEvent> = {
  sold: {
    label: 'Sold',
    empties: ['stock'],
    source: 'Maintainer, from play (issue #4): selling empties the stock, supplies stay.',
    checked: '2026-10-14',
  },
  raided: {
    label: 'Raided',
    empties: ['stock', 'supplies'],
    source: 'Maintainer, from play (issue #4): a successful police raid zeroes stock and supplies.',
    checked: '2026-10-14',
  },
}
