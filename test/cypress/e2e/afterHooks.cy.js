// after(function () {
//     cy.visit('https://example.com')
//     cy.get('non-existent-element').should('exist')
// })

// afterEach(function () {
//     cy.visit('https://example.com')
//     cy.get('non-existent-element').should('be.visible')
// })
describe('A Test', () => {
    it('A Test - IT', { jiraKey: "EPM-00000" }, function () {
        expect(1).to.be.eq(1)
    })

    it('A Test - Other IT', { jiraKey: "EPM-00000" }, function () {
        expect(1).to.be.eq(-10)
    })
})

describe('B Test', () => {
    after(function () {
        cy.visit('https://example.com')
        cy.get('non-existent-element').should('exist')
    })

    afterEach(function () {
        cy.visit('https://example.com')
        cy.get('non-existent-element').should('be.visible')
    })
    it('B Test - IT', { jiraKey: "EPM-00000" }, function () {
        expect(1).to.be.eq(1)
    })

    it('B Test - Other IT', { jiraKey: "EPM-00000" }, function () {
        expect(1).to.be.eq(-10)
    })
})