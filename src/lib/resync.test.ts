import { describe, expect, it } from 'vitest'
import {
  applyEvent,
  buySupplies,
  clampValue,
  formatValue,
  parseValue,
  recordEdit,
  settleBars,
  undoBars,
  undoValue,
} from './resync'

const MIN = 60_000

describe('formatValue', () => {
  it('shows percent, money and h:mm', () => {
    expect(formatValue(39.6, 'percent')).toBe('40%')
    expect(formatValue(1_234_567, 'money')).toBe('$1,234,567')
    expect(formatValue(65 * MIN, 'duration')).toBe('1:05')
  })

  it('rounds time left up to the minute, so 0:00 means done', () => {
    expect(formatValue(1, 'duration')).toBe('0:01')
    expect(formatValue(59 * MIN + 1, 'duration')).toBe('1:00')
    expect(formatValue(0, 'duration')).toBe('0:00')
    expect(formatValue(-5 * MIN, 'duration')).toBe('0:00')
  })
})

describe('parseValue', () => {
  it('reads percent with or without the sign', () => {
    expect(parseValue('40', 'percent')).toBe(40)
    expect(parseValue(' 12.5 % ', 'percent')).toBe(12.5)
  })

  it('reads money as the game or a person writes it', () => {
    expect(parseValue('120000', 'money')).toBe(120_000)
    expect(parseValue('$120,000', 'money')).toBe(120_000)
    expect(parseValue('120k', 'money')).toBe(120_000)
    expect(parseValue('1.2M', 'money')).toBe(1_200_000)
  })

  it('reads h:mm or plain minutes as milliseconds', () => {
    expect(parseValue('1:05', 'duration')).toBe(65 * MIN)
    expect(parseValue('0:7', 'duration')).toBe(7 * MIN)
    expect(parseValue('45', 'duration')).toBe(45 * MIN)
    expect(parseValue('0', 'duration')).toBe(0)
  })

  it('rejects empty, negative or malformed input', () => {
    for (const unit of ['percent', 'money', 'duration'] as const) {
      expect(parseValue('', unit)).toBeNull()
      expect(parseValue('-5', unit)).toBeNull()
      expect(parseValue('abc', unit)).toBeNull()
    }
    expect(parseValue('1e3', 'percent')).toBeNull()
    expect(parseValue('$', 'money')).toBeNull()
    expect(parseValue('1:60', 'duration')).toBeNull()
    expect(parseValue('1:2:3', 'duration')).toBeNull()
  })
})

describe('clampValue', () => {
  it('keeps the value inside the bounds', () => {
    expect(clampValue(120, { min: 0, max: 100 })).toBe(100)
    expect(clampValue(-1, { min: 0 })).toBe(0)
    expect(clampValue(5)).toBe(5)
  })
})

describe('undoValue', () => {
  it('restores the old value right after the edit', () => {
    expect(undoValue({ before: 40, after: 4 }, 4)).toBe(40)
  })

  it('keeps what the tracker counted since the edit', () => {
    // Cooldown estimated at 2:00, mistyped as 1:30; 10 minutes later it shows 1:20.
    const edit = { before: 120 * MIN, after: 90 * MIN }
    expect(undoValue(edit, 80 * MIN)).toBe(110 * MIN)
  })

  it('clamps to the bounds', () => {
    expect(undoValue({ before: 90, after: 10 }, 30, { max: 100 })).toBe(100)
    expect(undoValue({ before: 0, after: 50 }, 20, { min: 0 })).toBe(0)
  })
})

