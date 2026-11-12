/// <reference types = "cypress"/>

// Same file name and same root suite title as the spec in the sibling folder:
// the two reports must not overwrite each other
describe("same name", () => {
    it("testcase in subfolder1", { jiraKey: 'abc' }, () => {
        expect(true).to.eq(true);
    })
})
