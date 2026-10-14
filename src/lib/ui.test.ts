import { describe, expect, it } from 'vitest'
import { meterFraction, parseNumberField } from './ui'

describe('meterFraction', () => {
  it('divides value by max', () => {
    expect(meterFraction(25, 100)).toBe(0.25)
  })

  it('clamps to 0..1', () => {
    expect(meterFraction(-5, 100)).toBe(0)
    expect(meterFraction(150, 100)).toBe(1)
  })

  it('treats a missing or invalid max or value as empty', () => {
    expect(meterFraction(5, 0)).toBe(0)
    expect(meterFraction(5, -1)).toBe(0)
    expect(meterFraction(5, Number.NaN)).toBe(0)
    expect(meterFraction(Number.NaN, 10)).toBe(0)
  })
})

describe('parseNumberField', () => {
  it('parses plain numbers, ignoring surrounding spaces', () => {
    expect(parseNumberField(' 42 ')).toBe(42)
    expect(parseNumberField('2.5')).toBe(2.5)
  })

  it('returns null for empty or non-numeric text', () => {
    expect(parseNumberField('')).toBeNull()
    expect(parseNumberField('   ')).toBeNull()
    expect(parseNumberField('abc')).toBeNull()
    expect(parseNumberField('Infinity')).toBeNull()
  })

  it('clamps to the bounds', () => {
    expect(parseNumberField('-3', { min: 0, max: 10 })).toBe(0)
    expect(parseNumberField('11', { min: 0, max: 10 })).toBe(10)
  })

  it('rounds to whole numbers when asked, before clamping', () => {
    expect(parseNumberField('2.6', { integer: true })).toBe(3)
    expect(parseNumberField('9.7', { integer: true, max: 9 })).toBe(9)
  })
})
