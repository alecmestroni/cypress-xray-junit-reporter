/// <reference types = "cypress"/>

describe("test", () => {
    it("testcase", { jiraKey: 'abc' }, () => {
        expect(2).to.be.greaterThan(4);
    })
})