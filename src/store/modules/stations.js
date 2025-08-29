const API = 'https://605c94c36d85de00170da8b4.mockapi.io'

const state = () => ({
  selected: null,
  byId: {}
})

const getters = {
  selected: s => s.selected
}

const mutations = {
  setSelected(s, station) {
    s.selected = station || null
    if (station && station.id) s.byId[String(station.id)] = station
  },
  setStation(s, station) {
    if (station && station.id) s.byId[String(station.id)] = station
  }
}

const actions = {
  async select({ state, commit }, idOrObj) {
    if (idOrObj && typeof idOrObj === 'object') {
      commit('setSelected', idOrObj)
      return
    }
    const sid = String(idOrObj)
    let station = state.byId[sid]
    if (!station) {
      try {
        const r = await fetch(`${API}/stations/${sid}`, { cache: 'no-store' })
        if (r.ok) station = await r.json()
      } catch {}
    }
    commit('setSelected', station || { id: sid, name: `Station ${sid}`, bookings: [] })
  }
}

export default { namespaced: true, state, getters, mutations, actions }
