<template>
  <div class="app">
    <section class="panel">
      <Autocomplete
        v-model="stationLocal"
        :fetch-url="STATIONS_URL"
        placeholder="Search station"
      />
      <div v-if="selectedStation" class="picked">
        Station: <strong>{{ selectedStation.name }}</strong>
      </div>
    </section>

    <WeekCalendar
      :station="selectedStation"
      :view-date="viewDate"
      :overrides="overridesForSelected"
      @update-view-date="onUpdateDate"
      @open-booking="openBooking"
      @reschedule="onReschedule"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import Autocomplete from '@/components/AutoComplete.vue'
import WeekCalendar from '@/components/WeekCalendar.vue'
import stationsModule from '@/store/modules/stations'
import bookingsModule from '@/store/modules/bookings'
import calendarModule from '@/store/modules/calendar'

const store = useStore()

if (!store.hasModule('stations')) store.registerModule('stations', stationsModule)
if (!store.hasModule('bookings')) store.registerModule('bookings', bookingsModule)
if (!store.hasModule('calendar')) store.registerModule('calendar', calendarModule)



const STATIONS_URL = 'https://605c94c36d85de00170da8b4.mockapi.io/stations'


const route = useRoute()
const router = useRouter()


const viewDate = computed(() => {
  const iso = store.getters['calendar/isoDate']
  return iso ? new Date(iso) : new Date()
})

const selectedStation = computed(() => store.getters['stations/selected'])

const overridesForSelected = computed(() => {
  const id = selectedStation.value?.id || ''
  const map = store.state.bookings.overrides[String(id)] || {}
  return { [String(id)]: map }
})

const stationLocal = ref(null)

watch(stationLocal, async s => {
  if (s?.id) {
    await store.dispatch('stations/select', s.id)
    pushQuery()
  }
})

function pushQuery() {
  router.replace({
    name: 'calendar',
    query: {
      date: store.getters['calendar/isoDate'],
      station: selectedStation.value?.id ? String(selectedStation.value.id) : undefined
    }
  })
}

function onUpdateDate(d){
  const nextIso = new Date(d).toISOString().slice(0,10)
  const curIso  = store.getters['calendar/isoDate']
  if (nextIso !== curIso) {
    store.commit('calendar/setDate', d)
    if (selectedStation.value) enrich()
  }
  pushQuery()
}

function openBooking(p) {
  router.push({
    name: 'booking',
    params: {
      stationId: String(p.stationId || selectedStation.value?.id || ''),
      bookingId: String(p.bookingId)
    },
    query: {
      date: store.getters['calendar/isoDate'],
      station: selectedStation.value?.id ? String(selectedStation.value.id) : '',
      stationName: selectedStation.value?.name || ''
    }
  })
}

function onReschedule(patch) {
  store.dispatch('bookings/reschedule', patch)
}

async function enrich() {
  const sid = selectedStation.value?.id
  if (!sid) return
  await store.dispatch('bookings/loadForStation', selectedStation.value)
  await store.dispatch('bookings/enrichTimesForRange', {
    stationId: sid,
    weekStart: store.getters['calendar/weekStart']
  })
}

onMounted(async () => {
  const qd = route.query.date
  if (qd) store.commit('calendar/setDate', new Date(qd))
  if (route.query.station) await store.dispatch('stations/select', String(route.query.station))
  if (selectedStation.value) enrich()
})

watch([() => store.getters['calendar/weekStart'], selectedStation], () => {
  if (selectedStation.value) enrich()
})
</script>

<style scoped>
.app {
  min-height: 100dvh;
  max-width: 980px;
  margin: 0 auto;
  padding: 12px 12px 24px;
}
.panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 8px 0 12px;
  height: 100px !important;
}
.picked {
  font-size: 12px;
  color: var(--muted);
}
</style>
