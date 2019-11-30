import { ODataBatchRequest, ODataBatchOperation } from "../src"

describe("ODataBatchRequest", () => {
  it("should construct the correct batch URL", () => {
    const batch = new ODataBatchRequest("host/service/", [
      new ODataBatchOperation("get", "Customers"),
    ])

    expect(batch.url).toEqual("host/service/$batch")
  })

  it("should add trailing slash in service root URL", () => {
    const batch = new ODataBatchRequest("host/service", [
      new ODataBatchOperation("get", "Customers"),
    ])

    expect(batch.url).toEqual("host/service/$batch")
  })
})
