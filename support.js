
Cypress.on('test:after:run', (test, runnable) => {
    const sanitize = require('sanitize-filename');
    let parentsArray = []
    if (test.state === 'failed') {
        let path = `${Cypress.config('screenshotsFolder')}`
        path = path.replace("\\", "/")
        path += `/${Cypress.spec.name}/`
        addParentPath(runnable)
        const parents = parentsArray.toReversed().toString().replace(",", "")
        path += parents
        path += sanitize(test.title) + ' (failed).png'
        test.screenshot = path
    }

    function addParentPath(runnable) {
        const title = runnable.parent.title
        if (title) {
            parentsArray.push(sanitize(runnable.parent.title) + ' -- ');
            addParentPath(runnable.parent)
        }
    }
})

if (!Cypress.config().isInteractive && Cypress.config().reporter !== 'spec' && Cypress.config().betterRetries) {
    afterEach(() => {
        const test = cy.state('runnable')?.ctx?.currentTest;
        if (test.state === 'failed' && Cypress.currentRetry <= test._retries) {
            cy.task('logYellow', `    (Attempt ${Cypress.currentRetry + 1} of ${test._retries + 1}) ${test.title}`, { log: false });
        }
        if (test.state === 'failed' && Cypress.currentRetry < test._retries) {
            cy.task('logRed', `    ${test.err.parsedStack[0].message}`, { log: false });
        }
    });
}