<template>
  <div class="wrap" tabindex="0" @keydown="onKeydown" ref="wrapEl">
    <header class="topbar">
      <div class="title">
        <button class="month-btn" @click="toggleMonthPicker" ref="monthBtnEl">{{ monthName }}</button>
        <button class="year-btn" @click="toggleYearPicker" ref="yearBtnEl">{{ year }}</button>



        <div v-if="showMonthPicker" class="month-popover" @click.stop ref="monthPopEl">
          <div class="month-grid">
            <button
              v-for="m in months"
              :key="m.i"
              class="month-cell"
              :class="{ chosen: m.i === monthIndex }"
              @click="pickMonth(m.i)"
            >
              {{ m.label }}
            </button>
          </div>
        </div>




        <div v-if="showYearPicker" class="year-popover" @click.stop ref="yearPopEl">
          <div class="year-toolbar">
            <button class="chev" @click="prevYearPage">‹</button>
            <div class="year-range">{{ yearPageStart }}–{{ yearPageStart + 15 }}</div>
            <button class="chev" @click="nextYearPage">›</button>
          </div>
          <div class="year-grid">
            <button
              v-for="y in yearGrid"
              :key="y"
              class="year-cell"
              :class="{ chosen: y === year }"
              @click="pickYear(y)"
            >
              {{ y }}
            </button>
          </div>
        </div>
      </div>

      <div class="controls">
        <div class="legend">
          <span class="sq sq-start"></span>
          <span>Pickup</span>
          <span class="sq sq-end"></span>
          <span>Return</span>
        </div>
        <button class="chip" @click="prevWeek">‹</button>
        <button class="chip" @click="goToday">Today</button>
        <button class="chip" @click="nextWeek">›</button>
      </div>
    </header>



    <div class="head-row">
      <div class="phantom"></div>
      <div class="week-header">
        <div
          v-for="(d,i) in days"
          :key="'h' + d.toDateString()"
          :class="['head-day', { weekend: i >= 5 }]"
        >
          <span class="dow">{{ dowShort(d) }}.</span>
          <span class="space"></span>
          <span class="num" :class="{ ring: isSameDate(d, today) }">{{ d.getDate() }}</span>
        </div>
      </div>
    </div>

    <div class="time-wrap" :style="{ '--rows': hours.length }" ref="timeWrapEl">
      <div class="gutter">
        <div v-for="h in hours" :key="'g' + h" class="g-hour">{{ labelHour(h) }}</div>
      </div>

      <div class="grid">
        <div v-if="showNowLine" class="now-line" :style="{ top: nowY + 'px' }"></div>

        <div class="rows">
          <div v-for="h in hours" :key="'r' + h" class="r-hour"></div>
        </div>

        <div
          v-for="(d,i) in days"
          :key="'c' + d.toDateString()"
          :class="['col', { weekend: i >= 5 }]"
        >
          <div class="events">
            <button
              v-for="ev in eventsForDay(d)"
              :key="ev.id + ev.type"
              class="event"
              :class="ev.type === 'start' ? 'event-start' : 'event-end'"
              :style="styleForEvent(ev)"
              draggable="true"
              @dragstart="onDragStart($event, ev)"
              @dragend="onDragEnd"
              @click="$emit('open-booking', { stationId: String(station?.id || ''), bookingId: String(ev.id), viewDate: currentDate.toISOString() })"
              :title="ev.customerName"
            >
              <span class="event-name">{{ ev.customerName }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="divider"></div>
  </div>
</template>


<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  station: { type: Object, default: null },
  viewDate: { type: [Date, String], required: true },
  overrides: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update-view-date', 'open-booking', 'reschedule'])

const API = 'https://605c94c36d85de00170da8b4.mockapi.io'

function normalize(d){
  const n = new Date(d)
  n.setHours(0,0,0,0)
  return n
}

function isSameDate(a,b){
  return a.getFullYear()===b.getFullYear()
    && a.getMonth()===b.getMonth()
    && a.getDate()===b.getDate()
}


function startOfISOWeek(date){
  const d = new Date(date)
  const day = d.getDay() || 7
  if(day!==1) d.setDate(d.getDate()-day+1)
  d.setHours(0,0,0,0)
  return d
}



function dayKey(d){
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const dd = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${dd}`
}


function isDateOnly(v){
  return typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

function parseISOFlexible(v){
  if(isDateOnly(v)){
    const [y,m,d]=v.split('-').map(Number)
    return new Date(y,m-1,d)
  }
  const x=new Date(v)
  return isNaN(x)?null:x
}


function addDays(d,n){
  const x = new Date(d)
  x.setDate(x.getDate()+n)
  return x
}

const today = normalize(new Date())

const currentDate = ref(new Date(props.viewDate))
watch(() => props.viewDate, v => { currentDate.value = new Date(v) })

const rawBookings = ref([])
const detailCache = ref(new Map())





async function fetchStationDetail(id){
  try{
    const r = await fetch(`${API}/stations/${id}`, {
       cache:'no-store' 
      })
    if(!r.ok) return null
    const obj = await r.json()
    return Array.isArray(obj.bookings) ? obj.bookings : null
  }catch{
    return null
  }
}
async function fetchBookingDetail(stationId, bookingId){
  const key = `${stationId}:${bookingId}`
  if(detailCache.value.has(key)) return detailCache.value.get(key)
  try{
    const r = await fetch(`${API}/stations/${stationId}/bookings/${bookingId}`, { cache:'no-store' })
    if(!r.ok) return null
    const obj = await r.json()
    detailCache.value.set(key, obj)
    return obj
  }catch{
    return null
  }
}

watch(
  () => props.station,
  async s => {
    rawBookings.value = []
    if(!s?.id) return
    if(Array.isArray(s.bookings)) rawBookings.value = s.bookings
    else rawBookings.value = (await fetchStationDetail(s.id)) || []
    await enrichVisibleWeekTimes()
  },
  { immediate:true }
)

const year = computed(()=>currentDate.value.getFullYear())
const monthIndex = computed(()=>currentDate.value.getMonth())


const monthName = computed(()=>new Intl.DateTimeFormat('en-US',{month:'long'}).format(currentDate.value))

const weekStart = computed(()=>startOfISOWeek(currentDate.value))
const days = computed(()=>Array.from({length:7},(_,i)=>{ const d=new Date(weekStart.value); d.setDate(d.getDate()+i); return d }))

const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
function dowShort(d){ return weekdayFmt.format(d) }

function setDateAndEmit(d){
  const nd = new Date(d)
  currentDate.value = nd
  emit('update-view-date', nd)
}
function prevWeek(){ 
  const d=new Date(weekStart.value); d.setDate(d.getDate()-7); setDateAndEmit(d) 
}

function nextWeek(){ 
  const d=new Date(weekStart.value); d.setDate(d.getDate()+7); setDateAndEmit(d) 
}


function goToday(){ 
  setDateAndEmit(new Date(today)) 
}


function onKeydown(e){
  if(e.key==='ArrowLeft') prevWeek()
  else if(e.key==='ArrowRight') nextWeek()
  else if((e.key||'').toLowerCase()==='t') goToday()
}

const showYearPicker = ref(false)
const yearPageStart = ref(0)

const yearGrid = computed(()=>Array.from({length:16},(_,i)=>yearPageStart.value+i))
function toggleYearPicker(){
  if(!showYearPicker.value) yearPageStart.value = Math.floor(year.value/16)*16
  showYearPicker.value = !showYearPicker.value
  showMonthPicker.value = false
}



function pickYear(y){
  const d=new Date(currentDate.value)
  d.setFullYear(y)
  setDateAndEmit(d)
  showYearPicker.value=false
}

function prevYearPage(){ 
  yearPageStart.value -= 16 
}
function nextYearPage(){ 
  yearPageStart.value += 16 
}

const showMonthPicker = ref(false)
const months = Array.from({length:12},(_,i)=>({
   i, label:new Intl.DateTimeFormat('en-US',{month:'short'}).format(new Date(2000,i,1)) 
  }))
function toggleMonthPicker(){ 
  showMonthPicker.value = !showMonthPicker.value; showYearPicker.value = false 
}


function pickMonth(i){
  const d=new Date(currentDate.value)
  d.setMonth(i,1)
  setDateAndEmit(d)
  showMonthPicker.value=false
}

function mergedBookings(){
  const sid = String(props.station?.id || '')
  const ov = props.overrides?.[sid] || {}
  return rawBookings.value.map(b => ov[b.id] ? { ...b, ...ov[b.id] } : b)
}

const weekDayKeys = computed(()=>new Set(days.value.map(dayKey)))

async function enrichVisibleWeekTimes(){
  if(!props.station?.id) return
  const sid = String(props.station.id)
  const need = []

  for(const b of mergedBookings()){
    const hasStart = b.startDate && !isDateOnly(b.startDate)
    const hasEnd   = b.endDate   && !isDateOnly(b.endDate)
    if(hasStart && hasEnd) continue



    const s = b.startDate ? parseISOFlexible(b.startDate) : null
    const e = b.endDate ? parseISOFlexible(b.endDate) : null
    if((s && weekDayKeys.value.has(dayKey(s))) || (e && weekDayKeys.value.has(dayKey(e)))) need.push(b)
  }

  if(!need.length) return

  let changed = false

  for(const b of need){
    const det = await fetchBookingDetail(sid, b.id)
    if(det){
      if(det.startDate && !isDateOnly(det.startDate)){ 
        b.startDate = det.startDate; changed = true 
      }
      if(det.endDate   && !isDateOnly(det.endDate)){   
        b.endDate   = det.endDate;   changed = true 
      }
    }
    if(isDateOnly(b.startDate)){
      const [y,m,d] = b.startDate.split('-').map(Number)
      b.startDate = new Date(y,m-1,d,10,0).toISOString()
      changed = true
    }
    if(isDateOnly(b.endDate)){
      const [y,m,d] = b.endDate.split('-').map(Number)
      b.endDate = new Date(y,m-1,d,16,0).toISOString()
      changed = true
    }
  }

  if(changed) rawBookings.value = [...rawBookings.value]
}

watch(weekStart, async ()=>{ await enrichVisibleWeekTimes() })

function n(s){ return String(s||'').toLowerCase() }
function stationNameLC(){ 
  return n(props.station?.name) 
}


function stationIdStr(){ 
  return String(props.station?.id || '') 
}

function matchesPickup(b){ 
  return b.pickupStation ? n(b.pickupStation).includes(stationNameLC()) : String(b.pickupReturnStationId || '') === stationIdStr() 
}

function matchesReturn(b){ 
  return b.returnStation ? n(b.returnStation).includes(stationNameLC()) : String(b.pickupReturnStationId || '') === stationIdStr() 
}





function weekEvents(){
  const arr=[]
  for(const b of mergedBookings()){
    const s = b.startDate ? parseISOFlexible(b.startDate) : null
    const e = b.endDate ? parseISOFlexible(b.endDate) : null
    if(s && weekDayKeys.value.has(dayKey(s)) && matchesPickup(b)) arr.push({ 
      when:'start', id:String(b.id), name:String(b.customerName||'Customer'), at:s 
    })
    if(e && weekDayKeys.value.has(dayKey(e)) && matchesReturn(b)) arr.push({ 
      when:'end',   id:String(b.id), name:String(b.customerName||'Customer'), at:e 
    })
  }
  return arr
}


function toMinutes(d){ return d.getHours()*60 + d.getMinutes() }

const weekTimes = computed(()=>{
  const out=[]
  const now=new Date()
  for(const x of weekEvents()) out.push(x.at)
  out.push(now)
  return out
})

const hourStart = computed(()=>{
  if(!weekTimes.value.length) return 8
  const min = Math.min(...weekTimes.value.map(toMinutes))
  return Math.max(0, Math.floor(min/60)-1)
})

const hourEnd = computed(()=>{
  if(!weekTimes.value.length) return 20
  const max = Math.max(...weekTimes.value.map(toMinutes))
  return Math.min(24, Math.max(hourStart.value+10, Math.ceil(max/60)+1))
})

const hours = computed(()=>{
  const arr=[]
  for(let h=hourStart.value; h<=hourEnd.value; h++) arr.push(h)
  return arr
})

function labelHour(h){ 
  return String(h).padStart(2,'0') + ':00' 
}

const timeWrapEl = ref(null)

function hourHeight(){ 
  const one=timeWrapEl.value?.querySelector('.g-hour'); return one ? one.getBoundingClientRect().height : 56 
}
function gridHeight(){ 
  return hourHeight() * hours.value.length 
}



function minutesFromStart(d){ 
  const m=d.getHours()*60 + d.getMinutes(); const base=hourStart.value*60; return m - base 
}

function eventsForDay(d){
  const k = dayKey(d)
  return weekEvents()
    .filter(x => dayKey(x.at) === k)
    .sort((a,b) => a.at - b.at)
    .map(x => ({ id:x.id, type:x.when, customerName:x.name, at:x.at }))
}

function styleForEvent(ev){
  let top = (minutesFromStart(ev.at) / 60) * hourHeight()
  if(top < 2) top = 2
  if(top > gridHeight() - 30) top = gridHeight() - 30
  return { top: top + 'px', height: '28px' }
}

const nowY = ref(0)

async function tickNow(){
  const d = new Date()
  await nextTick()
  let y = (minutesFromStart(d) / 60) * hourHeight()
  if(y < 1) y = 1
  if(y > gridHeight() - 1) y = gridHeight() - 1
  nowY.value = y
}


let nowTimer = null

onMounted(()=>{ 
  tickNow(); nowTimer=setInterval(tickNow,60000); addOutsideListeners() 
})
onBeforeUnmount(()=>{ 
  if(nowTimer) clearInterval(nowTimer); removeOutsideListeners() 
})


watch([weekStart, hourStart, hourEnd], ()=>{ tickNow() })

const dragging = ref(null)
const isDragging = ref(false)
let autoDir=0, autoTimer=null
const EDGE=70, STEP_MS=650

function onDragStart(e,payload){
  try{ e.dataTransfer.setData('text/plain','move') }catch{}
  try{ e.dataTransfer.effectAllowed='move' }catch{}
  dragging.value={ bookingId:String(payload.id), type:payload.type }
  isDragging.value=true
  document.addEventListener('dragover', onDocDragOver, { passive:false })
  document.addEventListener('drop', onDocDrop, { passive:false })
}


function onDragEnd(){
  isDragging.value=false
  dragging.value=null
  stopAuto()
  document.removeEventListener('dragover', onDocDragOver)
  document.removeEventListener('drop', onDocDrop)
}



function onDocDrop(e){
  if(!isDragging.value) 
  return
  try{ e.preventDefault() }
  catch{}
  const rect=document.querySelector('.grid')?.getBoundingClientRect()
  if(!rect){ 
    onDragEnd(); 
    return
  }

  let x=e.clientX
  let idx=Math.floor(((x-rect.left)/rect.width)*7)

  if(idx<0) idx=0
  if(idx>6) idx=6
  const d=new Date(weekStart.value); d.setDate(d.getDate()+idx)
  applyDropTo(d)
  onDragEnd()
}


function onDocDragOver(e){
  if(!isDragging.value) return
  const rect=document.querySelector('.grid')?.getBoundingClientRect()

  if(!rect) return
  try{ e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect='move' }catch{}

  const x=e.clientX
  const dir = x < rect.left+EDGE ? -1 : (x > rect.right-EDGE ? 1 : 0)


  if(dir===0){ stopAuto();
     return }
  if(autoDir!==dir){ 
    stopAuto(); autoDir=dir; stepAuto() 
  }
}


function stepAuto(){
  if(!isDragging.value || autoDir===0) return
  if(autoTimer) return
  autoTimer=setTimeout(()=>{
    if(!isDragging.value){ stopAuto(); return }
    if(autoDir<0) prevWeek()
    else nextWeek()
    autoTimer=null
    stepAuto()
  }, STEP_MS)
}



function stopAuto(){ if(autoTimer){ clearTimeout(autoTimer); autoTimer=null } autoDir=0 }

function applyDropTo(date){
  if(!dragging.value) return
  const bid=dragging.value.bookingId
  const i=rawBookings.value.findIndex(b=>String(b.id)===bid)
  if(i<0) return


  const b={...rawBookings.value[i]}
  const curStart=parseISOFlexible(b.startDate)
  const curEnd=parseISOFlexible(b.endDate)


  if(dragging.value.type==='start'){
    const ns=new Date(curStart||date)
    ns.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
    if(curEnd && +normalize(ns) >= +normalize(curEnd)) return
    b.startDate=ns.toISOString()
  }else{
    const ne=new Date(curEnd||date)
    ne.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
    if(curStart && +normalize(ne) <= +normalize(curStart)) return
    b.endDate=ne.toISOString()
  }
  rawBookings.value.splice(i,1,b)
  emit('reschedule',{ stationId:String(props.station?.id||''), bookingId:bid, startDate:b.startDate, endDate:b.endDate })
}

const monthBtnEl = ref(null)
const yearBtnEl = ref(null)
const monthPopEl = ref(null)
const yearPopEl = ref(null)
function onDocPointer(e){
  const t=e.target
  if(showMonthPicker.value){
    const inside=monthPopEl.value?.contains(t)||monthBtnEl.value?.contains(t)
    if(!inside) showMonthPicker.value=false
  }
  if(showYearPicker.value){
    const inside=yearPopEl.value?.contains(t)||yearBtnEl.value?.contains(t)
    if(!inside) showYearPicker.value=false
  }
}



function addOutsideListeners(){
  document.addEventListener('mousedown', onDocPointer, true)
  document.addEventListener('touchstart', onDocPointer, true)
}


function removeOutsideListeners(){
  document.removeEventListener('mousedown', onDocPointer, true)
  document.removeEventListener('touchstart', onDocPointer, true)
}

const showNowLine = computed(()=>{
  const ws = weekStart.value
  const we = addDays(ws, 6)
  return +today >= +ws && +today <= +we
})






</script>

<style scoped>
.wrap {
  background: var(--bg);
  color: var(--text);
  --gutter-w: 56px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 4px;
}

.title {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 28px;
  font-weight: 700;
}

.month-btn,
.year-btn {
  appearance: none;
  background: transparent;
  border: 0;
  padding: 0;
  font: inherit;
  color: inherit;
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: 6px;
  color: var(--muted);
  font-size: 12px;
}

.sq {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
  border: 1px solid var(--border);
}

.sq-start {
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.sq-end {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.head-row {
  display: grid;
  grid-template-columns: var(--gutter-w) 1fr;
  padding: 12px 4px 8px;
}

.phantom {
  min-height: 1px;
}

.week-header {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.head-day {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: .25ch;
  font-size: 20px;
  font-weight: 500;
  border-radius: 8px;
  padding: 2px 0;
}

.dow {
  color: var(--muted);
}

.space {
  width: .25ch;
}

.num {
  display: inline-grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  font-weight: 700;
  line-height: 1;
  color: inherit;
  box-sizing: border-box;
  border: 2px solid transparent;
}

.num.ring {
  border-color: var(--accent);
}

.time-wrap {
  position: relative;
  display: grid;
  grid-template-columns: var(--gutter-w) 1fr;
  height: calc(var(--hour-h) * var(--rows));
  --hour-h: 56px;
}

.gutter {
  position: relative;
  border-right: 1px solid var(--border);
}

.g-hour {
  height: var(--hour-h);
  font-size: 12px;
  color: var(--muted);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding-right: 8px;
}

.grid {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.grid::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 1px;
  background: var(--border);
  z-index: 2;
}

.rows {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: repeat(var(--rows), var(--hour-h));
  grid-column: 1 / -1;
  z-index: 1;
  pointer-events: none;
}

.r-hour {
  border-top: 1px solid var(--border);
}

.now-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  border-top: 2px solid #ef4444;
  z-index: 3;
  grid-column: 1 / -1;
}

.col {
  position: relative;
  height: 100%;
}

.col + .col::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border);
}

.col.weekend {
  background: #fafafa;
}

.events {
  position: absolute;
  inset: 0 6px 0 6px;
  z-index: 2;
}

.event {
  position: absolute;
  left: 0;
  right: 0;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 12px;
  cursor: grab;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event:active {
  cursor: grabbing;
}

.event-start {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #065f46;
}

.event-end {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1e40af;
}

.event-name {
  font-weight: 700;
}

.divider {
  height: 1px;
  background: var(--border);
}

.month-popover {
  position: absolute;
  top: 110%;
  left: 0;
  z-index: 30;
  width: min(90vw, 320px);
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, .15);
  padding: 10px;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.month-cell {
  appearance: none;
  background: #fff;
  border: 1px solid var(--border);
  padding: 10px 0;
  border-radius: 10px;
  font-weight: 700;
}

.month-cell:hover {
  background: var(--accent-hover);
  border-color: var(--accent-border);
}

.month-cell.chosen {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.year-popover {
  position: absolute;
  top: 110%;
  left: 0;
  z-index: 30;
  width: min(90vw, 360px);
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, .15);
  padding: 10px;
}

.year-toolbar {
  display: grid;
  grid-template-columns: 32px 1fr 32px;
  align-items: center;
}

.chev {
  appearance: none;
  background: transparent;
  border: 0;
  font-size: 22px;
  line-height: 1;
}

.year-range {
  text-align: center;
  font-weight: 600;
}

.year-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 10px 0 6px;
}

.year-cell {
  appearance: none;
  background: #fff;
  border: 1px solid var(--border);
  padding: 10px 0;
  border-radius: 10px;
  font-weight: 700;
}

.year-cell:hover {
  background: var(--accent-hover);
  border-color: var(--accent-border);
}

.year-cell.chosen {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

@media (max-width: 420px) {
  .title { 
    font-size: 24px; 
  }
  .num { 
    width: 28px; 
    height: 28px; 
  }


  .time-wrap { 
    --hour-h: 48px; 
  }
  
  .head-day {
    flex-direction: column;
    font-size: 12px;
  }
}

@media (max-width: 780px) {
  .wrap { --gutter-w: 44px }

  .topbar {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 6px 2px;
  }

  .title {
    font-size: 20px;
    gap: 6px;
  }

  .controls {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .controls .legend {
    order: 0;
    flex: 0 0 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-right: 0;
  }

  .controls .chip {
    order: 1;
    flex: 1 1 0;
    min-width: 0;
  }

  .legend .sq {
    width: 10px;
    height: 10px;
  }

  .year-popover,
  .month-popover{
    transform: translateX(-100px) scale(0.7);
  }

  .head-row { 
    padding: 8px 2px 6px; 
  }

  .week-header { 
    gap: 4px; 
  }
  .head-day { 
    font-size: 11px; 
    padding: 0;
  }

  .num { 
    width: 24px; 
    height: 24px; 
  }

  .time-wrap { --hour-h: 44px }

  .g-hour { font-size: 10px; 
    padding-right: 6px; 
  }

  .events { 
    inset: 0 3px; 
  }


  .event { 
    padding: 4px 6px; 
    font-size: 11px; 
    border-radius: 8px; 
  }

  .month-popover,
  .year-popover { 
    width: calc(100vw - 24px); 
  }

  .month-grid,
  .year-grid { 
    gap: 6px;
  }

  .month-cell { 
    padding: 8px 0; 
  }
  .year-cell {
     padding: 8px 0; 
  }
}
</style>
