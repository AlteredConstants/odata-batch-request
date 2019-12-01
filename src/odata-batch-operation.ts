import { format, newline, parseHttpResponse } from "./utilities"

export class ODataBatchOperation {
  public readonly rootReference?: ODataBatchOperation
  public readonly getHttp: (referenceContentId?: string) => string

  public constructor(
    method: "get" | "delete",
    path: string | [ODataBatchOperation, string],
    options?: {
      headers?: Headers
    },
  )
  public constructor(
    method: "post" | "put" | "patch",
    path: string | [ODataBatchOperation, string],
    options: {
      headers?: Headers
      body: string
    },
  )
  public constructor(
    method: Method,
    path: string | [ODataBatchOperation, string],
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

    let partialPath: string
    if (Array.isArray(path)) {
      this.rootReference = path[0]
      partialPath = path[1]
    } else {
      partialPath = path
    }

    this.getHttp = (referenceContentId?: string) => {
      const fullPath = referenceContentId
        ? `$${referenceContentId}/${partialPath}`
        : partialPath

      return format`
        Content-Type: application/http
        Content-Transfer-Encoding: binary

        ${method.toUpperCase()} ${fullPath} HTTP/1.1
        ${formattedHeaders}
        ${body}
      `
    }
  }

  public parseResponse(value: string): OperationResponse {
    const { statusCode, body } = parseHttpResponse(value)
    return { operation: this, statusCode, body }
  }

  public toString(): string {
    return this.getHttp()
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
