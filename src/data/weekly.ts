// This week's GTA Online events (issue #16, decision 027), replaced by a pull request each week.
// Copied from the gta.wiki weekly event page in `source`; how to write it: docs/weekly-update.md.

import type { Week } from '../lib/weekly'

export const WEEK: Week = {
  title: 'Contact Missions (Week 1)',
  start: '2026-11-12T10:00:00Z',
  end: '2026-11-19T10:00:00Z',
  source: 'https://gta.wiki/w/Contact_Missions_(Week_1)',
  newswire:
    'https://www.rockstargames.com/newswire/article/4k17a844oakk5o/take-down-the-kortz-center-and-more-high-value-targets-in-this-week-s',
  multipliers: [
    { activity: 'Freemode Challenges', factor: 4, pays: 'GTA$ and RP' },
    { activity: 'Stunt Races', factor: 3, pays: 'GTA$ and RP' },
    { activity: 'Community Series', factor: 3, pays: 'GTA$ and RP' },
    { activity: 'Sumo (Remix)', factor: 2, pays: 'GTA$ and RP' },
    { activity: 'Contact Missions', factor: 2, pays: 'GTA$ and RP' },
  ],
  challenge: {
    task: 'Win 2 Stunt Races',
    reward: 'GTA$100,000',
  },
  gifts: [],
  rotations: [
    { label: 'Lucky Wheel podium', items: ['Karin Everon'] },
    {
      label: 'Prize Ride',
      items: ['Western Powersurge'],
      note: 'Place Top 4 in any LS Car Meet Series race 2 days in a row this week',
    },
    {
      label: 'Salvage Yard robberies',
      items: ['Canis Seminole Frontier', 'Karin Hotring Everon', 'Grotti Stinger TT'],
    },
    { label: 'FIB Priority File', items: ['The Brute Force File'] },
    {
      label: 'Kortz Center Heist paintings',
      items: ['In Excess of Success', 'What are Melons?', 'Breathless'],
    },
    {
      label: 'LS Car Meet Test Rides',
      items: ['Obey I-Wagen', 'Declasse Impaler LX', 'Übermacht Rebla GTS'],
    },
    { label: 'Luxury Autos', items: ['Declasse Tampa GT', 'Pfister Astrale'] },
    {
      label: 'Premium Deluxe Motorsport',
      items: [
        'Declasse Hotring Sabre',
        'Karin Vivanite',
        'Obey Tailgater S',
        'Declasse Tahoma Coupe',
        'Canis Castigator',
      ],
    },
    { label: "Hao's Premium Test Ride", items: ['Weeny Issi Rally'] },
    {
      label: 'Gun Van stock',
      items: [
        'Baseball Bat',
        'Knife',
        'Tactical SMG',
        'Combat Shotgun',
        'Stun Gun',
        'Up-n-Atomizer',
        'Compact Rifle',
        'Molotov Cocktails',
        'Sticky Bombs',
        'Proximity Mines',
      ],
    },
    { label: 'Premium Race', items: ['Down the Drain (Muscle)'] },
    { label: 'Time Trial', items: ['Calafia Way'] },
    { label: 'HSW Time Trial', items: ['Sandy Shores'] },
  ],
  discounts: [
    { kind: 'vehicle', item: 'Canis Castigator', percent: 30 },
    { kind: 'vehicle', item: 'Declasse Hotring Sabre', percent: 30 },
    { kind: 'vehicle', item: 'Declasse Impaler LX', percent: 30 },
    { kind: 'vehicle', item: 'Declasse Tahoma Coupe', percent: 30 },
    { kind: 'vehicle', item: 'Dewbauchee Vagner', percent: 30 },
    { kind: 'vehicle', item: 'Karin Vivanite', percent: 30 },
    { kind: 'vehicle', item: 'MTL Wasteland', percent: 30 },
    { kind: 'vehicle', item: 'Obey I-Wagen', percent: 30 },
    { kind: 'vehicle', item: 'Obey Tailgater S', percent: 30 },
    { kind: 'vehicle', item: 'Übermacht Rebla GTS', percent: 30 },
    { kind: 'weapon', item: 'Baseball Bat', percent: 100 },
    { kind: 'weapon', item: 'Knife', percent: 100 },
    { kind: 'weapon', item: 'Tactical SMG', percent: 40 },
  ],
  alsoRunning: [],
}
