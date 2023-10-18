const sanitize = require('sanitize-filename');
Cypress.on('test:after:run', (test, runnable) => {
    let parentsArray = []
    if (test.state === 'failed') {
        let path = `${Cypress.config('screenshotsFolder')}\\${Cypress.spec.name}\\`
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