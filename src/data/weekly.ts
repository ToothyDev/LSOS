// This week's GTA Online events (issue #16, decision 027), replaced by a pull request each week.
// Copied from the gta.wiki weekly event page in `source`; how to write it: docs/weekly-update.md.

import type { Week } from '../lib/weekly'

export const WEEK: Week = {
  title: 'Halloween 2026 (Week 5)',
  start: '2026-10-29T09:00:00Z',
  end: '2026-11-05T10:00:00Z',
  source: 'https://gta.wiki/w/Halloween_2026_(Week_5)',
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
    { activity: 'Community Mission Series', factor: 3, pays: 'GTA$ and RP' },
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
    task: 'Complete a Survival without dying',
    reward: 'GTA$250,000 and the Slasher Clown Outfit',
  },
  gifts: [
    'Complete all Weekly Challenges through November 4: GTA$2,000,000 within 72 hours',
    'Log in this week: free Día de Muertos Tee, Maritime Calaca Mask, Royal Calaca Mask, Brown Vintage Skull Mask and Halloween Chute Bag',
  ],
  rotations: [
    { label: 'Lucky Wheel podium', items: ['Progen GP1'] },
    {
      label: 'Prize Ride',
      items: ['Karin Previon'],
      note: 'Place Top 5 in any LS Car Meet Series race 2 days in a row this week',
    },
    {
      label: 'Salvage Yard robberies',
      items: ['Karin Boor', 'Albany Fränken Stange', 'Lampadati Cinquemila'],
    },
    { label: 'FIB Priority File', items: ['The Project Breakaway File'] },
    {
      label: 'Kortz Center Heist paintings',
      items: ['I, Fruit', 'Until Death', 'Gone To Seed'],
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
    { label: 'Premium Race', items: ['Wiwang Park (Sports)'] },
    { label: 'Time Trial', items: ['Route 68'] },
    { label: 'HSW Time Trial', items: ['East Vinewood'] },
  ],
  discounts: [
    { kind: 'vehicle', item: 'Albany Brigham', percent: 40 },
    { kind: 'vehicle', item: 'Albany Fränken Stange', percent: 40 },
    { kind: 'vehicle', item: 'Albany Lurcher', percent: 40 },
    { kind: 'vehicle', item: 'Declasse Tornado Rat Rod', percent: 40 },
    { kind: 'vehicle', item: 'LCC Sanctus', percent: 40 },
    { kind: 'vehicle', item: 'Bravado Gauntlet Classic', percent: 30 },
    { kind: 'vehicle', item: 'Invetero Coquette D10', percent: 30 },
    { kind: 'vehicle', item: 'Karin Futo GTX', percent: 30 },
    { kind: 'vehicle', item: 'MTL Dune', percent: 30 },
    { kind: 'vehicle', item: 'Pegassi Infernus Classic', percent: 30 },
    { kind: 'vehicle', item: 'Shitzu Keitora', percent: 30 },
    { kind: 'vehicle', item: 'Übermacht Zion Classic', percent: 30 },
    { kind: 'vehicle', item: 'Vapid Firebolt ASP', percent: 30 },
    { kind: 'vehicle', item: 'Vapid FMJ', percent: 30 },
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
