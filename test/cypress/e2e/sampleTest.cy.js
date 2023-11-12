describe('testSuite 0', () => {
	describe('testSuite 1', () => {
		it('testCase 1.1', { jiraKey: 'test1.1', retries: 1 }, () => {
			expect(true).to.eq(false);
		})
	})
	describe('testSuite 2', () => {
		it('testCase 2.1', { missingJiraKey: 'here' }, () => {
			expect(true).to.eq(true);
		})
		it('testCase 2.2', () => {
			expect(true).to.eq(true);
		})
		it('testCase 2.3', () => {
			expect(true).to.eq(true);
		})
	})
	describe('testSuite 3', () => {
		it('testCase 3.1', { jiraKey: 'test3.1' }, () => {
			expect(true).to.eq(true);
		})
		it('testCase 3.2', { jiraKey: 'test3.2' }, () => {
			expect(true).to.eq(true);
		})
	})
	describe('testSuite 4', () => {
		it('testCase 4.1', { jiraKey: 'test4.1.1' }, () => {
			expect(true).to.eq(true);
		})
	})

	describe('testSuite 4', () => {
		it('testCase 4.1', { jiraKey: 'test4.1.2' }, () => {
			expect(true).to.eq(true);
		})
	})
	it('testCase 0.1', { jiraKey: 'test0.1' }, () => {
		expect(true).to.eq(true);
	})
})