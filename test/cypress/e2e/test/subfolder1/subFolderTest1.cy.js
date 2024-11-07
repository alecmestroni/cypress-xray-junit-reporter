/// <reference types = "cypress"/>

describe("test", () => {
    it("testcase", { jiraKey: 'abc' }, () => {
        expect(true).to.eq(true);
    })
})