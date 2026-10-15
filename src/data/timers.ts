// Real-time cooldowns on the Timers tab (issues #13, #14): they run on the wall clock, also while
// LSOS is closed (decision 003). Every value has a source (decision 004).

const HOUR_MS = 60 * 60_000
const CHECKED = '2026-10-15'

/** The Diamond Casino's Lucky Wheel: one spin per cooldown. */
export const LUCKY_WHEEL = {
  cooldownMs: 24 * HOUR_MS,
  source:
    'gta.wiki, Lucky Wheel: "can only be used once per real-life 24 hours per account". The ' +
    'extra daily GTA+ spin is left out: no source says how it is timed.',
  checked: CHECKED,
} as const

/** The Mansion's business production boost, started through the AI assistant. */
export const MANSION_BOOST = {
  /** Owning this property gives the boost. */
  propertyId: 'mansion',
  /** Production runs this many times as fast while the boost is on. */
  speed: 3,
  durationMs: 24 * HOUR_MS,
  /** Real time from one boost's start until the next can be started. */
  cooldownMs: 24 * HOUR_MS,
  /** The businesses it can boost, one at a time, never the same one twice in a row. */
  propertyIds: [
    'mc-cocaine',
    'mc-meth',
    'mc-cash',
    'mc-weed',
    'mc-documents',
    'bunker',
    'acid-lab',
  ],
  source:
    'gta.wiki, Prix Luxury AI Concierge: "increase the production speed threefold at one of ' +
    'the player\'s businesses", "lasting 24 real-life hours", for the Meth Lab, Weed Farm, ' +
    'Cocaine Lockup, Counterfeit Cash Factory, Document Forgery Office, Bunkers and Acid Lab; ' +
    '"The same business can\'t be boosted back-to-back". gta.wiki, Mansions: "once a day ' +
    '(cooldown of 24 real-life hours)".',
  checked: CHECKED,
} as const
