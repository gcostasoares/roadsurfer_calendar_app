import { createRouter, createWebHistory } from 'vue-router'
import CalendarPage from '@/pages/CalendarPage.vue'
import BookingPage from '@/pages/BookingPage.vue'
import store from '@/store'

function normDate(d){ try{ return new Date(d).toISOString().slice(0,10) }catch{ return null } }

const routes=[
  { path:'/', redirect:()=>({ path:'/calendar', query:{ date:new Date().toISOString().slice(0,10) } }) },
  { path:'/calendar', name:'calendar', component:CalendarPage },
  { path:'/booking/:stationId/:bookingId', name:'booking', component:BookingPage, props:true }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to,from,next)=>{
  if(to.name==='calendar'){
    const d=normDate(to.query.date||new Date())
    const q={...to.query, date:d}
    if(d!==to.query.date) next({ name:'calendar', query:q, replace:true })
    else next()
  }else next()
})

router.afterEach((to)=>{
  if(to.name==='calendar'){
    const d=to.query.date?new Date(String(to.query.date)):new Date()
    store.commit('calendar/setDate', d)
    const sid=to.query.station?String(to.query.station):null
    if(sid) store.dispatch('stations/select', sid)
  }
})

export default router
