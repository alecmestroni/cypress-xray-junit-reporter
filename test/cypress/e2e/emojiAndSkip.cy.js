// Suite/test titles with emoji must not crash the reporter and must be kept in the report.
// Tests inside describe.skip have no jira key: with requiredJiraKey they must be ignored by the fail-fast check.
describe("Checkout 🚀", () => {
  it("pays the order ✅", { jiraKey: "EPM-00000" }, function () {
    expect(true).to.eq(true)
  })

  describe("Receipt 🧾", () => {
    it("prints the receipt", { jiraKey: "EPM-00000" }, function () {
      expect(true).to.eq(true)
    })
  })
})

describe.skip("Legacy (skipped)", () => {
  it("old test without jira key", function () {
    expect(true).to.eq(true)
  })
})
