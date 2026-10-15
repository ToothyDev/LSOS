// An Undo offered for a while right after a quick press, where the press was (issue #60): a
// boost started, a spin marked, an Overview action. A UI timer, not game time (decision 003
// covers tracker logic only).

export const UNDO_MS = 15_000

export class TimedUndo {
  /** The press that can be taken back now: where it was (`key`), what it did, how to undo. */
  current = $state<{ key: string; text: string; run: () => void } | null>(null)
  #timer: ReturnType<typeof setTimeout> | undefined

  offer(key: string, text: string, run: () => void) {
    this.current = { key, text, run }
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => (this.current = null), UNDO_MS)
  }

  /** The offer at this place, if any. */
  at(key: string) {
    return this.current?.key === key ? this.current : null
  }

  take() {
    this.current?.run()
    this.current = null
    clearTimeout(this.#timer)
  }
}
