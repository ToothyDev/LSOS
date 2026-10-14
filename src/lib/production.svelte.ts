// Runs business production on play time (issue #6). Logic lives in production.ts; this file
// only wires it to the play clock and the store.
import { SUPPLY_PURCHASE } from '../data/business-events'
import { PRODUCTION } from '../data/production'
import { PROPERTIES } from '../data/properties'
import { onPlayTime } from './clock.svelte'
import { produceAll } from './production'
import { store } from './store.svelte'

onPlayTime((ms) => {
  store.state.businesses = produceAll(
    store.state.businesses,
    PROPERTIES,
    PRODUCTION,
    store.state.properties,
    ms,
    Date.now(),
    SUPPLY_PURCHASE.fillsTo,
  )
})
