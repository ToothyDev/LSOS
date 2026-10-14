// How fast businesses make stock, what it is worth and how much supplies it uses (decision 004).
// Values no source gives are estimated by a stated rule from sourced ones and marked as
// estimates, so the UI can say so (decision 013).

/** A value of a rate that can be estimated. */
export type RateField = 'minutesPerUnit' | 'unitValue' | 'unitsPerFullSupplies'

export interface Estimate {
  /** The values of the rate that are estimated; the others are sourced. */
  fields: readonly RateField[]
  /** How they were derived, shown to the user. */
  how: string
}

export interface ProductionRate {
  /** The production upgrades bought for this rate, exactly; e.g. `['equipment', 'staff']`. */
  upgrades: readonly string[]
  /** Play time to make one unit of stock while there are supplies. */
  minutesPerUnit: number
  /** Sale value of one unit sold nearby, in dollars. */
  unitValue: number
  /** Units one full supply bar makes. Missing while neither a source nor an estimate gives it. */
  unitsPerFullSupplies?: number
  /** Set when some values are estimates rather than sourced (decision 013). */
  estimate?: Estimate
}

export interface Production {
  /** The property in `PROPERTIES` this is for. */
  propertyId: string
  /** What one unit is called, plural, e.g. "stacks". */
  unitName: string
  /** Units a full stock bar holds. */
  maxUnits: number
  /** A far sale pays this much more, e.g. 0.5 for +50%. */
  farSaleBonus: number
  /** Where the far sale goes, e.g. "Los Santos". */
  farSaleLabel: string
  rates: readonly ProductionRate[]
  source: string
  checked: string
}

const CHECKED = '2026-10-14'

const MC_SOURCE =
  'gta.wiki, The Open Road: Profits (unit, value and minutes per upgrade level, stock capacity), ' +
  'Profitability with Equipment and Staff Upgrades (stock from a full supply bar), and the ' +
  '50% premium for cross-border sales. Values are the current ones, after the 2022 increase.'

// Estimate rules for the MC gaps (issue #28). Both lean on the Bunker, the one business with
// sourced data for every combination (gta.wiki, Disruption Logistics).
const SUPPLIES_WITH_EQUIPMENT =
  'Supply use as with both upgrades: only the equipment upgrade makes supplies last longer ' +
  '(gta.wiki, The Open Road, Upgrades).'
const SUPPLIES_WITHOUT_EQUIPMENT =
  'Supplies last half as long as with equipment, as in the Bunker (10 instead of 20 units ' +
  'per full supply bar).'
const STAFF_ONLY =
  'Speed and value as with equipment only, as in the Bunker, where either upgrade alone ' +
  'gives the same rate.'

/**
 * MC businesses. The wiki lists no upgrades, equipment, and both; staff alone is not listed.
 * Supplies per unit are only listed with both upgrades; the rest is estimated (decision 013).
 */
function mc(
  propertyId: string,
  unitName: string,
  maxUnits: number,
  levels: [none: Level, equipment: Level, both: Level & { unitsPerFullSupplies: number }],
  note = '',
): Production {
  const [none, equipment, both] = levels
  const withoutEquipment = both.unitsPerFullSupplies / 2
  return {
    propertyId,
    unitName,
    maxUnits,
    farSaleBonus: 0.5,
    farSaleLabel: 'across the county line',
    rates: [
      {
        upgrades: [],
        ...none,
        unitsPerFullSupplies: withoutEquipment,
        estimate: { fields: ['unitsPerFullSupplies'], how: SUPPLIES_WITHOUT_EQUIPMENT },
      },
      {
        upgrades: ['equipment'],
        ...equipment,
        unitsPerFullSupplies: both.unitsPerFullSupplies,
        estimate: { fields: ['unitsPerFullSupplies'], how: SUPPLIES_WITH_EQUIPMENT },
      },
      {
        upgrades: ['staff'],
        ...equipment,
        unitsPerFullSupplies: withoutEquipment,
        estimate: {
          fields: ['minutesPerUnit', 'unitValue', 'unitsPerFullSupplies'],
          how: `${STAFF_ONLY} ${SUPPLIES_WITHOUT_EQUIPMENT}`,
        },
      },
      { upgrades: ['equipment', 'staff'], ...both },
    ],
    source: MC_SOURCE + note,
    checked: CHECKED,
  }
}

type Level = { minutesPerUnit: number; unitValue: number }

export const PRODUCTION: readonly Production[] = [
  mc('mc-cocaine', 'stacks', 10, [
    { minutesPerUnit: 50, unitValue: 27_000 },
    { minutesPerUnit: 40, unitValue: 31_000 },
    { minutesPerUnit: 30, unitValue: 35_000, unitsPerFullSupplies: 4 },
  ]),
  mc(
    'mc-meth',
    'bins',
    20,
    [
      { minutesPerUnit: 30, unitValue: 11_475 },
      { minutesPerUnit: 24, unitValue: 13_175 },
      { minutesPerUnit: 18, unitValue: 14_875, unitsPerFullSupplies: 8 },
    ],
    ' The wiki gives 2h 30m for a full supply bar, 8 bins at 18 minutes is 2h 24m; the ' +
      'per-bin time is used.',
  ),
  mc('mc-cash', 'stacks', 40, [
    { minutesPerUnit: 12, unitValue: 4_725 },
    { minutesPerUnit: 10, unitValue: 5_425 },
    { minutesPerUnit: 8, unitValue: 6_125, unitsPerFullSupplies: 20 },
  ]),
  mc('mc-weed', 'bundles', 80, [
    { minutesPerUnit: 6, unitValue: 2_025 },
    { minutesPerUnit: 5, unitValue: 2_325 },
    { minutesPerUnit: 4, unitValue: 2_625, unitsPerFullSupplies: 50 },
  ]),
  mc('mc-documents', 'boxes', 60, [
    { minutesPerUnit: 5, unitValue: 1_350 },
    { minutesPerUnit: 4, unitValue: 1_550 },
    { minutesPerUnit: 3, unitValue: 1_750, unitsPerFullSupplies: 50 },
  ]),
  {
    propertyId: 'bunker',
    unitName: 'units',
    maxUnits: 100,
    farSaleBonus: 0.5,
    farSaleLabel: 'in Los Santos',
    // Staff on manufacturing only; research and the split come with issue #33.
    rates: [
      { upgrades: [], minutesPerUnit: 10, unitValue: 5_000, unitsPerFullSupplies: 10 },
      { upgrades: ['staff'], minutesPerUnit: 8.5, unitValue: 6_000, unitsPerFullSupplies: 10 },
      {
        upgrades: ['equipment'],
        minutesPerUnit: 8.5,
        unitValue: 6_000,
        unitsPerFullSupplies: 20,
      },
      {
        upgrades: ['equipment', 'staff'],
        minutesPerUnit: 7,
        unitValue: 7_000,
        unitsPerFullSupplies: 20,
      },
    ],
    source:
      'gta.wiki, Disruption Logistics: Profits (staff on manufacturing only: 100 units of stock, ' +
      'minutes and value per upgrade level, +50% sold in Los Santos) and Profitability When ' +
      'Focused on Production (stock from a full supply bar).',
    checked: CHECKED,
  },
]
