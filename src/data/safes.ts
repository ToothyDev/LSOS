// Property safes: what they pay per in-game day, how much they hold, and nightclub popularity
// (decision 004, decision 013, decision 016).

/** One in-game day, the payout interval of every safe: 48 minutes of play time. */
export const PAYOUT_MINUTES = 48

/** A row of a payout table: what a safe pays per day from this percent up to the next row. */
export interface PayoutRow {
  from: number
  amount: number
}

export type SafePayout =
  /** By popularity: the row with the highest `from` at or below it. */
  | { kind: 'popularity'; rows: readonly PayoutRow[] }
  /**
   * `base` plus `perStep` for each full step of a count upgrade, up to `max`; e.g. $500 per 5
   * security contracts.
   */
  | {
      kind: 'steps'
      upgrade: string
      base: number
      perStep: number
      stepSize: number
      max: number
    }
  /** `full` with all `slots` filled (a count upgrade), else that share of it. */
  | { kind: 'slots'; upgrade: string; full: number; slots: number }
  /** A fixed amount, or another with an upgrade bought. */
  | { kind: 'fixed'; amount: number; withUpgrade?: { upgrade: string; amount: number } }
  /** A random amount from `min` to `max` each day; tracked as the middle of the two. */
  | { kind: 'range'; min: number; max: number }

/** A one-click popularity change, e.g. a finished promotion job. */
export interface Boost {
  label: string
  /** Percent added, up to 100. */
  adds: number
  /** What it stands for in game, shown as a tooltip. */
  title: string
  /** True if the amount is an estimate (decision 013). */
  estimate?: true
}

export interface Safe {
  /** The property whose safe this is; also the key of its saved state. */
  propertyId: string
  /** Most money the safe holds; more with `bigger` bought. */
  capacity: number
  bigger?: { upgrade: string; capacity: number }
  payout: SafePayout
  /** Nightclub only: popularity sets the payout and drops every in-game day. */
  popularity?: {
    /** Percent lost per in-game day, and with the upgrade that slows it. */
    lossPerDay: number
    slower: { upgrade: string; lossPerDay: number }
    boosts: readonly Boost[]
  }
  /**
   * Best-estimate note shown on the card. Set when the payout or popularity rests on estimates;
   * which numbers get "(est.)" is in `estimatedParts` (lib/safes.ts).
   */
  estimate?: string
  source: string
  checked: string
}

export const SAFES_CHECKED = '2026-10-14'
/** Arcade floor slots; a machine that takes two counts as two. */
export const ARCADE_SLOTS = 35

