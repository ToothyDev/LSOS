# 028: Hiding cards from the Overview and the alerts

2026-10-15, issue #62. Builds on decision 023.

## Decision

- **Per card, not per item.** What is hidden is an event's `focus`, the card it links to:
  `car-wash` hides the Money Fronts safe and its heat together, `nightclub` its safe and its
  goods. The Lucky Wheel (`lucky-wheel`) and the Mansion boost (`mansion`) hide the same way,
  though they belong to no business card. Saved as `overviewHidden` (state version 14).
- **Where:** a small Hide control on each Ready now and Coming up item, with the same Undo as the
  quick actions; Settings lists what is hidden ("Hidden from Overview"), each with Show. Not on
  the cards' gear menus: the timers have none, and one place to undo is enough.
- **Only the Overview and the alerts leave it out.** The card stays owned and tracked on its
  own tab, and its money still counts in the summary strip: the totals say what you have.
- **No alert on showing again.** Hidden items still count as seen by the alerts, so an item
  already near or due when it is shown again does not pop up; one that comes near later does.

## Alternatives

- Per item (`heat:car-wash` apart from `safe:car-wash`): finer, but a longer list to manage,
  and no case asked for it yet.
- Leaving hidden cards out of the totals: the strip would then understate the money waiting.