describe('applyEvent', () => {
  const sold = { empties: ['stock'] as const, cancelsDelivery: false }
  const raided = { empties: ['stock', 'supplies'] as const, cancelsDelivery: true }

  it('empties the listed bars and keeps the rest', () => {
    expect(applyEvent({ stock: 80, supplies: 40 }, sold)).toEqual({ stock: 0, supplies: 40 })
    expect(applyEvent({ stock: 80, supplies: 40 }, raided)).toEqual({
      stock: 0,
      supplies: 0,
    })
  })

  it('does not add a supplies bar to a business without one', () => {
    expect(applyEvent({ stock: 80 }, raided)).toEqual({ stock: 0 })
  })

  it('drops a pending delivery only if the event cancels it', () => {
    const pending = { stock: 80, supplies: 40, suppliesDueAt: 5 }
    expect(applyEvent(pending, sold)).toEqual({ stock: 0, supplies: 40, suppliesDueAt: 5 })
    expect(applyEvent(pending, raided)).toEqual({ stock: 0, supplies: 0 })
  })
})

describe('undoBars', () => {
  it('takes back a raid and keeps what changed since', () => {
    const edit = { before: { stock: 80, supplies: 40 }, after: { stock: 0, supplies: 0 } }
    expect(undoBars(edit, { stock: 0, supplies: 0 })).toEqual({ stock: 80, supplies: 40 })
    expect(undoBars(edit, { stock: 5, supplies: 20 })).toEqual({ stock: 85, supplies: 60 })
  })

  it('clamps each bar to 0..100 and leaves untouched bars alone', () => {
    const edit = { before: { stock: 90, supplies: 50 }, after: { stock: 10, supplies: 50 } }
    expect(undoBars(edit, { stock: 30, supplies: 45 })).toEqual({ stock: 100, supplies: 45 })
  })
})

describe('buying supplies', () => {
  const T = 1_000_000
  const DELIVERY = 10 * MIN

  it('schedules a delivery and changes nothing until it arrives', () => {
    const bought = buySupplies({ stock: 20, supplies: 5 }, T, DELIVERY)
    expect(bought).toEqual({ stock: 20, supplies: 5, suppliesDueAt: T + DELIVERY })
    expect(settleBars(bought, T + DELIVERY - 1, 100)).toBe(bought)
  })

  it('fills supplies once the delivery is due', () => {
    const bought = buySupplies({ stock: 20, supplies: 5 }, T, DELIVERY)
    expect(settleBars(bought, T + DELIVERY, 100)).toEqual({ stock: 20, supplies: 100 })
  })

  it('does nothing for a business without supplies', () => {
    expect(buySupplies({ stock: 20 }, T, DELIVERY)).toEqual({ stock: 20 })
  })

  it('undo cancels a pending delivery and restores one an edit replaced', () => {
    const before = { stock: 20, supplies: 5 }
    const after = buySupplies(before, T, DELIVERY)
    expect(undoBars({ before, after }, after)).toEqual(before)

    const pending = { stock: 20, supplies: 5, suppliesDueAt: T }
    const raided = { stock: 0, supplies: 0 }
    expect(undoBars({ before: pending, after: raided }, raided)).toEqual(pending)
  })
})

describe('recordEdit', () => {
  it('extends the last edit for a change in the same group', () => {
    const first = recordEdit(null, { stock: 40 }, { stock: 45 }, 'stock was 40%', 'stock')
    const second = recordEdit(first, { stock: 45 }, { stock: 46 }, 'stock was 45%', 'stock')
    expect(second).toEqual({
      before: { stock: 40 },
      after: { stock: 46 },
      label: 'stock was 40%',
      group: 'stock',
    })
    expect(undoBars(second, { stock: 50 })).toEqual({ stock: 44 })
  })

  it('starts a new edit for another group or an ungrouped change', () => {
    const drag = recordEdit(
      null,
      { stock: 40, supplies: 10 },
      { stock: 45, supplies: 10 },
      'a',
      'stock',
    )
    const other = recordEdit(drag, drag.after, { stock: 45, supplies: 20 }, 'b', 'supplies')
    expect(other.before).toEqual({ stock: 45, supplies: 10 })
    const typed = recordEdit(other, other.after, { stock: 0, supplies: 20 }, 'c')
    expect(typed.before).toEqual({ stock: 45, supplies: 20 })
    expect(recordEdit(typed, typed.after, { stock: 1, supplies: 20 }, 'd').before).toEqual({
      stock: 0,
      supplies: 20,
    })
  })
})
