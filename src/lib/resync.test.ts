import { describe, expect, it } from 'vitest'
import { clampValue, formatValue, parseValue, undoValue } from './resync'

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
