// This week's GTA Online events (issue #16, decision 027), replaced by a pull request each week.
// Copied from the gta.wiki weekly event page in `source`; how to write it: docs/weekly-update.md.

import type { Week } from '../lib/weekly'

export const WEEK: Week = {
  title: 'Halloween 2026 (Week 3)',
  start: '2026-10-15T09:00:00Z',
  end: '2026-10-22T09:00:00Z',
  source: 'https://gta.wiki/w/Halloween_2026_(Week_3)',
  newswire:
    'https://www.rockstargames.com/newswire/article/39a22k25434a53/experience-halloween-thrills-all-throughout-october-in-gta-online',
  multipliers: [
    { activity: 'Ludendorff Cemetery Survival', factor: 3, pays: 'GTA$ and RP' },
    { activity: 'Cayo Perico Survival', factor: 3, pays: 'GTA$ and RP' },
    { activity: 'Alien Survivals', factor: 3, pays: 'GTA$ and RP' },
    { activity: 'Slasher', factor: 3, pays: 'GTA$ and RP' },
    { activity: 'San Andreas Super Sport Series', factor: 3, pays: 'GTA$ and RP' },
    { activity: 'Random Transform Races', factor: 3, pays: 'GTA$ and RP' },
    { activity: 'Community Race Series', factor: 3, pays: 'GTA$ and RP' },
    {
      activity: 'Standard and Most Wanted Bounties',
      factor: 2,
      pays: 'GTA$ and RP',
      property: 'bail-office',
    },
    { activity: 'Dispatch Work', factor: 2, pays: 'GTA$ and RP' },
    { activity: 'UFO Business Battle', factor: 2, pays: 'GTA$ and RP' },
    { activity: "Jack O' Lanterns", factor: 2, pays: 'GTA$ and RP' },
    { activity: 'Ghosts Exposed', factor: 2, pays: 'GTA$' },
  ],
  challenge: {
    task: 'Win 3 Races',
    reward: 'GTA$100,000 and the Orange Glow Skeleton Onesie',
  },
  gifts: [
    "Complete Don't Fuck With Dre this week: GTA$500,000 within 72 hours",
    'Complete all Weekly Challenges through November 4: GTA$2,000,000 within 72 hours',
    'Free Butchery and Other Hobbies T-Shirt at any clothing store',
  ],
  rotations: [
    { label: 'Lucky Wheel podium', items: ['Grotti LSCM Cheetah Classic'] },
    {
      label: 'Prize Ride',
      items: ['Dinka Kanjo SJ'],
      note: 'Place Top 5 in any LS Car Meet Series race 1 time this week',
    },
    {
      label: 'Salvage Yard robberies',
      items: ['BF Weevil', 'Grotti Itali RSX', 'Albany Fränken Stange'],
    },
    { label: 'FIB Priority File', items: ['The Brute Force File'] },
    {
      label: 'Kortz Center Heist paintings',
      items: ['Twindifference', 'Teckels', 'A Cast of Characters'],
    },
    {
      label: 'LS Car Meet Test Rides',
      items: ['Declasse Vamos', 'Dewbauchee Seven-70', 'Ocelot Locust'],
    },
    { label: 'Luxury Autos', items: ['Dewbauchee Rapid GT X', 'Übermacht Sentinel XS4'] },
    {
      label: 'Premium Deluxe Motorsport',
      items: [
        'LCC Sanctus',
        'Albany Fränken Stange',
        'Albany Brigham',
        'Declasse Tornado Rat Rod',
        'Albany Lurcher',
      ],
    },
    { label: "Hao's Premium Test Ride", items: ['Maibatsu MonstroCiti'] },
    {
      label: 'Gun Van stock',
      items: [
        'Baseball Bat',
        'The Shocker',
        'Service Carbine',
        'Up-n-Atomizer',
        'Unholy Hellbringer',
        'Precision Rifle',
        'Combat Shotgun',
        'El Strickler',
        'Pipe Bomb',
      ],
    },
    { label: 'Premium Race', items: ['Criminal Records (Super)'] },
    { label: 'Time Trial', items: ['Coast to Coast'] },
    { label: 'HSW Time Trial', items: ['Pacific Bluffs'] },
  ],
  discounts: [
    { kind: 'vehicle', item: 'Albany Brigham', percent: 40 },
    { kind: 'vehicle', item: 'Albany Fränken Stange', percent: 40 },
    { kind: 'vehicle', item: 'Albany Lurcher', percent: 40 },
    { kind: 'vehicle', item: 'Declasse Tornado Rat Rod', percent: 40 },
    { kind: 'vehicle', item: 'LCC Sanctus', percent: 40 },
    { kind: 'vehicle', item: 'Annis Hardy', percent: 30 },
    { kind: 'vehicle', item: 'BF Raptor', percent: 30 },
    { kind: 'vehicle', item: 'Buckingham Miljet', percent: 30 },
    { kind: 'vehicle', item: 'Buckingham Tug', percent: 30 },
    { kind: 'vehicle', item: 'Dinka Sugoi', percent: 30 },
    { kind: 'vehicle', item: 'Karin Calico GTF', percent: 30 },
    { kind: 'vehicle', item: 'Nagasaki Weaponized Dinghy', percent: 30 },
    { kind: 'vehicle', item: 'Vapid Winky', percent: 30 },
    { kind: 'vehicle', item: 'Western Annihilator', percent: 30 },
    { kind: 'property', item: 'Agencies, upgrades and modifications', percent: 40 },
    { kind: 'weapon', item: 'Baseball Bat', percent: 100 },
    { kind: 'weapon', item: 'The Shocker', percent: 100 },
    { kind: 'weapon', item: 'Service Carbine', percent: 30 },
  ],
  alsoRunning: [
    'Cerberus Surprise',
    'Slashers Event',
    'Possessed Animals',
    'Phantom Car',
    'Peyote Plants',
  ],
}
