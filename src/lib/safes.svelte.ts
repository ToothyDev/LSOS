// Runs property safes (issue #8) and the Money Fronts safe (issue #11) on play time. Logic lives
// in safes.ts and fronts.ts; this file only wires it to the play clock and the store.
import { PROPERTIES } from '../data/properties'
import { CAR_WASH } from '../data/fronts'
import { SAFES } from '../data/safes'
import { onPlayTime } from './clock.svelte'
import { advanceFronts, emptyFronts } from './fronts'
import { advanceSafes } from './safes'
import { store } from './store.svelte'

onPlayTime((ms) => {
  const owned = store.state.properties
  let safes = advanceSafes(store.state.safes, SAFES, PROPERTIES, owned, ms)
  const fronts = safes[CAR_WASH] ?? emptyFronts()
  const after = advanceFronts(fronts, owned, PROPERTIES, ms)
  if (after !== fronts) safes = { ...safes, [CAR_WASH]: after }
  store.state.safes = safes
})
