
function support(Cypress, cy, afterEach) {
    Cypress.on('test:after:run', (test, runnable) => {
        const sanitize = require('sanitize-filename');

        if (test.state === 'failed') {
            const path = buildScreenshotPath(test);
            test.screenshot = path;
        }

        function buildScreenshotPath(test) {
            let path = `${Cypress.config('screenshotsFolder').replace(/\\/g, "/")}/${Cypress.spec.name}/`;
            const parents = addParentsTitle(runnable) + sanitize(test.title) + ' (failed)'
            path += parents.slice(0, 250) + '.png';
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
            const test = cy.state('runnable').ctx.currentTest;
            if (test.state === 'failed' && Cypress.currentRetry < test._retries) {
                cy.task('logColoredText', { color: 'yellow', text: `    ${test.title} (Attempt ${Cypress.currentRetry + 1} of ${test._retries + 1})` }, { log: false });
                cy.task('logColoredText', { color: 'red', text: `    ${test.err.parsedStack[0].message}` }, { log: false });
            }
        });
    }
}

module.exports = support;