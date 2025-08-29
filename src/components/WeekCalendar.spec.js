import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import WeekCalendar from '@/components/WeekCalendar.vue'
import { nextTick } from 'vue'


function monday(d) {
  const x = new Date(d)
  const day = x.getDay() || 7
  if (day !== 1) x.setDate(x.getDate() - day + 1)
  x.setHours(0, 0, 0, 0)
  return x
}

function isoLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function makeStation(name = 'Berlin', id = '1', bookings = []) {
  return { id, name, bookings }
}

const WEEK_MON = new Date('2025-04-14T10:00:00') // Monday week start (local)

async function mountCal(station = makeStation(), viewDate = WEEK_MON) {
  const root = document.createElement('div')
  root.id = '__root__'
  document.body.appendChild(root)

  const wrapper = mount(WeekCalendar, {
    attachTo: root,
    props: { station, viewDate, overrides: {} },
  })

  const grid = wrapper.element.querySelector('.grid')
  if (grid) {
    grid.getBoundingClientRect = () => ({
      left: 0, right: 700, width: 700, top: 0, bottom: 500, height: 500,
    })
  }
  return wrapper
}

describe('WeekCalendar — emissions', () => {
  it('emits update-view-date exactly once for Next / Prev / Today', async () => {
    const wrapper = await mountCal()
    const chips = wrapper.findAll('.controls .chip')
    const left = chips[0]
    const today = chips[1]
    const right = chips[2]

    await right.trigger('click')
    let evts = wrapper.emitted('update-view-date') || []
    expect(evts.length).toBe(1)
    expect(isoLocal(monday(evts[0][0]))).toBe('2025-04-21')

    await left.trigger('click')
    evts = wrapper.emitted('update-view-date') || []
    expect(evts.length).toBe(2)
    expect(isoLocal(monday(evts[1][0]))).toBe('2025-04-14')

    await today.trigger('click')
    evts = wrapper.emitted('update-view-date') || []
    expect(evts.length).toBe(3)
    expect(isoLocal(monday(evts[2][0]))).toBe(isoLocal(monday(new Date())))

    wrapper.unmount()
  })
})

describe('WeekCalendar — pickup vs return rendering', () => {
  it('Berlin shows pickup only; Munich shows return only', async () => {
    const cross = {
      id: '999',
      customerName: 'Cross Client',
      startDate: '2025-04-16T10:00:00',
      endDate: '2025-04-17T16:00:00',
      pickupReturnStationId: '1',
      pickupStation: 'Berlin',
      returnStation: 'Munich',
    }

    const berlin = makeStation('Berlin', '1', [cross])
    const munich = makeStation('Munich', '2', [cross])

    const wBerlin = await mountCal(berlin)
    const wMunich = await mountCal(munich)

    const berlinEvents = wBerlin.findAll('.event')
    expect(berlinEvents.length).toBeGreaterThan(0)
    expect(berlinEvents.every(e => e.classes().includes('event-start'))).toBe(true)

    const munichEvents = wMunich.findAll('.event')
    expect(munichEvents.length).toBeGreaterThan(0)
    expect(munichEvents.every(e => e.classes().includes('event-end'))).toBe(true)

    wBerlin.unmount()
    wMunich.unmount()
  })
})

describe('WeekCalendar — auto advance on drag at grid edge', () => {
  it('auto-advances when dragging near right edge', async () => {
    const booking = {
      id: 'b1',
      customerName: 'Test Client',
      startDate: '2025-04-16T10:00:00',
      endDate:   '2025-04-17T16:00:00',
      pickupReturnStationId: '1',
      pickupStation: 'Berlin',
      returnStation: 'Berlin',
    }

    const wrapper = await mountCal(makeStation('Berlin', '1', [booking]))
    await nextTick()

    const ev = wrapper.find('.event')
    expect(ev.exists()).toBe(true)

    if (!('DataTransfer' in window)) {
      class DT { setData(){} getData(){ return '' } }
      // @ts-ignore
      window.DataTransfer = DT
    }

    await ev.trigger('dragstart', { dataTransfer: new window.DataTransfer() })

    const grid = wrapper.element.querySelector('.grid')
    expect(grid).toBeTruthy()

    const dragOver = new Event('dragover', { bubbles: true, cancelable: true })
    Object.defineProperty(dragOver, 'clientX', { value: 695 })
    grid.dispatchEvent(dragOver)

    await new Promise(r => setTimeout(r, 700))

    const evts = wrapper.emitted('update-view-date') || []
    expect(evts.length).toBeGreaterThan(0)
    const last = evts[evts.length - 1][0]
    expect(isoLocal(monday(last))).toBe('2025-04-21')

    wrapper.unmount()
  })
})