/** In card order: fastest to fill at the best payout first. */
export const SAFES: readonly Safe[] = [
  {
    propertyId: 'nightclub',
    capacity: 250_000,
    payout: {
      kind: 'popularity',
      rows: [
        { from: 95, amount: 50_000 },
        { from: 90, amount: 45_000 },
        { from: 85, amount: 25_000 },
        { from: 80, amount: 24_000 },
        { from: 75, amount: 23_000 },
        { from: 70, amount: 22_000 },
        { from: 65, amount: 21_000 },
        { from: 60, amount: 20_000 },
        { from: 55, amount: 10_000 },
        { from: 50, amount: 9_500 },
        { from: 45, amount: 9_000 },
        { from: 40, amount: 8_500 },
        { from: 35, amount: 8_000 },
        { from: 30, amount: 2_500 },
        { from: 25, amount: 2_200 },
        { from: 20, amount: 2_000 },
        { from: 15, amount: 1_800 },
        { from: 10, amount: 1_600 },
        { from: 0, amount: 1_500 },
      ],
    },
    popularity: {
      lossPerDay: 10,
      slower: { upgrade: 'staff', lossPerDay: 5 },
      boosts: [
        {
          label: 'Promotion +25%',
          adds: 25,
          title: 'A finished promotion job for Tony or Lazlow',
        },
        {
          label: 'DJ +10%',
          adds: 10,
          title: 'Switching back to a DJ you had before (a new DJ fills the bar: drag it to full)',
        },
        {
          label: 'Event +10% (est.)',
          adds: 10,
          title: 'Ejecting a troublemaker or driving a VIP home for Marcel. Amount estimated',
          estimate: true,
        },
      ],
    },
    estimate:
      'Popularity loss per day (10%, 5% with Staff) and the event boost are best estimates: ' +
      'no source gives them.',
    source:
      'gta.wiki, Nightclubs: safe holds $250,000, pays every in-game day (48 minutes) by ' +
      'popularity (table, current $50,000 maximum), Staff Upgrade "will reduce the daily ' +
      'popularity loss"; first switch to a DJ fills the bar, a switch back adds 10%. gta.wiki, ' +
      'Nightclubs/Nightclub Management: promotion jobs for Tony and Lazlow add 25%. Estimates ' +
      '(issue #41): loss 10% per day, 5% with Staff (player guides disagree; gtabase, Nightclub ' +
      'money guide, says 5% with Staff); Marcel events +10% (the wiki gives no amount).',
    checked: SAFES_CHECKED,
  },
  {
    propertyId: 'agency',
    capacity: 250_000,
    payout: {
      kind: 'steps',
      upgrade: 'contracts',
      base: 250,
      perStep: 500,
      stepSize: 5,
      max: 20_000,
    },
    estimate:
      'The payout is a best estimate: $250 base plus $500 for every 5 security contracts, ' +
      'up to $20,000.',
    source:
      'gta.wiki, Security Contracts: safe holds $250,000, payout capped at $20,000 per day ' +
      '(201 contracts), rising with contracts done. Steps of $500 per 5 contracts: gtaboss, ' +
      'How to complete Security Contracts. Base $250: sportskeeda, GTA Online Agency passive ' +
      'income guide. Step and base payout unconfirmed (issue #40).',
    checked: SAFES_CHECKED,
  },
  {
    propertyId: 'arcade',
    capacity: 100_000,
    payout: { kind: 'slots', upgrade: 'floor-slots', full: 5_000, slots: ARCADE_SLOTS },
    estimate:
      'With fewer than all 35 floor slots filled the payout is a best estimate: $5,000 shared ' +
      'evenly over the 35 slots.',
    source:
      'gta.wiki, Arcades: safe holds $100,000, at most $5,000 per in-game day with every ' +
      'floor slot filled, any machine counts the same. 35 slots: faxagate, Arcade Games Guide; ' +
      'sportskeeda, What do GTA Online players get with the Arcade. Per-slot share: issue #42.',
    checked: SAFES_CHECKED,
  },
  {
    propertyId: 'garment-factory',
    capacity: 100_000,
    payout: { kind: 'range', min: 1_500, max: 2_000 },
    estimate:
      'The game pays a random $1,500 to $2,000 a day; LSOS counts the middle, $1,750, so the ' +
      'safe money is a best estimate. Correct it when you visit.',
    source:
      'gta.wiki, Garment Factory: employees generate a random $1,500 to $2,000 daily, collected ' +
      'from the safe in the office; the safe holds $100,000. No upgrade changes it.',
    checked: SAFES_CHECKED,
  },
  {
    propertyId: 'salvage-yard',
    capacity: 100_000,
    bigger: { upgrade: 'wall-safe', capacity: 250_000 },
    payout: { kind: 'fixed', amount: 250, withUpgrade: { upgrade: 'staff', amount: 300 } },
    estimate:
      'Too little documented to track reliably. LSOS assumes 0% reputation (no towing): ' +
      'reputation drops each day at a rate no source gives.',
    source:
      'gta.wiki, Salvage Yard: pays every in-game day (48 minutes) by reputation, $250 at 0% ' +
      '($300 with Staff), the Wall Safe holds $250,000. Safe without the Wall Safe $100,000: ' +
      'gtaboss, How to get completely passive income. Open questions: issue #43.',
    checked: SAFES_CHECKED,
  },
]
