// Which card on a tab has its edit controls or its settings open (issue #60): one card and one
// mode at a time, so Edit and the gear never stack on the same card.
//
// Trial (issue #60): two ways to edit a card are on offer until one is picked. `exclusive` keeps
// the Edit button; `always` drops it and shows the edit controls on every card. Remove the
// switch and the losing style once picked.

export type EditStyle = 'exclusive' | 'always'

const STYLE_KEY = 'lsos-trial-edit-style'

function savedStyle(): EditStyle {
  try {
    return localStorage.getItem(STYLE_KEY) === 'always' ? 'always' : 'exclusive'
  } catch {
    return 'exclusive'
  }
}

export const editTrial = $state({ style: savedStyle() })

export function setEditStyle(style: EditStyle) {
  editTrial.style = style
  try {
    localStorage.setItem(STYLE_KEY, style)
  } catch {
    // Not saved; the choice lasts until reload.
  }
}

export type CardMode = 'edit' | 'settings'

export class CardModes {
  #open = $state<{ id: string; mode: CardMode } | null>(null)

  /** Whether the card shows this mode. */
  is(id: string, mode: CardMode): boolean {
    return this.#open?.id === id && this.#open.mode === mode
  }

  /** Whether the card shows its edit controls: always on in the `always` style, except while
   * its settings are open. */
  editing(id: string): boolean {
    return editTrial.style === 'always' ? !this.is(id, 'settings') : this.is(id, 'edit')
  }

  /** Opens the mode on the card, closing any other; on again closes it. */
  toggle(id: string, mode: CardMode) {
    this.#open = this.is(id, mode) ? null : { id, mode }
  }
}
