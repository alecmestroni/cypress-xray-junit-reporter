describe("fail", () => {
  it("fail", { jiraKey: "TOP-12869", retries: 2 }, () => {
    cy.visit("www.google.com").then(() => {
      expect(true).to.eq(false)
    })
  })
})
