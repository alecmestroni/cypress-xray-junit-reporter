describe('Suite 1', { testIsolation: false }, () => {
	it('1.1', { jiraKey: 'pippo1.1', retries: 1 }, () => {
		cy.visit('https://www.google.com').contains('pippo')
	})
})