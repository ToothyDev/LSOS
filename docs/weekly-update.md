# Writing a week's events

Each Thursday's GTA Online events go into `src/data/weekly.ts` (decision 027), replaced in full
by one pull request. By hand or by the weekly routine (#17), the steps are the same.

1. **Wait for the page.** Find the week's page on gta.wiki: the newest in
   [Category:Weekly events](https://gta.wiki/w/Category:Weekly_events), e.g. "Halloween 2026
   (Week 3)". It is filled in during Thursday; write the file in the late afternoon (UTC), when
   the Gun Van, Salvage Yard and Prize Ride parts are in. Raw text:
   `https://gta.wiki/api.php?action=parse&page=<title>&prop=wikitext&format=json`.
2. **Week.** `title` is the page title, `source` its URL (`https://gta.wiki/w/<Title_with_underscores>`),
   `newswire` the Rockstar link in its infobox, if any. `start` is the Thursday the page names at
   2:00 AM US Pacific, `end` the day after its last day at the same time: `09:00:00Z` while the
   US is on daylight saving time (mid-March to early November), `10:00:00Z` otherwise. For a week
   longer than seven days, `end` follows the page's dates.
3. **Copy the sections**, standard values only. Leave out anything GTA+ only, and the daily
   Junk Energy and RC Time Trials.

   | Wiki section                         | Field                                             |
   | ------------------------------------ | ------------------------------------------------- |
   | Standard Bonuses: "3x GTA$ and RP …" | `multipliers` (`factor`, `pays`, `activity`)      |
   | Weekly Challenge                     | `challenge` (`task`, `reward`)                    |
   | Bonuses: free items, one-off rewards | `gifts`, one line each with its deadline          |
   | Job Updates, Standard Bonuses, Races | `rotations` (`label`, `items`, optional `note`)   |
   | Discounts                            | `discounts` (`kind`, `item`, `percent`; free 100) |
   | Job Updates: still-available events  | `alsoRunning`, only those with no bonus this week |

   A multiplier that pays through a property LSOS knows gets that `property` id from
   `src/data/properties.ts` (e.g. bounties: `bail-office`), so owners see it first. The Prize
   Ride's challenge is on the wiki's Prize Ride Challenge page; put it in the rotation's `note`.
   Keep the rotation labels of the previous week, so the tab reads the same each week.

4. **Check.** `npm run verify 2>&1 | tail -n 5`. The type and the `weekly` test catch missing
   fields, an end before the start, odd numbers and unknown property ids.
5. **Pull request** titled `Weekly events: <title>`, linking the wiki page.
