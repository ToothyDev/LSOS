// Runs business and nightclub production on play time (issues #6, #7). Logic lives in production.ts; this file
// only wires it to the play clock and the store.
import { SUPPLY_PURCHASE } from '../data/business-events'
import { GOODS } from '../data/nightclub'
import { PRODUCTION } from '../data/production'
import { PROPERTIES } from '../data/properties'
import { onPlayTime } from './clock.svelte'
import { produceGoods } from './nightclub'
import { produceAll } from './production'
import { store } from './store.svelte'

onPlayTime((ms) => {
  const produced = produceAll(
    store.state.businesses,
    PROPERTIES,
    PRODUCTION,
    store.state.properties,
    ms,
    Date.now(),
    SUPPLY_PURCHASE.fillsTo,
    store.state.boosts,
  )
  store.state.businesses = produced.businesses
  store.state.boosts = produced.boosts
  store.state.nightclub = produceGoods(
    store.state.nightclub,
    GOODS,
    PROPERTIES,
    store.state.properties,
    ms,
  )
})
