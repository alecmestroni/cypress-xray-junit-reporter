describe('Suite 0', { testIsolation: false }, () => {
	describe('Suite 1', { testIsolation: false }, () => {
		it('1.1', { jiraKey: 'pippo1.1', retries: 1 }, () => {
			expect(true).to.eq(true);
		})
	})
	describe('Suite 2', { testIsolation: false }, () => {
		it('2.1', { retries: 1 }, () => {
			expect(true).to.eq(true);
		})
		it('2.2', { retries: 1 }, () => {
			expect(true).to.eq(true);
		})
		it('2.3', { retries: 1 }, () => {
			expect(true).to.eq(true);
		})
	})
	describe('Suite 3', { testIsolation: false }, () => {
		it('3.1', { jiraKey: 'pippo1.1', retries: 1 }, () => {
			expect(true).to.eq(true);
		})
		it('3.1', { jiraKey: 'pippo1.1', retries: 1 }, () => {
			expect(true).to.eq(true);
		})
	})
	describe('Suite 4', { testIsolation: false }, () => {
		it('4.1', { jiraKey: 'pippo1.1', retries: 1 }, () => {
			expect(true).to.eq(true);
		})
	})
	it('0.1', { jiraKey: 'pippo1.1', retries: 1 }, () => {
		expect(true).to.eq(false);
	})
})