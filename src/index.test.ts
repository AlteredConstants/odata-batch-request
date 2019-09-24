import { ODataBatch, ODataBatchOperation, Method } from "./index"

test("GET only", () => {
  const batch = new ODataBatch("host/service", [
    new ODataBatchOperation(Method.Get, "Customers('ALFKI')"),
    new ODataBatchOperation(Method.Get, "Products"),
  ])
  expect(batch.value).toMatchSnapshot()
})

test("GET and POST", () => {
  const batch = new ODataBatch("host/service", [
    new ODataBatchOperation(Method.Get, "Customers('ALFKI')"),
    new ODataBatchOperation(Method.Post, "Customers", {
      headers: { "Content-Type": "application/atom+xml;type=entry" },
      body: "<AtomPub representation of a new Customer>",
    }),
  ])
  expect(batch.value).toMatchSnapshot()
})
