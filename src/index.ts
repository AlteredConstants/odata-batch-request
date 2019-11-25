import * as uuid from "uuid/v4"
import {
  format,
  getHeaderValue,
  newline,
  parseHttpResponse,
  splitAtBoundary,
} from "./utilities"

export class ODataBatchRequest<
  T extends ReadonlyArray<
    | ODataBatchOperation
    | ODataBatchChangeset<ReadonlyArray<ODataBatchOperation>>
  >
> {
  public readonly operations: T
  public readonly url: string
  public readonly headers: { readonly [header: string]: string }
  public readonly body: string
  public readonly value: string

  public constructor(serviceRoot: string, operations: T) {
    const boundary = `batch_${uuid()}`
    const formattedOperations = operations.map(
      operation => format`
        --${boundary}
        ${operation.value}
      `,
    )

    this.operations = operations

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

  public parseResponse(value: string, contentType?: string): BatchResponse<T> {
    const responses = splitAtBoundary(
      value,
      contentType,
    ).map((operation, index) => this.operations[index].parseResponse(operation))

    const hasError = responses
      .flatMap(response => response)
      .some(response => response.statusCode >= 400)

    return {
      operations: (responses as unknown) as OperationResponseList<T>,
      hasError,
    }
  }

  public toString(): string {
    return this.value
  }
}

export class ODataBatchChangeset<T extends ReadonlyArray<ODataBatchOperation>> {
  public readonly operations: T
  public readonly value: string

  public constructor(operations: T) {
    const boundary = `changeset_${uuid()}`

    const formattedOperations = operations.map(
      (operation, index) => format`
        --${boundary}
        Content-ID: ${getContentIdFromIndex(index)}
        ${operation.value}
      `,
    )

    this.operations = operations

    this.value = format`
      Content-Type: multipart/mixed; boundary=${boundary}

      ${formattedOperations.join(newline)}
      --${boundary}--
    `
  }

  public parseResponse(
    value: string,
  ): { [K in keyof T]: OperationResponse } | ChangesetFailureResponse<T> {
    if (getHeaderValue(value, "Content-Type") === "application/http") {
      const { statusCode, body } = parseHttpResponse(value)
      return { changeset: this, statusCode, body }
    }

    const baseResponses = splitAtBoundary(value).map(parseHttpResponse)

    const responses: OperationResponse[] = []
    for (const [index, operation] of this.operations.entries()) {
      const baseResponse = baseResponses.find(
        response => response.contentId === getContentIdFromIndex(index),
      )
      if (!baseResponse) {
        throw new Error(`Missing response of operation at index ${index}.`)
      }

      responses[index] = {
        operation,
        statusCode: baseResponse.statusCode,
        body: baseResponse.body,
      }
    }

    return responses as { -readonly [K in keyof T]: OperationResponse }
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

  public parseResponse(value: string): OperationResponse {
    const { statusCode, body } = parseHttpResponse(value)
    return { operation: this, statusCode, body }
  }

  public toString(): string {
    return this.value
  }
}

function getContentIdFromIndex(index: number): string {
  return `${index + 1}`
}

const methods = ["get", "post", "put", "patch", "delete"] as const
type Method = typeof methods[number]

type Headers = { readonly [header: string]: string }

type BatchResponse<T> = {
  operations: OperationResponseList<T>
  hasError: boolean
}

type OperationResponseList<T> = {
  [K in keyof T]: T[K] extends ODataBatchChangeset<infer U>
    ? { [K2 in keyof U]: OperationResponse } | ChangesetFailureResponse<U>
    : T[K] extends ODataBatchOperation
    ? OperationResponse
    : never
}

type OperationResponse = {
  readonly operation: ODataBatchOperation
  readonly statusCode: number
  readonly body?: unknown
}

type ChangesetFailureResponse<T extends ReadonlyArray<ODataBatchOperation>> = {
  readonly changeset: ODataBatchChangeset<T>
  readonly statusCode: number
  readonly body?: unknown
}
