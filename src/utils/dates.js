export function isDateOnly(v){
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

export function parseISOFlexible(v){
  if(isDateOnly(v)){
    const [y,m,d]=v.split('-').map(Number)
    return new Date(y,m-1,d)
  }
  const x=new Date(v)
  return isNaN(x)?null:x
}

export function startOfISOWeek(date){
  const d=new Date(date)
  const day=d.getDay()||7
  if(day!==1)d.setDate(d.getDate()-day+1)
  d.setHours(0,0,0,0)
  return d
}

export function dayKey(d){
  const y=d.getFullYear()
  const m=String(d.getMonth()+1).padStart(2,'0')
  const dd=String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${dd}`
}

export function toMinutes(d){
  return d.getHours()*60+d.getMinutes()
}

export function addDays(d,n){
  const x=new Date(d)
  x.setDate(x.getDate()+n)
  return x
}

export function clamp(v,min,max){
  return Math.min(max,Math.max(min,v))
}

export function fmtISODate(d){
  return new Date(d).toISOString().slice(0,10)
}
