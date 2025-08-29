import { createRouter, createWebHistory } from 'vue-router'
import CalendarPage from '@/pages/CalendarPage.vue'
import BookingPage from '@/pages/BookingPage.vue'

function normDate(d){
  try{ return new Date(d).toISOString().slice(0,10) }catch{ return null }
}

const routes=[
  { path:'/', redirect:()=>({ path:'/calendar', query:{ date:new Date().toISOString().slice(0,10) } }) },
  { path:'/calendar', name:'calendar', component:CalendarPage },
  { path:'/booking/:stationId/:bookingId', name:'booking', component:BookingPage, props:true }
]

const router=createRouter({ history:createWebHistory(), routes })

router.beforeEach((to,from,next)=>{
  if(to.name==='calendar'){
    const d=normDate(to.query.date||new Date())
    const q={...to.query, date:d}
    if(d!==to.query.date) next({ name:'calendar', query:q, replace:true })
    else next()
  }else next()
})

export default router
