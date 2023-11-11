
Cypress.on('test:after:run', (test, runnable) => {
    const sanitize = require('sanitize-filename');

    if (test.state === 'failed') {
        const path = buildScreenshotPath(test);
        test.screenshot = path;
    }

    function buildScreenshotPath(test) {
        let path = `${Cypress.config('screenshotsFolder').replace(/\\/g, "/")}/${Cypress.spec.name}/`;
        const parents = addParentsTitle(runnable);
        path += parents;
        path += sanitize(test.title) + ' (failed).png';
        return path;
    }

    function addParentsTitle(runnable) {
        const titles = [];
        while (runnable.parent.title) {
            titles.push(sanitize(runnable.parent.title) + ' -- ');
            runnable = runnable.parent;
        }
        return titles.toReversed().join('').replace(/, /g, '');
    }
});

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