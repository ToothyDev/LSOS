// Nightclub warehouse goods: what technicians make, how fast, how much fits and what it is worth
// (decision 004, decision 015). Capacities for 2 to 4 floors are estimates (decision 013).

/** One goods category a technician can be assigned to. */
export interface Goods {
  /** Stable id, saved in user data (technician assignments, stock): never change or reuse it. */
  id: string
  label: string
  /** Owning any of these properties unlocks the category; nothing else of theirs is needed. */
  requires: readonly string[]
  /** Sale value of one crate, in dollars. */
  crateValue: number
  /** Crates that fit with one warehouse floor and with all five. */
  capacity: { oneFloor: number; fiveFloors: number }
  /** Play time per crate without and with the Equipment Upgrade. */
  minutesPerCrate: { base: number; equipment: number }
}

export const NIGHTCLUB_ID = 'nightclub'
export const MAX_FLOORS = 5
export const MAX_TECHNICIANS = 5

export const NIGHTCLUB_SOURCE =
  'gta.wiki, Nightclubs/Warehouse Management: goods per business, technicians (one per goods ' +
  'type, Yohan free, four more hired), value per crate (current, after the April 2022 increase ' +
  'for MC goods), storage with 1 and 5 floors, production per crate with and without the ' +
  'Equipment Upgrade; "Unlike running those businesses themselves, no supplies will need to ' +
  'be sourced or purchased": only owning the linked business is needed.'
export const NIGHTCLUB_CHECKED = '2026-10-14'

/**
 * How capacity for 2 to 4 floors is estimated (decision 013). The source gives 1 and 5 floors
 * only, and the five-floor capacity is exactly five times the one-floor capacity for every type.
 */
export const FLOORS_ESTIMATE =
  'Storage for 2 to 4 floors: every floor holds as much as the first, as with 1 and 5 floors ' +
  '(5 floors hold exactly 5 times as much).'

export const GOODS: readonly Goods[] = [
  {
    id: 'cargo',
    label: 'Cargo and Shipments',
    requires: ['special-cargo', 'hangar'],
    crateValue: 10_000,
    capacity: { oneFloor: 10, fiveFloors: 50 },
    minutesPerCrate: { base: 140, equipment: 70 },
  },
  {
    id: 'sporting',
    label: 'Sporting Goods',
    requires: ['bunker'],
    crateValue: 5_000,
    capacity: { oneFloor: 20, fiveFloors: 100 },
    minutesPerCrate: { base: 80, equipment: 40 },
  },
  {
    id: 'imports',
    label: 'South American Imports',
    requires: ['mc-cocaine'],
    crateValue: 27_000,
    capacity: { oneFloor: 2, fiveFloors: 10 },
    minutesPerCrate: { base: 240, equipment: 120 },
  },
  {
    id: 'pharma',
    label: 'Pharmaceutical Research',
    requires: ['mc-meth'],
    crateValue: 11_475,
    capacity: { oneFloor: 4, fiveFloors: 20 },
    minutesPerCrate: { base: 120, equipment: 60 },
  },
  {
    id: 'organic',
    label: 'Organic Produce',
    requires: ['mc-weed'],
    crateValue: 2_025,
    capacity: { oneFloor: 16, fiveFloors: 80 },
    minutesPerCrate: { base: 40, equipment: 20 },
  },
  {
    id: 'printing',
    label: 'Printing and Copying',
    requires: ['mc-documents'],
    crateValue: 1_350,
    capacity: { oneFloor: 12, fiveFloors: 60 },
    minutesPerCrate: { base: 30, equipment: 15 },
  },
  {
    id: 'cash',
    label: 'Cash Creation',
    requires: ['mc-cash'],
    crateValue: 4_725,
    capacity: { oneFloor: 8, fiveFloors: 40 },
    minutesPerCrate: { base: 60, equipment: 30 },
  },
]
