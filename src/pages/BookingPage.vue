<template>
  <div class="app">
    <BookingDetails
      :station-id="stationId"
      :station-name="stationName"
      :booking-id="bookingId"
      :overrides="store.state.bookings.overrides"
      @back="goBack"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import BookingDetails from '@/components/BookingDetails.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()

const stationId = computed(() => String(route.params.stationId || ''))
const bookingId = computed(() => String(route.params.bookingId || ''))
const stationName = computed(() => String(route.query.stationName || ''))

function goBack() {
  const fallback = new Date().toISOString().slice(0, 10)
  router.push({
    name: 'calendar',
    query: {
      date: String(route.query.date || fallback),
      station: String(route.query.station || '')
    }
  })
}
</script>

<style scoped>
.app {
  min-height: 100dvh;
  max-width: 900px;
  margin: 0 auto;
  padding: 12px;
}
</style>
