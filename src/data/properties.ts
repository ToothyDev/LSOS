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
  | {
      kind: 'choice'
      id: string
      label: string
      options: readonly UpgradeOption[]
      /** False to leave it out of the card's upgrade summary, when the card shows it anyway. */
      summary?: false
    }
  /** A whole number typed in, e.g. security contracts done. */
  | { kind: 'count'; id: string; label: string; max?: number; default: number }

export interface Property {
  /** Stable id, saved in user data: never change or reuse it. */
  id: string
  label: string
  upgrades: readonly Upgrade[]
  /**
   * False for properties with no card on the Businesses tab: those that only unlock something
   * elsewhere, or that only have a safe (Safes tab).
   */
  card?: false
  source: string
  checked: string
}

import {
  GOODS,
  MAX_FLOORS,
  MAX_TECHNICIANS,
  NIGHTCLUB_CHECKED,
  NIGHTCLUB_SOURCE,
} from './nightclub'
import { ARCADE_SLOTS, SAFES, SAFES_CHECKED } from './safes'

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
  // Only owned or not: owning either unlocks Cargo and Shipments in the nightclub (issue #7).
  {
    id: 'special-cargo',
    label: 'Special Cargo Warehouse',
    upgrades: [],
    card: false,
    source: NIGHTCLUB_SOURCE,
    checked: NIGHTCLUB_CHECKED,
  },
  {
    id: 'hangar',
    label: 'Hangar',
    upgrades: [],
    card: false,
    source: NIGHTCLUB_SOURCE,
    checked: NIGHTCLUB_CHECKED,
  },
  {
    id: 'nightclub',
    label: 'Nightclub',
    // Security only changes raids: left out. Staff slows the popularity loss (Safes tab).
    upgrades: [
      { kind: 'toggle', id: 'equipment', label: 'Equipment' },
      { kind: 'toggle', id: 'staff', label: 'Staff' },
      {
        kind: 'choice',
        id: 'floors',
        label: 'Warehouse floors',
        options: Array.from({ length: MAX_FLOORS }, (_, i) => ({
          id: String(i + 1),
          label: String(i + 1),
        })),
      },
      ...Array.from({ length: MAX_TECHNICIANS }, (_, i): Upgrade => ({
        kind: 'choice',
        id: `technician-${i + 1}`,
        // Yohan comes with the club; the others are hired.
        label: i === 0 ? 'Technician 1 (Yohan)' : `Technician ${i + 1}`,
        // The warehouse rows already show what is being made.
        summary: false,
        options: [
          { id: 'none', label: i === 0 ? 'Not assigned' : 'Not hired' },
          ...GOODS.map((goods) => ({ id: goods.id, label: goods.label })),
        ],
      })),
    ],
    source: NIGHTCLUB_SOURCE,
    checked: NIGHTCLUB_CHECKED,
  },
  // Safes only (issue #8, decision 016): no card on the Businesses tab.
  {
    id: 'arcade',
    label: 'Arcade',
    upgrades: [
      // A machine that takes two slots counts as two.
      {
        kind: 'count',
        id: 'floor-slots',
        label: `Floor slots filled (of ${ARCADE_SLOTS})`,
        max: ARCADE_SLOTS,
        default: 0,
      },
    ],
    card: false,
    source: SAFES.find((safe) => safe.propertyId === 'arcade')!.source,
    checked: SAFES_CHECKED,
  },
  {
    id: 'agency',
    label: 'Agency',
    upgrades: [{ kind: 'count', id: 'contracts', label: 'Security contracts done', default: 0 }],
    card: false,
    source: SAFES.find((safe) => safe.propertyId === 'agency')!.source,
    checked: SAFES_CHECKED,
  },
  {
    id: 'salvage-yard',
    label: 'Salvage Yard',
    upgrades: [
      { kind: 'toggle', id: 'staff', label: 'Staff' },
      { kind: 'toggle', id: 'wall-safe', label: 'Wall Safe' },
    ],
    card: false,
    source: SAFES.find((safe) => safe.propertyId === 'salvage-yard')!.source,
    checked: SAFES_CHECKED,
  },
  {
    id: 'garment-factory',
    label: 'Garment Factory',
    upgrades: [],
    card: false,
    source: SAFES.find((safe) => safe.propertyId === 'garment-factory')!.source,
    checked: SAFES_CHECKED,
  },
]

function mc(id: string, label: string): Property {
  return { id, label, upgrades: PRODUCTION_UPGRADES, source: MC_SOURCE, checked: '2026-10-14' }
}
