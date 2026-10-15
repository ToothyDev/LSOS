// Money Fronts: one safe in the Hands On Car Wash, paid by the three fronts and by every other
// business owned, and a heat bar per front (decision 004, decision 018).

export const FRONTS_CHECKED = '2026-10-15'

/** The front whose safe holds the money; without it there is no safe. */
export const CAR_WASH = 'car-wash'

export interface Front {
  propertyId: string
  label: string
  /** Paid into the safe per in-game day while the front's heat is below 100%. */
  amount: number
  /** Paid instead after `doubleAfter` laundering missions for this front. */
  doubled: number
}

/** Laundering missions for a front (Mr. Faber jobs count for every front) that double its pay. */
export const DOUBLE_AFTER = 15
/** The laundering-mission count upgrade on each front (data/properties.ts). */
export const MISSIONS_UPGRADE = 'laundering'

export const FRONTS: readonly Front[] = [
  { propertyId: CAR_WASH, label: 'Hands On Car Wash', amount: 750, doubled: 1_500 },
  { propertyId: 'helitours', label: 'Higgins Helitours', amount: 750, doubled: 1_500 },
  { propertyId: 'smoke-on-the-water', label: 'Smoke on the Water', amount: 750, doubled: 1_500 },
]

/** Most money the safe holds. */
export const FRONTS_CAPACITY = 100_000

/** What another owned business adds to the safe per in-game day. */
export interface Share {
  propertyId: string
  amount: number
}

/** The Special Cargo Warehouse counts once, by the largest size owned (an upgrade on it). */
export const WAREHOUSE_SIZE_UPGRADE = 'largest'
export const WAREHOUSE_SHARES: Readonly<Record<string, number>> = {
  large: 1_500,
  medium: 1_250,
  small: 750,
}

export const SHARES: readonly Share[] = [
  { propertyId: 'vehicle-warehouse', amount: 1_500 },
  { propertyId: 'mc-cash', amount: 1_250 },
  { propertyId: 'mc-cocaine', amount: 1_500 },
  { propertyId: 'mc-documents', amount: 1_000 },
  { propertyId: 'mc-meth', amount: 1_250 },
  { propertyId: 'mc-weed', amount: 1_000 },
  { propertyId: 'bunker', amount: 1_500 },
  { propertyId: 'hangar', amount: 1_500 },
  { propertyId: 'nightclub', amount: 1_500 },
  { propertyId: 'arcade', amount: 1_500 },
  { propertyId: 'auto-shop', amount: 1_500 },
  { propertyId: 'agency', amount: 1_750 },
  { propertyId: 'acid-lab', amount: 1_250 },
  { propertyId: 'salvage-yard', amount: 1_500 },
  { propertyId: 'bail-office', amount: 1_500 },
  { propertyId: 'garment-factory', amount: 1_750 },
  { propertyId: 'mckenzie-hangar', amount: 1_500 },
]

/** Heat added to a front by a laundering mission or a Mr. Faber job launched from it. */
export const HEAT_PER_MISSION = 10

/**
 * Heat each front below 100% gains per in-game day: 10% with only one front below 100%, one
 * less for each other front below 100% (8% with all three).
 */
export const HEAT_RISE_ALONE = 10

export const FRONTS_ESTIMATE =
  'Heat is a best estimate: how it rises comes from players, not the game files, and LSOS ' +
  'raises every front below 100% at the end of each in-game day.'

export const FRONTS_SOURCE =
  'gta.wiki, Hands On Car Wash (GTA Online): income of all three fronts is collected from the ' +
  'safe in the car wash, $750 each, $1,500 after 15 Money Laundering missions for a front, Mr. ' +
  'Faber Work counts for all three, the safe holds $100,000. gta.wiki, Higgins Helitours and ' +
  'Smoke on the Water (GTA Online): passive income only while heat is below 100%. gta.wiki, GTA ' +
  'Online: Money Fronts: heat per business, raised by laundering, lowered by legitimate work. ' +
  'Payout every 48 minutes and the amount per other business (in-game safe screen): Harry ' +
  '(@harryodini588) on X, 2025-06-18; warehouses count by the largest size. Heat: PLTytus on ' +
  'X, 2025-06-20: +10% per laundering or Faber mission, legal work resets it, +10/9/8% every 48 ' +
  'minutes, 100% at the car wash stops the safe, at another front only its own pay.'
