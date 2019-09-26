import { outdent } from "outdent"
import * as uuid from "uuid/v4"

const newline = "\r\n"
const format = outdent({ newline })

export class ODataBatchRequest {
  public readonly url: string
  public readonly headers: { readonly [header: string]: string }
  public readonly body: string
  public readonly value: string

  public constructor(
    serviceRoot: string,
    operations: readonly [Operation, ...Operation[]],
  ) {
    const boundary = `batch_${uuid()}`
    const formattedOperations = operations.map(
      operation => format`
        --${boundary}
        ${operation.value}
      `,
    )

    this.url = `${serviceRoot.replace(/\/+$/, "")}/$batch`
    this.headers = {
      "OData-Version": "4.0",
      "Content-Type": `multipart/mixed; boundary=${boundary}`,
      Accept: "multipart/mixed",
    }

    this.body = format`
      ${formattedOperations.join(newline)}
      --${boundary}--
    `

    this.value = format`
      POST ${this.url} HTTP/1.1
      ${Object.entries(this.headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join(newline)}

      ${this.body}
    `
  }

  public toString(): string {
    return this.value
  }
}

export class ODataBatchChangeset {
  public readonly value: string

  public constructor(
    operations: readonly [ODataBatchOperation, ...ODataBatchOperation[]],
  ) {
    const boundary = `changeset_${uuid()}`

    const formattedOperations = operations.map(
      (operation, index) => format`
        --${boundary}
        Content-ID: ${index + 1}
        ${operation.value}
      `,
    )

    this.value = format`
      Content-Type: multipart/mixed; boundary=${boundary}

      ${formattedOperations.join(newline)}
      --${boundary}--
    `
  }

  public toString(): string {
    return this.value
  }
}

export class ODataBatchOperation {
  public readonly value: string

  public constructor(
    method: "get" | "delete",
    path: string,
    options?: {
      headers?: Headers
    },
  )
  public constructor(
    method: "post" | "put" | "patch",
    path: string,
    options: {
      headers?: Headers
      body: string
    },
  )
  public constructor(
    method: Method,
    path: string,
    { headers = {} as Headers, body = "" } = {},
  ) {
    if (!methods.includes(method)) {
      throw new Error(
        `Method argument "${method}" is not one of ${JSON.stringify(methods)}.`,
      )
    }
    if ((method === "get" || method === "delete") && body) {
      throw new Error('Methods "get" and "delete" cannot include a body.')
    }

    const formattedHeaders = Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}${newline}`)
      .join("")

    this.value = format`
      Content-Type: application/http
      Content-Transfer-Encoding: binary

      ${method.toUpperCase()} ${path} HTTP/1.1
      ${formattedHeaders}
      ${body}
  `
  }

  public toString(): string {
    return this.value
  }
}

const methods = ["get", "post", "put", "patch", "delete"] as const
type Method = typeof methods[number]

type Operation = ODataBatchOperation | ODataBatchChangeset
type Headers = { readonly [header: string]: string }
