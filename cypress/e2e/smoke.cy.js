describe('App boot', () => {
  it('loads', () => {
    cy.visit('/')
    cy.contains('Today')
  })
})
