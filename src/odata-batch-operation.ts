import { format, newline, parseHttpResponse } from "./utilities"

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

  public parseResponse(value: string): OperationResponse {
    const { statusCode, body } = parseHttpResponse(value)
    return { operation: this, statusCode, body }
  }

  public toString(): string {
    return this.value
  }
}

export type OperationResponse = {
  readonly operation: ODataBatchOperation
  readonly statusCode: number
  readonly body?: unknown
}

const methods = ["get", "post", "put", "patch", "delete"] as const
type Method = typeof methods[number]

type Headers = { readonly [header: string]: string }
