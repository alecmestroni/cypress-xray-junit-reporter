describe('Suite 0', { testIsolation: false }, () => {
	describe('Suite 1', { testIsolation: false }, () => {
		it('testCase 1.1', { jiraKey: 'pippo1.1', retries: 1 }, () => {
			expect(true).to.eq(true);
		})
	})
	describe('Suite 2', { testIsolation: false }, () => {
		it('testCase 2.1', { retries: 1 }, () => {
			expect(true).to.eq(true);
		})
		it('testCase 2.2', { retries: 1 }, () => {
			expect(true).to.eq(true);
		})
		it('testCase 2.3', { retries: 1 }, () => {
			expect(true).to.eq(true);
		})
	})
	describe('Suite 3', { testIsolation: false }, () => {
		it('testCase 3.1', { jiraKey: 'pippo1.1', retries: 1 }, () => {
			expect(true).to.eq(true);
		})
		it('testCase 3.1', { jiraKey: 'pippo1.1', retries: 1 }, () => {
			expect(true).to.eq(true);
		})
	})
	describe('Suite 4', { testIsolation: false }, () => {
		it('testCase 4.1', { jiraKey: 'pippo1.1', retries: 1 }, () => {
			expect(true).to.eq(true);
		})
	})

	describe('Suite 4', { testIsolation: false }, () => {
		it('testCase 4.1', { jiraKey: 'pippo1.2', retries: 1 }, () => {
			expect(true).to.eq(true);
		})
	})
	it('testCase 0.1', { jiraKey: 'pippo1.2', retries: 1 }, () => {
		expect(true).to.eq(true);
	})
})