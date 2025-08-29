import { describe, it, expect, vi, beforeEach } from 'vitest'
import bookings from './bookings'

describe('bookings/reschedule action', () => {
  let commit, spy
  beforeEach(() => {
    commit = vi.fn()
    spy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('commits override and logs PATCH', () => {
    const ctx = { commit }
    const payload = {
      stationId: '1',
      bookingId: '51',
      startDate: '2025-04-16T10:00:00.000Z',
      endDate: '2025-04-18T10:00:00.000Z'
    }

    bookings.actions.reschedule(ctx, payload)

    expect(commit).toHaveBeenCalledWith('applyOverride', payload)
    expect(spy).toHaveBeenCalledTimes(1)
    const [msg, body] = spy.mock.calls[0]
    expect(msg).toContain('PATCH /stations/1/bookings/51')
    expect(body).toEqual({ startDate: payload.startDate, endDate: payload.endDate })
  })
})