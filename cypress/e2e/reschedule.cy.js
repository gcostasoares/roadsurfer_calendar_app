import { makeDataTransfer } from '../support/dnd'

describe('Reschedule booking E2E', () => {
  it('selects Berlin and drags John Doe to a new day', () => {
    cy.visit('/')

    cy.window().then(win => cy.spy(win.console, 'log').as('apiLog'))

    cy.get('input.ac-input').type('Ber')
    cy.contains('li.ac-item', 'Berlin').click()

    cy.contains('.event', 'john doe').should('exist')

    const dt = makeDataTransfer()
    cy.contains('.event', 'john doe')
      .trigger('dragstart', { dataTransfer: dt })

    cy.get('.grid .col').eq(3) // Thu
      .trigger('dragover', { dataTransfer: dt })
      .trigger('drop', { dataTransfer: dt })

    cy.get('@apiLog').should('have.been.called')
    cy.reload()
    cy.contains('.event', 'john doe').should('exist')
  })
})