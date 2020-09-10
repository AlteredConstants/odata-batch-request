import { v4 as uuid } from "uuid"
import {
  ODataBatchChangeset,
  ODataBatchOperation,
  ODataBatchRequest,
} from "../src/index"
import * as response from "./response.txt"

jest.mock("uuid")

const uuidMock: jest.Mock<string, []> = uuid as any

test("Get full GET batch request", () => {
  uuidMock.mockReturnValue("36522ad7-fc75-4b56-8c71-56071383e77b")

  const batch = new ODataBatchRequest("host/service", [
    new ODataBatchOperation("get", "Customers('ALFKI')"),
    new ODataBatchOperation("get", "Products"),
  ])

  expect(batch.toString()).toMatchInlineSnapshot(`
    "POST host/service/$batch HTTP/1.1
    OData-Version: 4.0
    Content-Type: multipart/mixed; boundary=batch_36522ad7-fc75-4b56-8c71-56071383e77b
    Accept: multipart/mixed

    --batch_36522ad7-fc75-4b56-8c71-56071383e77b
    Content-Type: application/http
    Content-Transfer-Encoding: binary

    GET Customers('ALFKI') HTTP/1.1


    --batch_36522ad7-fc75-4b56-8c71-56071383e77b
    Content-Type: application/http
    Content-Transfer-Encoding: binary

    GET Products HTTP/1.1


    --batch_36522ad7-fc75-4b56-8c71-56071383e77b--"
  `)
})

test("Get full GET and POST batch request", () => {
  uuidMock.mockReturnValue("36522ad7-fc75-4b56-8c71-56071383e77b")

  const batch = new ODataBatchRequest("host/service", [
    new ODataBatchOperation("get", "Customers('ALFKI')"),
    new ODataBatchOperation("post", "Customers", {
      headers: { "Content-Type": "application/atom+xml;type=entry" },
      body: "<AtomPub representation of a new Customer>",
    }),
  ])

  expect(batch.toString()).toMatchInlineSnapshot(`
    "POST host/service/$batch HTTP/1.1
    OData-Version: 4.0
    Content-Type: multipart/mixed; boundary=batch_36522ad7-fc75-4b56-8c71-56071383e77b
    Accept: multipart/mixed

    --batch_36522ad7-fc75-4b56-8c71-56071383e77b
    Content-Type: application/http
    Content-Transfer-Encoding: binary

    GET Customers('ALFKI') HTTP/1.1


    --batch_36522ad7-fc75-4b56-8c71-56071383e77b
    Content-Type: application/http
    Content-Transfer-Encoding: binary

    POST Customers HTTP/1.1
    Content-Type: application/atom+xml;type=entry

    <AtomPub representation of a new Customer>
    --batch_36522ad7-fc75-4b56-8c71-56071383e77b--"
  `)
})

test("Get full changeset batch request", () => {
  uuidMock
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

  expect(batch.toString()).toMatchInlineSnapshot(`
    "POST host/service/$batch HTTP/1.1
    OData-Version: 4.0
    Content-Type: multipart/mixed; boundary=batch_36522ad7-fc75-4b56-8c71-56071383e77b
    Accept: multipart/mixed

    --batch_36522ad7-fc75-4b56-8c71-56071383e77b
    Content-Type: application/http
    Content-Transfer-Encoding: binary

    GET Customers('ALFKI') HTTP/1.1


    --batch_36522ad7-fc75-4b56-8c71-56071383e77b
    Content-Type: multipart/mixed; boundary=changeset_77162fcd-b8da-41ac-a9f8-9357efbbd

    --changeset_77162fcd-b8da-41ac-a9f8-9357efbbd
    Content-ID: 1
    Content-Type: application/http
    Content-Transfer-Encoding: binary

    POST Customers HTTP/1.1
    Content-Type: application/atom+xml;type=entry

    <AtomPub representation of a new Customer>
    --changeset_77162fcd-b8da-41ac-a9f8-9357efbbd
    Content-ID: 2
    Content-Type: application/http
    Content-Transfer-Encoding: binary

    PATCH Customers('ALFKI') HTTP/1.1
    Content-Type: application/json

    <JSON representation of Customer ALFKI>
    --changeset_77162fcd-b8da-41ac-a9f8-9357efbbd--
    --batch_36522ad7-fc75-4b56-8c71-56071383e77b
    Content-Type: application/http
    Content-Transfer-Encoding: binary

    GET Products HTTP/1.1


    --batch_36522ad7-fc75-4b56-8c71-56071383e77b--"
  `)
})

