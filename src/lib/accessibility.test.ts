import { describe, expect, it } from 'vitest'
import { reducesMotion } from './accessibility'

describe('reducesMotion', () => {
  it('follows the device on system', () => {
    expect(reducesMotion('system', true)).toBe(true)
    expect(reducesMotion('system', false)).toBe(false)
  })

  it('overrides the device on reduce and full', () => {
    expect(reducesMotion('reduce', false)).toBe(true)
    expect(reducesMotion('full', true)).toBe(false)
  })
})
