// Properties LSOS supports and the upgrades that change their trackers (decision 004, 011).
// Each tracker issue adds its property here, with a source for every upgrade it lists.

/** One option of a choice upgrade, e.g. what a nightclub technician is assigned to. */
export interface UpgradeOption {
  id: string
  label: string
}

export type Upgrade =
  /** Bought or not, e.g. an equipment upgrade. */
  | { kind: 'toggle'; id: string; label: string }
  /** One of several options; the first one is the default, e.g. "Not hired". */
  | { kind: 'choice'; id: string; label: string; options: readonly UpgradeOption[] }

export interface Property {
  /** Stable id, saved in user data: never change or reuse it. */
  id: string
  label: string
  upgrades: readonly Upgrade[]
  source: string
  checked: string
}

// Equipment and staff speed up production and raise the value; equipment also makes supplies
// last longer. The security upgrade only changes raids, which LSOS does not predict: left out.
const PRODUCTION_UPGRADES: readonly Upgrade[] = [
  { kind: 'toggle', id: 'equipment', label: 'Equipment' },
  { kind: 'toggle', id: 'staff', label: 'Staff' },
]

const MC_SOURCE = 'gta.wiki, The Open Road (Upgrades): equipment, staff and security upgrades.'
const BUNKER_SOURCE =
  'gta.wiki, Disruption Logistics (Buy Upgrades): equipment, staff and security upgrades.'

export const PROPERTIES: readonly Property[] = [
  mc('mc-cocaine', 'Cocaine Lockup'),
  mc('mc-meth', 'Methamphetamine Lab'),
  mc('mc-cash', 'Counterfeit Cash Factory'),
  mc('mc-weed', 'Weed Farm'),
  mc('mc-documents', 'Document Forgery Office'),
  {
    id: 'bunker',
    label: 'Bunker',
    upgrades: PRODUCTION_UPGRADES,
    source: BUNKER_SOURCE,
    checked: '2026-10-14',
  },
]

function mc(id: string, label: string): Property {
  return { id, label, upgrades: PRODUCTION_UPGRADES, source: MC_SOURCE, checked: '2026-10-14' }
}
