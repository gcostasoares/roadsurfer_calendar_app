import { startOfISOWeek, addDays } from '@/utils/dates'
const state=()=>({ viewDate:new Date() })
const getters = {
  weekStart: s => startOfISOWeek(s.viewDate),
  days: s => Array.from({ length: 7 }, (_, i) => addDays(startOfISOWeek(s.viewDate), i)),
  isoDate: s => {
    const d = new Date(s.viewDate)
    const y = d.getFullYear()
    const m = String(d.getMonth()+1).padStart(2,'0')
    const dd = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${dd}`     // no UTC conversion
  }
}

const mutations={
  setDate(s,d){ s.viewDate=new Date(d) },
  prevWeek(s){ s.viewDate=addDays(startOfISOWeek(s.viewDate),-7) },
  nextWeek(s){ s.viewDate=addDays(startOfISOWeek(s.viewDate),7) }
}
export default { namespaced:true, state, getters, mutations }
