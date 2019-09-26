import * as _uuid from "uuid/v4"
import {
  ODataBatchChangeset,
  ODataBatchOperation,
  ODataBatchRequest,
} from "../src/index"

jest.mock("uuid/v4")

const uuid: jest.Mock<string, []> = _uuid as any

test("GET only", () => {
  uuid.mockReturnValue("36522ad7-fc75-4b56-8c71-56071383e77b")

  const batch = new ODataBatchRequest("host/service", [
    new ODataBatchOperation("get", "Customers('ALFKI')"),
    new ODataBatchOperation("get", "Products"),
  ])

  expect(batch.toString()).toMatchSnapshot()
})

test("GET and POST", () => {
  uuid.mockReturnValue("36522ad7-fc75-4b56-8c71-56071383e77b")

  const batch = new ODataBatchRequest("host/service", [
    new ODataBatchOperation("get", "Customers('ALFKI')"),
    new ODataBatchOperation("post", "Customers", {
      headers: { "Content-Type": "application/atom+xml;type=entry" },
      body: "<AtomPub representation of a new Customer>",
    }),
  ])

  expect(batch.toString()).toMatchSnapshot()
})

test("Changeset", () => {
  uuid
    // Changeset boundary.
    .mockReturnValueOnce("77162fcd-b8da-41ac-a9f8-9357efbbd")
    // Batch boundary.
    .mockReturnValueOnce("36522ad7-fc75-4b56-8c71-56071383e77b")

  const changeset = new ODataBatchChangeset([
    new ODataBatchOperation("post", "Customers", {
      headers: { "Content-Type": "application/atom+xml;type=entry" },
      body: "<AtomPub representation of a new Customer>",
    }),
    new ODataBatchOperation("patch", "Customers('ALFKI')", {
      headers: { "Content-Type": "application/json" },
      body: "<JSON representation of Customer ALFKI>",
    }),
  ])

  const batch = new ODataBatchRequest("host/service", [
    new ODataBatchOperation("get", "Customers('ALFKI')"),
    changeset,
    new ODataBatchOperation("get", "Products"),
  ])

  expect(batch.toString()).toMatchSnapshot()
})

test("Construct correct batch URL", () => {
  uuid.mockReturnValue("36522ad7-fc75-4b56-8c71-56071383e77b")

  const batch = new ODataBatchRequest("host/service/", [
    new ODataBatchOperation("get", "Customers"),
  ])

  expect(batch.toString()).toMatchSnapshot()
})
