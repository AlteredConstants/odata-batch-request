import * as _uuid from "uuid/v4"
import {
  Method,
  ODataBatchChangeset,
  ODataBatchOperation,
  ODataBatchRequest,
} from "./index"

jest.mock("uuid/v4")

const uuid: jest.Mock<string, []> = _uuid as any

test("GET only", () => {
  uuid.mockReturnValue("36522ad7-fc75-4b56-8c71-56071383e77b")

  const batch = new ODataBatchRequest("host/service", [
    new ODataBatchOperation(Method.Get, "Customers('ALFKI')"),
    new ODataBatchOperation(Method.Get, "Products"),
  ])

  expect(batch.value).toMatchSnapshot()
})

test("GET and POST", () => {
  uuid.mockReturnValue("36522ad7-fc75-4b56-8c71-56071383e77b")

  const batch = new ODataBatchRequest("host/service", [
    new ODataBatchOperation(Method.Get, "Customers('ALFKI')"),
    new ODataBatchOperation(Method.Post, "Customers", {
      headers: { "Content-Type": "application/atom+xml;type=entry" },
      body: "<AtomPub representation of a new Customer>",
    }),
  ])

  expect(batch.value).toMatchSnapshot()
})

test("Changset", () => {
  uuid
    // Changeset boundary.
    .mockReturnValueOnce("77162fcd-b8da-41ac-a9f8-9357efbbd")
    // Batch boundary.
    .mockReturnValueOnce("36522ad7-fc75-4b56-8c71-56071383e77b")

  const changeset = new ODataBatchChangeset([
    new ODataBatchOperation(Method.Post, "Customers", {
      headers: { "Content-Type": "application/atom+xml;type=entry" },
      body: "<AtomPub representation of a new Customer>",
    }),
    new ODataBatchOperation(Method.Patch, "Customers('ALFKI')", {
      headers: { "Content-Type": "application/json" },
      body: "<JSON representation of Customer ALFKI>",
    }),
  ])

  const batch = new ODataBatchRequest("host/service", [
    new ODataBatchOperation(Method.Get, "Customers('ALFKI')"),
    changeset,
    new ODataBatchOperation(Method.Get, "Products"),
  ])

  expect(batch.value).toMatchSnapshot()
})
