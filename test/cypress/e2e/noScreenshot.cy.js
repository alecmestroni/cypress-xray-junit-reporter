describe('disable screenshotOnRunFailure', () => {
    before(() => {
        Cypress.config('screenshotOnRunFailure', false);
    });

    it('testCase', () => {
        expect(false).to.eq(true);
    });
})

describe('disable and enable screenshotOnRunFailure', () => {
    before(() => {
        Cypress.config('screenshotOnRunFailure', false);
    });

    after(() => {
        Cypress.config('screenshotOnRunFailure', true);
    });

    it('testCase', () => {
        expect(false).to.eq(true);
    });
})