import { load, save } from '@/utils/persist'
import {
  parseISOFlexible,
  dayKey,
  startOfISOWeek,
  addDays,
  isDateOnly
} from '@/utils/dates'

const API = 'https://605c94c36d85de00170da8b4.mockapi.io'

const state = () => ({
  byStationId: {},
  overrides: load('overrides', {})
})

const getters = {
  listByStation: state => id => state.byStationId[String(id)] || [],

  mergedByStation: state => id => {
    const sid = String(id)
    const ov = state.overrides[sid] || {}
    const base = state.byStationId[sid] || []
    return base.map(b => (ov[b.id] ? { ...b, ...ov[b.id] } : b))
  },

  bookingById: (state, getters) => (sid, bid) => {
    const list = getters.mergedByStation(sid)
    return list.find(b => String(b.id) === String(bid)) || null
  },

  weekEvents: (state, getters) => (sid, days) => {
    const keys = new Set(days.map(dayKey))
    const out = []
    for (const b of getters.mergedByStation(sid)) {
      const sdt = b.startDate ? parseISOFlexible(b.startDate) : null
      const edt = b.endDate ? parseISOFlexible(b.endDate) : null
      if (sdt && keys.has(dayKey(sdt))) {
        out.push({ id: String(b.id), when: 'start', at: sdt, name: String(b.customerName || 'Customer') })
      }
      if (edt && keys.has(dayKey(edt))) {
        out.push({ id: String(b.id), when: 'end', at: edt, name: String(b.customerName || 'Customer') })
      }
    }
    return out
  }
}

const mutations = {
  setStationBookings(state, { stationId, list }) {
    state.byStationId[String(stationId)] = list || []
  },

  applyOverride(state, patch) {
    const sid = String(patch.stationId)
    const bid = String(patch.bookingId)
    if (!state.overrides[sid]) state.overrides[sid] = {}
    state.overrides[sid][bid] = { ...(state.overrides[sid][bid] || {}), ...patch }
    save('overrides', state.overrides)
  }
}

const actions = {
  async loadForStation({ commit }, station) {
    if (!station?.id) return
    const sid = String(station.id)
    const list =
      Array.isArray(station.bookings) && station.bookings.length
        ? station.bookings
        : ((await (await fetch(`${API}/stations/${sid}`)).json()).bookings || [])
    commit('setStationBookings', { stationId: sid, list })
  },

  async enrichTimesForRange({ state, commit }, { stationId, weekStart }) {
    const sid = String(stationId)
    const list = state.byStationId[sid] || []
    const start = new Date(weekStart)
    const end = addDays(start, 6)

    let changed = false

    for (const b of list) {
      let need = false
      const sdt = b.startDate ? parseISOFlexible(b.startDate) : null
      const edt = b.endDate ? parseISOFlexible(b.endDate) : null

      if ((sdt && sdt >= start && sdt <= end && isDateOnly(b.startDate)) ||
          (edt && edt >= start && edt <= end && isDateOnly(b.endDate))) {
        need = true
      }
      if (!need) continue

      try {
        const r = await fetch(`${API}/stations/${sid}/bookings/${b.id}`)
        if (r.ok) {
          const det = await r.json()
          if (det.startDate && !isDateOnly(det.startDate)) { b.startDate = det.startDate; changed = true }
          if (det.endDate && !isDateOnly(det.endDate)) { b.endDate = det.endDate; changed = true }
        }
      } catch {}

      if (isDateOnly(b.startDate)) {
        const [y, m, d] = b.startDate.split('-').map(Number)
        b.startDate = new Date(y, m - 1, d, 10, 0).toISOString()
        changed = true
      }

      if (isDateOnly(b.endDate)) {
        const [y, m, d] = b.endDate.split('-').map(Number)
        b.endDate = new Date(y, m - 1, d, 16, 0).toISOString()
        changed = true
      }
    }

    if (changed) {
      commit('setStationBookings', { stationId: sid, list: [...list] })
    }
  },

  reschedule({ commit }, { stationId, bookingId, startDate, endDate }) {
    commit('applyOverride', { stationId, bookingId, startDate, endDate })
    console.log('PATCH /stations/' + stationId + '/bookings/' + bookingId, { startDate, endDate })
  }
}

export default { namespaced: true, state, getters, mutations, actions }
