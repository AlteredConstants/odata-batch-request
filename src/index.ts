import * as uuid from "uuid/v4"
import { outdent } from "outdent"

const newline = "\r\n"
const format = outdent({ newline })

export class ODataBatch {
  public constructor(
    private readonly serviceRoot: string,
    private readonly operations: readonly Operation[],
  ) {}

  private readonly boundary = `batch_${uuid()}`

  private readonly formattedOperations = this.operations.map(
    operation => format`
      --${this.boundary}
      ${operation.value}
    `,
  )

  public readonly body = format`
    ${this.formattedOperations.join(newline)}
    --${this.boundary}--
  `

  public readonly value = format`
    POST ${this.serviceRoot}/$batch HTTP/1.1
    Content-Type: multipart/mixed; boundary=${this.boundary}

    ${this.body}
  `

  public toString(): string {
    return this.value
  }
}

export class ODataBatchChangeset {
  public constructor(
    private readonly operations: readonly ODataBatchOperation[],
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
    method: Method.Get | Method.Delete,
    path: string,
    options?: {
      headers?: Headers
    },
  )
  public constructor(
    method: Exclude<Method, Method.Get | Method.Delete>,
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
    if ((method === Method.Get || method === Method.Delete) && options.body) {
      throw new Error("Methods GET and DELETE cannot include a body.")
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

    ${this.method} ${this.path} HTTP/1.1
    ${this.formattedHeaders}
    ${this.body}
  `

  public toString(): string {
    return this.value
  }
}

export enum Method {
  Get = "GET",
  Put = "PUT",
  Post = "POST",
  Patch = "PATCH",
  Delete = "DELETE",
}

type Operation = ODataBatchOperation | ODataBatchChangeset
type Headers = { readonly [header: string]: string }