test("Get full changeset with reference batch request", () => {
  uuidMock
    // Changeset boundary.
    .mockReturnValueOnce("77162fcd-b8da-41ac-a9f8-9357efbbd")
    // Batch boundary.
    .mockReturnValueOnce("36522ad7-fc75-4b56-8c71-56071383e77b")

  const customerPost = new ODataBatchOperation("post", "Customers", {
    headers: { "Content-Type": "application/atom+xml;type=entry" },
    body: "<AtomPub representation of a new Customer>",
  })
  const orderPost = new ODataBatchOperation("post", "Orders", {
    headers: { "Content-Type": "application/atom+xml;type=entry" },
    body: "<AtomPub representation of a new Order>",
  })
  const orderReferencePost = new ODataBatchOperation(
    "post",
    [customerPost, "Orders/$ref"],
    {
      headers: { "Content-Type": "application/json" },
      body: (getReference) => `{"$id":"${getReference(orderPost)}"}`,
    },
  )

  const changeset = new ODataBatchChangeset([
    customerPost,
    orderPost,
    orderReferencePost,
  ])

  const batch = new ODataBatchRequest("host/service", [changeset])

  expect(batch.toString()).toMatchInlineSnapshot(`
    "POST host/service/$batch HTTP/1.1
    OData-Version: 4.0
    Content-Type: multipart/mixed; boundary=batch_36522ad7-fc75-4b56-8c71-56071383e77b
    Accept: multipart/mixed

    --batch_36522ad7-fc75-4b56-8c71-56071383e77b
    Content-Type: multipart/mixed; boundary=changeset_77162fcd-b8da-41ac-a9f8-9357efbbd

    --changeset_77162fcd-b8da-41ac-a9f8-9357efbbd
    Content-ID: 1
    Content-Type: application/http
    Content-Transfer-Encoding: binary

    POST Customers HTTP/1.1
    Content-Type: application/atom+xml;type=entry

    <AtomPub representation of a new Customer>
    --changeset_77162fcd-b8da-41ac-a9f8-9357efbbd
    Content-ID: 2
    Content-Type: application/http
    Content-Transfer-Encoding: binary

    POST Orders HTTP/1.1
    Content-Type: application/atom+xml;type=entry

    <AtomPub representation of a new Order>
    --changeset_77162fcd-b8da-41ac-a9f8-9357efbbd
    Content-ID: 3
    Content-Type: application/http
    Content-Transfer-Encoding: binary

    POST $1/Orders/$ref HTTP/1.1
    Content-Type: application/json

    {\\"$id\\":\\"$2\\"}
    --changeset_77162fcd-b8da-41ac-a9f8-9357efbbd--
    --batch_36522ad7-fc75-4b56-8c71-56071383e77b--"
  `)
})

test("Parse full batch response", () => {
  const customerGet = new ODataBatchOperation("get", "Customers('ALFKI')")
  const customerPost = new ODataBatchOperation("post", "Customers", {
    headers: { "Content-Type": "application/atom+xml;type=entry" },
    body: "<AtomPub representation of a new Customer>",
  })
  const customerPatch = new ODataBatchOperation("patch", "Customers('ALFKI')", {
    headers: { "Content-Type": "application/json" },
    body: "<JSON representation of Customer ALFKI>",
  })
  const productsGet = new ODataBatchOperation("get", "Products")

  const batch = new ODataBatchRequest("host/service", [
    customerGet,
    new ODataBatchChangeset([customerPost, customerPatch] as const),
    productsGet,
  ] as const)

  const parsed = batch.parseResponse(
    response,
    "multipart/mixed;boundary=b_243234_25424_ef_892u748",
  )

  expect(parsed).toEqual({
    hasError: true,
    operations: [
      {
        operation: customerGet,
        status: 200,
        body:
          '{ "value": "JSON representation of the Customer entity with EntityKey ALFKI" }',
      },
      [
        {
          operation: customerPost,
          status: 201,
          body: "<AtomPub representation of a new Customer entity>",
        },
        {
          operation: customerPatch,
          status: 204,
          body: "",
        },
      ],
      {
        operation: productsGet,
        status: 404,
        body: "<Error message>",
      },
    ],
  })
})
