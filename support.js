const sanitize = require('sanitize-filename');

Cypress.on('test:after:run', (test, runnable) => {

    let parentsArray = []
    console.log(test)
    if (test.state === 'failed') {
        let path = `${Cypress.config('screenshotsFolder')}`
        path = path.replace("\\", "/")
        path += `/${Cypress.spec.name}/`
        addParentPath(runnable)
        const parents = parentsArray.toReversed().toString().replace(",", "")
        path += parents
        path += sanitize(test.title) + ' (failed).png'
        test.screenshot = path
        console.log(path)
    }

    function addParentPath(runnable) {
        const title = runnable.parent.title
        if (title) {
            parentsArray.push(sanitize(runnable.parent.title) + ' -- ');
            addParentPath(runnable.parent)
        }
    }
})