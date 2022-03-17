import { format, newline, parseHttpBodyPart } from "./utilities"

export class ODataBatchOperation {
  private readonly rootReference?: ODataBatchOperation
  public readonly getHttp: (getReference?: ReferenceGetter) => string

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
      body: Body
    },
  )
  public constructor(
    method: Method,
    path: string | [ODataBatchOperation, string],
    { headers = {} as Headers, body = "" as Body } = {},
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

    this.getHttp = (getReference) => {
      let fullPath = partialPath
      if (this.rootReference) {
        if (getReference === undefined) {
          throw new Error(
            "Referencing a root operation can only be used as part of a batch changeset.",
          )
        }
        const reference = getReference(this.rootReference)
        fullPath = `${reference}/${partialPath}`
      }

      return format`
        Content-Type: application/http
        Content-Transfer-Encoding: binary

        ${method.toUpperCase()} ${fullPath} HTTP/1.1
        ${formattedHeaders}
        ${typeof body === "string" ? body : body(getReference)}
      `
    }
  }

  public parseResponse(value: string): OperationResponse {
    const { status, body } = parseHttpBodyPart(value)
    return { operation: this, status, body }
  }

  public toString(): string {
    return this.getHttp()
  }
}

export type OperationResponse = {
  readonly operation: ODataBatchOperation
  readonly status: number
  readonly body?: string
}

const methods = ["get", "post", "put", "patch", "delete"] as const
type Method = typeof methods[number]

type Headers = { readonly [header: string]: string }

type ReferenceGetter = (operation: ODataBatchOperation) => string
type Body = string | ((getReference?: ReferenceGetter) => string)
