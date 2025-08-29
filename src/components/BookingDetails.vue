<template>
  <div class="wrap">
    <button class="chip" @click="$emit('back')">← Back to calendar</button>

    <div class="card">
      <div class="card-head">
        <div class="title">Booking Details</div>
        <div class="sub">Station: {{ stationName || ('Station ' + stationId) }}</div>
      </div>

      <div v-if="booking" class="grid">
        <div class="kv">
          <div class="k">Customer</div>
          <div class="v strong">{{ booking.customerName }}</div>
        </div>
        <div class="kv">
          <div class="k">Duration</div>
          <div class="v">{{ duration }}</div>
        </div>

        <div class="kv">
            <div class="k">Pickup station</div>
            <div class="v">{{ pickupStationLabel }}</div>
        </div>
        <div class="kv">
            <div class="k">Return station</div>
            <div class="v">{{ returnStationLabel }}</div>
        </div>


        <div class="kv">
          <div class="k">Pickup date</div>
          <div class="v">{{ fmtDate(merged.startDate) }}</div>
        </div>
    

        <div class="kv">
          <div class="k">Return date</div>
          <div class="v">{{ fmtDate(merged.endDate) }}</div>
        </div>
         <div class="kv">
          <div class="k">Pickup time</div>
          <div class="v">{{ fmtTime(raw.startDate) }}</div>
        </div>
        <div class="kv">
          <div class="k">Return time</div>
          <div class="v">{{ fmtTime(raw.endDate) }}</div>
        </div>

      </div>

      <div v-else class="empty">Booking not found</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  stationId:   { type: String, required: true },
  stationName: { type: String, default: '' },
  bookingId:   { type: String, required: true },
  overrides:   { type: Object, default: () => ({}) }
})

const BASE = 'https://605c94c36d85de00170da8b4.mockapi.io'

const booking = ref(null)
const raw = ref({ startDate: null, endDate: null })

const pickupStationLabel = computed(()=> booking.value?.pickupStation || props.stationName || ('Station ' + props.stationId))
const returnStationLabel = computed(()=> booking.value?.returnStation || props.stationName || ('Station ' + props.stationId))


function isDateString(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

function parseISO(v) {
  if (!v) return null
  if (isDateString(v)) {
    const [y,m,d] = v.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const d = new Date(v)
  return isNaN(d) ? null : d
}

onMounted(async () => {
  try {
    const r = await fetch(`${BASE}/stations/${props.stationId}/bookings/${props.bookingId}`, { cache: 'no-store' })
    if (r.ok) {
      const obj = await r.json()
      booking.value = obj
      raw.value = { startDate: obj.startDate || null, endDate: obj.endDate || null }
      return
    }
  } catch {}

  try {
    const r = await fetch(`${BASE}/stations/${props.stationId}`, { cache: 'no-store' })
    if (r.ok) {
      const s = await r.json()
      const b = Array.isArray(s.bookings) ? s.bookings.find(x => String(x.id) === props.bookingId) : null
      if (b) {
        booking.value = b
        raw.value = { startDate: b.startDate || null, endDate: b.endDate || null }
      }
    }
  } catch {}
})

const merged = computed(() => {
  const sid = String(props.stationId)
  const bid = String(props.bookingId)
  const o = (props.overrides?.[sid] || {})[bid] || {}
  return {
    startDate: o.startDate || booking.value?.startDate || null,
    endDate:   o.endDate   || booking.value?.endDate   || null
  }
})

const duration = computed(() => {
  const s = merged.value.startDate ? parseISO(merged.value.startDate) : null
  const e = merged.value.endDate ? parseISO(merged.value.endDate) : null
  if (!s || !e) return 'Unknown'
  const days = Math.max(1, Math.round((e - s) / 86400000))
  return days + ' day' + (days > 1 ? 's' : '')
})

function fmtDate(v) {
  if (!v) return 'Unknown'
  const d = parseISO(v)
  if (!d) return 'Unknown'
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  }).format(d)
}

function fmtTime(orig) {
  if (!orig) return 'Not provided'
  if (isDateString(orig)) return 'Not provided'
  const d = new Date(orig)
  if (isNaN(d)) return 'Not provided'
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(d)
}
</script>

<style scoped>
.wrap{ max-width:900px; margin:0 auto; padding:8px }

.chip{
  appearance:none; background:var(--chip);
  border:1px solid var(--border); padding:6px 10px;
  border-radius:12px; margin-bottom:10px
}

.card{
  background:#fff; border:1px solid var(--border);
  border-radius:16px; box-shadow:0 8px 24px rgba(0,0,0,.05);
  overflow:hidden
}

.card-head{
  padding:16px 16px 8px;
  border-bottom:1px solid var(--border)
}

.title{ font-size:22px; font-weight:800 }
.sub{ color:var(--muted); margin-top:2px }

.grid{
  display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
  gap:12px 16px; padding:16px
}

.kv{
  display:grid; grid-template-columns:140px 1fr;
  gap:10px; align-items:center
}

.k{ 
    color:var(--muted) 
}

.v{ 
    font-weight:600 
}
.v.strong{ 
    font-weight:800 
}

.empty{ 
    padding:18px; 
    color:var(--muted) 
}

@media (max-width:680px){
  .grid{ 
    grid-template-columns:1fr 
}
  .kv{ 
    grid-template-columns:130px 1fr 
}
}
</style>
