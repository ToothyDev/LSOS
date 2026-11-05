// This week's GTA Online events (issue #16, decision 027), replaced by a pull request each week.
// Copied from the gta.wiki weekly event page in `source`; how to write it: docs/weekly-update.md.

import type { Week } from '../lib/weekly'

export const WEEK: Week = {
  title: 'The Heist Event Week',
  start: '2026-11-05T10:00:00Z',
  end: '2026-11-12T10:00:00Z',
  source: 'https://gta.wiki/w/The_Heist_Event_Week',
  newswire:
    'https://www.rockstargames.com/newswire/article/4k17a844oakk5o/take-down-the-kortz-center-and-more-high-value-targets-in-this-week-s',
  multipliers: [
    { activity: 'Mansion Raid', factor: 3, pays: 'GTA$ and RP', property: 'mansion' },
    { activity: 'Community Race Series', factor: 2, pays: 'GTA$ and RP' },
  ],
  challenge: {
    task: 'Win an Adversary Mode',
    reward: 'GTA$100,000',
  },
  gifts: [
    'Log in this week: free The Great Circle Back Mansion Decoration',
    'Guaranteed Panther Statue Primary Target in your first run of The Cayo Perico Heist',
    'Guaranteed The Outcome of Endeavour Primary Target Painting in your first run of The Kortz Center Heist',
  ],
  rotations: [
    { label: 'Lucky Wheel podium', items: ['Överflöd Entity XXR'] },
    {
      label: 'Prize Ride',
      items: ['Annis Hellion'],
      note: 'Place Top 5 in any LS Car Meet Series race 3 days in a row this week',
    },
    {
      label: 'Salvage Yard robberies',
      items: ['Annis Hellion', 'Truffade Z-Type', 'Lampadati Cinquemila'],
    },
    { label: 'FIB Priority File', items: ['The Black Box File'] },
    {
      label: 'Kortz Center Heist paintings',
      items: [
        'The Outcome of Endeavour',
        'To Beat About the Bush',
        'Hare Oneself Think',
        'True Love',
      ],
    },
    {
      label: 'LS Car Meet Test Rides',
      items: ['Pegassi Reaper', 'HVY Insurgent', 'Cheval Taipan'],
    },
    { label: 'Luxury Autos', items: ['Grotti Veleno GT', 'Grotti GT750'] },
    {
      label: 'Premium Deluxe Motorsport',
      items: [
        'Dinka Blista Kanjo',
        'Grotti Cheetah',
        'Invetero Coquette D5',
        'Maibatsu Penumbra FF',
        'Benefactor Vorschlaghammer',
      ],
    },
    { label: "Hao's Premium Test Ride", items: ['Grotti Brioso R/A'] },
    {
      label: 'Gun Van stock',
      items: [
        'Baseball Bat',
        'Knife',
        'Precision Rifle',
        'Compact EMP Launcher',
        'El Strickler',
        'Sweeper Shotgun',
        'Knuckle Duster',
        'Proximity Mines',
        'Pipe Bomb',
        'Molotov Cocktails',
      ],
    },
    { label: 'Premium Race', items: ['At the Races (Off-Road)'] },
    { label: 'Time Trial', items: ['LSIA'] },
    { label: 'HSW Time Trial', items: ['Del Perro Beach'] },
  ],
  discounts: [
    { kind: 'vehicle', item: 'Benefactor Vorschlaghammer', percent: 30 },
    { kind: 'vehicle', item: 'Cheval Taipan', percent: 30 },
    { kind: 'vehicle', item: 'Dinka Blista Kanjo', percent: 30 },
    { kind: 'vehicle', item: 'Grotti Cheetah', percent: 30 },
    { kind: 'vehicle', item: 'HVY Insurgent', percent: 30 },
    { kind: 'vehicle', item: 'Invetero Coquette D5', percent: 30 },
    { kind: 'vehicle', item: 'Maibatsu Penumbra FF', percent: 30 },
    { kind: 'vehicle', item: 'Pegassi Reaper', percent: 30 },
    { kind: 'vehicle', item: 'Western Company Besra', percent: 30 },
    { kind: 'vehicle', item: 'Western Rampant Rocket', percent: 30 },
    { kind: 'vehicle', item: 'Grotti Veleno GT', percent: 25 },
    { kind: 'property', item: 'Master Penthouse, upgrades and modifications', percent: 40 },
    { kind: 'property', item: 'Facilities, upgrades and modifications', percent: 40 },
    { kind: 'property', item: 'High-End Apartments', percent: 40 },
    { kind: 'weapon', item: 'Baseball Bat', percent: 100 },
    { kind: 'weapon', item: 'Knife', percent: 100 },
    { kind: 'weapon', item: 'Precision Rifle', percent: 50 },
  ],
  alsoRunning: [],
}
