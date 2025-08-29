import { ref, h } from 'vue'
import { createStore } from 'vuex'
import WeekCalendar from '@/components/WeekCalendar.vue'
import bookingsModule from '@/store/modules/bookings'

import { makeDataTransfer } from '../support/dnd'

function wrapCalendar(station) {
  const viewDate = ref(new Date('2025-04-16T10:00:00Z')) // Wed
  return {
    setup() {
      const onUpdate = d => { viewDate.value = d }
      const onReschedule = () => {}
      return () => h(WeekCalendar, {
        station,
        viewDate: viewDate.value,
        overrides: {},
        'onUpdate-view-date': onUpdate,
        onReschedule
      })
    }
  }
}

describe('WeekCalendar drag-and-drop', () => {
  it('logs PATCH when dropping to another day', () => {
    const store = createStore({ modules: { bookings: bookingsModule } })

    const station = {
      id: '1',
      name: 'Berlin',
      bookings: [
        {
          id: '51',
          pickupReturnStationId: '1',
          customerName: 'Tyree O\'Connell',
          startDate: '2025-04-16T10:28:00.000Z',
          endDate: '2025-04-18T10:28:00.000Z'
        }
      ]
    }

    cy.spy(console, 'log').as('apiLog')

    cy.mount(wrapCalendar(station), {
      global: { plugins: [store] }
    })

    cy.contains('.event', "Tyree O'Connell").should('exist')

    const dt = makeDataTransfer()
    cy.contains('.event', "Tyree O'Connell")
      .trigger('dragstart', { dataTransfer: dt })

    cy.get('.grid .col').eq(4) // Fri column (Mon=0)
      .trigger('dragover', { dataTransfer: dt })
      .trigger('drop', { dataTransfer: dt })

    cy.get('@apiLog').should('have.been.called')
    cy.get('@apiLog').then(calls => {
      const [msg, payload] = calls.getCall(0).args
      expect(msg).to.match(/PATCH \/stations\/1\/bookings\/51/)
      expect(payload).to.have.any.keys('startDate', 'endDate')
    })
  })
})