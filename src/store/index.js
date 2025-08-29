import { createStore } from 'vuex'
import calendar from './modules/calendar'
import stations from './modules/stations'
import bookings from './modules/bookings'
export default createStore({ modules: { calendar, stations, bookings } })
