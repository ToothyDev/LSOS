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
  /**
   * Units one full supply bar makes (with staff on manufacturing only, where staff can be
   * split). Missing while neither a source nor an estimate gives it.
   */
  unitsPerFullSupplies?: number
  /**
   * Share of the work that makes stock, 1 if left out: the rest goes to research, which uses
   * supplies just the same but makes no stock (`StaffSplit`).
   */
  stockShare?: number
  /** Play time per unit while a production boost runs, for businesses that have one. */
  boostedMinutesPerUnit?: number
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
  /** A far sale pays this much more, e.g. 0.5 for +50%; left out if sales pay the same anywhere. */
  farSale?: { bonus: number; label: string }
  /** A bought upgrade that raises the sale value, e.g. `{ upgrade: 'named', bonus: 0.05 }`. */
  valueBonus?: { upgrade: string; bonus: number }
  /** Owning another property raises the sale value, e.g. a Money Front (decision 019). */
  ownedBonus?: OwnedBonus
  /** False if the business cannot be raided. */
  raids?: false
  /** A production boost the player can start in the business. */
  boost?: ProductionBoost
  /** A choice of what the staff work on, e.g. manufacturing or research. */
  staffSplit?: StaffSplit
  rates: readonly ProductionRate[]
  source: string
  checked: string
}

/** A sale value bonus for owning another property, with its own source. */
export interface OwnedBonus {
  /** The property in `PROPERTIES` that must be owned. */
  propertyId: string
  /** Name shown with the value, e.g. "Hands On Car Wash". */
  label: string
  /** E.g. 0.35 for +35%. */
  bonus: number
  source: string
}

/**
 * What the staff work on, picked by a choice upgrade: the stock share per option (options not
 * listed make stock only). Supply use per unit of work is the same for every option.
 */
export interface StaffSplit {
  /** The choice upgrade in `PROPERTIES` that picks it. */
  upgrade: string
  stockShare: Readonly<Record<string, number>>
  /** How the supply use was derived, shown to the user (decision 013). */
  how: string
  source: string
}

/**
 * A boost that runs production at `boostedMinutesPerUnit` until it has made `units` or
 * `maxRealMs` of real time has passed since it started. It can be started once a day.
 */
export interface ProductionBoost {
  units: number
  maxRealMs: number
  /** Hour of the day (UTC) when the next boost becomes available. */
  resetUtcHour: number
  source: string
  checked: string
}

const CHECKED = '2026-10-14'
const ACID_CHECKED = '2026-10-15'

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
    farSale: { bonus: 0.5, label: 'across the county line' },
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
  {
    ...mc('mc-cash', 'stacks', 40, [
      { minutesPerUnit: 12, unitValue: 4_725 },
      { minutesPerUnit: 10, unitValue: 5_425 },
      { minutesPerUnit: 8, unitValue: 6_125, unitsPerFullSupplies: 20 },
    ]),
    ownedBonus: {
      propertyId: 'car-wash',
      label: 'Hands On Car Wash',
      bonus: 0.35,
      source:
        'gta.wiki, Hands On Car Wash (GTA Online): owning it raises the value of Counterfeit ' +
        'Cash Factory product by 35% in Biker Sell Missions.',
    },
  },
  {
    ...mc('mc-weed', 'bundles', 80, [
      { minutesPerUnit: 6, unitValue: 2_025 },
      { minutesPerUnit: 5, unitValue: 2_325 },
      { minutesPerUnit: 4, unitValue: 2_625, unitsPerFullSupplies: 50 },
    ]),
    ownedBonus: {
      propertyId: 'smoke-on-the-water',
      label: 'Smoke on the Water',
      bonus: 0.35,
      source:
        'gta.wiki, Smoke on the Water (GTA Online): owning it raises Weed Farm product value ' +
        'by 35% in Biker Sell Missions.',
    },
  },
  mc('mc-documents', 'boxes', 60, [
    { minutesPerUnit: 5, unitValue: 1_350 },
    { minutesPerUnit: 4, unitValue: 1_550 },
    { minutesPerUnit: 3, unitValue: 1_750, unitsPerFullSupplies: 50 },
  ]),
  {
    propertyId: 'bunker',
    unitName: 'units',
    maxUnits: 100,
    farSale: { bonus: 0.5, label: 'in Los Santos' },
    // Rates with staff on manufacturing only; the split halves them (issue #33).
    staffSplit: {
      upgrade: 'staff-assignment',
      stockShare: { both: 0.5, research: 0 },
      how:
        'Research uses supplies as fast as manufacturing, so supplies last as long whatever ' +
        'the staff work on, and Both makes half the stock from them.',
      source:
        'gta.wiki, Disruption Logistics: Profits (split between production and research, 1 ' +
        'unit every 20 / 17 / 14 minutes, half the manufacturing speed). gta.wiki, Bunker ' +
        'Research: research makes no stock.',
    },
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
  // Acid Lab (issue #9). Only the equipment upgrade changes production: there is no staff or
  // security upgrade, and the lab cannot be raided. Sales pay the same anywhere.
  {
    propertyId: 'acid-lab',
    unitName: 'units',
    maxUnits: 160,
    valueBonus: { upgrade: 'named', bonus: 0.05 },
    raids: false,
    boost: {
      units: 80,
      maxRealMs: 24 * 60 * 60_000,
      resetUtcHour: 6,
      source:
        'gta.wiki, Acid Product: once per real-time day, resetting at 6 a.m. GMT; "lasts until 80 ' +
        'units of stock have been produced, or 24 real-time hours have passed".',
      checked: ACID_CHECKED,
    },
    rates: [
      {
        upgrades: [],
        minutesPerUnit: 135 / 60,
        boostedMinutesPerUnit: 68 / 60,
        unitValue: 1_485,
        unitsPerFullSupplies: 50,
      },
      {
        upgrades: ['equipment'],
        minutesPerUnit: 90 / 60,
        boostedMinutesPerUnit: 45 / 60,
        unitValue: 2_095,
        unitsPerFullSupplies: 100,
      },
    ],
    source:
      'gta.wiki, Acid Product: 160 units; seconds and value per unit with and without the ' +
      'equipment upgrade, boosted and not; 2 units of supplies per unit without the upgrade, of ' +
      '100 in a full bar; a unique name adds 5% to the value. gta.wiki, Acid Lab: no security ' +
      'upgrade, as it cannot be raided; a full resupply costs $60,000. GTABoom, Acid Lab Business ' +
      'Guide: filling the lab takes $192,000 of supplies without the upgrade and $96,000 with ' +
      'it, so 1.6 full bars, or 100 units per full bar, with the upgrade.',
    checked: ACID_CHECKED,
  },
]
