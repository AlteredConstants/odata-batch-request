import { outdent } from "outdent"
import * as uuid from "uuid/v4"

const newline = "\r\n"
const format = outdent({ newline })

export class ODataBatchRequest {
  public constructor(
    private readonly serviceRoot: string,
    private readonly operations: readonly [Operation, ...Operation[]],
  ) {}

  private readonly boundary = `batch_${uuid()}`

  private readonly formattedOperations = this.operations.map(
    operation => format`
      --${this.boundary}
      ${operation.value}
    `,
  )

  public readonly url = `${this.serviceRoot.replace(/\/+$/, "")}/$batch`
  public readonly headers: { readonly [header: string]: string } = {
    "OData-Version": "4.0",
    "Content-Type": `multipart/mixed; boundary=${this.boundary}`,
    Accept: "multipart/mixed",
  }

  public readonly contentType = `Content-Type: multipart/mixed; boundary=${this.boundary}`

  public readonly body = format`
    ${this.formattedOperations.join(newline)}
    --${this.boundary}--
  `

  public readonly value = format`
    POST ${this.url} HTTP/1.1
    ${Object.entries(this.headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join(newline)}

    ${this.body}
  `

  public toString(): string {
    return this.value
  }
}

export class ODataBatchChangeset {
  public constructor(
    private readonly operations: readonly [
      ODataBatchOperation,
      ...ODataBatchOperation[],
    ],
  ) {}

  private readonly boundary = `changeset_${uuid()}`

  private readonly formattedOperations = this.operations.map(
    (operation, index) => format`
      --${this.boundary}
      Content-ID: ${index + 1}
      ${operation.value}
    `,
  )

  public readonly value = format`
    Content-Type: multipart/mixed; boundary=${this.boundary}

    ${this.formattedOperations.join(newline)}
    --${this.boundary}--
  `

  public toString(): string {
    return this.value
  }
}

export class ODataBatchOperation {
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
    private readonly method: Method,
    private readonly path: string,
    private readonly options: {
      headers?: Headers
      body?: string
    } = {},
  ) {
    if (!methods.includes(method)) {
      throw new Error(
        `Method argument "${method}" is not one of ${JSON.stringify(methods)}.`,
      )
    }
    if ((method === "get" || method === "delete") && options.body) {
      throw new Error('Methods "get" and "delete" cannot include a body.')
    }
  }

  private readonly headers = this.options.headers || {}
  private readonly body = this.options.body || ""
  private readonly formattedHeaders = Object.entries(this.headers)
    .map(([key, value]) => `${key}: ${value}${newline}`)
    .join("")

  public readonly value = format`
    Content-Type: application/http
    Content-Transfer-Encoding: binary

    ${this.method.toUpperCase()} ${this.path} HTTP/1.1
    ${this.formattedHeaders}
    ${this.body}
  `

  public toString(): string {
    return this.value
  }
}

const methods = ["get", "post", "put", "patch", "delete"] as const
type Method = typeof methods[number]

type Operation = ODataBatchOperation | ODataBatchChangeset
type Headers = { readonly [header: string]: string }
