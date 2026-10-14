import { describe, expect, it } from 'vitest'
import { dragValue, keyValue, meterFraction, parseNumberField } from './ui'

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

describe('dragValue', () => {
  const bar = { max: 100, segments: 5 }

  it('rounds to whole percent', () => {
    expect(dragValue(0.374, { max: 100 })).toBe(37)
    expect(dragValue(0.376, { max: 100 })).toBe(38)
  })

  it('snaps to a segment edge from up to 1.5% away', () => {
    expect(dragValue(0.186, bar)).toBe(20)
    expect(dragValue(0.214, bar)).toBe(20)
    expect(dragValue(0.986, bar)).toBe(100)
    expect(dragValue(0.012, bar)).toBe(0)
  })

  it('does not snap further away or without segments', () => {
    expect(dragValue(0.183, bar)).toBe(18)
    expect(dragValue(0.217, bar)).toBe(22)
    expect(dragValue(0.19, { max: 100 })).toBe(19)
  })

  it('clamps a pointer outside the track', () => {
    expect(dragValue(-0.3, bar)).toBe(0)
    expect(dragValue(1.4, bar)).toBe(100)
  })
})

describe('keyValue', () => {
  const bar = { max: 100, segments: 5 }

  it('steps by 1% to the next whole percent', () => {
    expect(keyValue(37, 'ArrowRight', bar)).toBe(38)
    expect(keyValue(37, 'ArrowUp', bar)).toBe(38)
    expect(keyValue(37.4, 'ArrowRight', bar)).toBe(38)
    expect(keyValue(37.4, 'ArrowLeft', bar)).toBe(37)
    expect(keyValue(37, 'ArrowDown', bar)).toBe(36)
  })

  it('jumps to the next segment edge with Page Up/Down', () => {
    expect(keyValue(37, 'PageUp', bar)).toBe(40)
    expect(keyValue(40, 'PageUp', bar)).toBe(60)
    expect(keyValue(37, 'PageDown', bar)).toBe(20)
    expect(keyValue(40, 'PageDown', bar)).toBe(20)
    expect(keyValue(37, 'PageUp', { max: 100 })).toBe(40)
    expect(keyValue(37, 'PageDown', { max: 100 })).toBe(30)
  })

  it('goes to the ends with Home/End and stays in range', () => {
    expect(keyValue(37, 'Home', bar)).toBe(0)
    expect(keyValue(37, 'End', bar)).toBe(100)
    expect(keyValue(100, 'ArrowRight', bar)).toBe(100)
    expect(keyValue(0, 'PageDown', bar)).toBe(0)
  })

  it('ignores other keys', () => {
    expect(keyValue(37, 'Enter', bar)).toBeNull()
  })
})
