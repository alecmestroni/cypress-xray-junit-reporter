describe('Suite 1', { testIsolation: false }, () => {
	it('1.1', { jiraKey: 'pippo1.1', retries: 1 }, () => {
		expect(true).to.eq(true);
	})
})
describe('Suite 2', { testIsolation: false }, () => {
	it('1.1', { retries: 1 }, () => {
		expect(true).to.eq(true);
	})
	it('1.1', { retries: 1 }, () => {
		expect(true).to.eq(true);
	})
	it('1.1', { retries: 1 }, () => {
		expect(true).to.eq(true);
	})
})
describe('Suite 3', { testIsolation: false }, () => {
	it('1.1', { jiraKey: 'pippo1.1', retries: 1 }, () => {
		expect(true).to.eq(true);
	})
	it('1.1', { jiraKey: 'pippo1.1', retries: 1 }, () => {
		expect(true).to.eq(true);
	})
})
describe('Suite 4', { testIsolation: false }, () => {
	it('1.1', { jiraKey: 'pippo1.1', retries: 1 }, () => {
		expect(true).to.eq(true);
	})
})