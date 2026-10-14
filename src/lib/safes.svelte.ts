// Runs property safes on play time (issue #8). Logic lives in safes.ts; this file only wires it
// to the play clock and the store.
import { PROPERTIES } from '../data/properties'
import { SAFES } from '../data/safes'
import { onPlayTime } from './clock.svelte'
import { advanceSafes } from './safes'
import { store } from './store.svelte'

onPlayTime((ms) => {
  store.state.safes = advanceSafes(store.state.safes, SAFES, PROPERTIES, store.state.properties, ms)
})
