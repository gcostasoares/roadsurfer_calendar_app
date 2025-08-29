import { describe, it, expect } from 'vitest'
import { startOfISOWeek, isDateOnly, parseISOFlexible, dayKey, addDays } from '@/utils/dates'

describe('dates utils', () => {
  it('startOfISOWeek returns Monday', () => {
    const fri = new Date('2025-08-29T12:00:00+02:00')
    const mon = startOfISOWeek(fri)
    expect(mon.getDay()).toBe(1)
  })

  it('isDateOnly and parseISOFlexible', () => {
    expect(isDateOnly('2025-08-07')).toBe(true)
    const d = parseISOFlexible('2025-08-07')
    expect(d instanceof Date).toBe(true)
    expect(d.getFullYear()).toBe(2025)
  })

  it('dayKey stable', () => {
    const d = new Date('2025-04-16T02:28:00Z')
    expect(dayKey(d)).toBe('2025-04-16')
  })

  it('addDays works', () => {
    const d = new Date('2025-04-16T00:00:00Z')
    expect(addDays(d, 6).getDate()).toBe(22)
  })
})