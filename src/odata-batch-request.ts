import { v4 as uuid } from "uuid"
import {
  ChangesetFailureResponse,
  ODataBatchChangeset,
} from "./odata-batch-changeset"
import { ODataBatchOperation, OperationResponse } from "./odata-batch-operation"
import { format, newline, splitAtBoundary } from "./utilities"

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
      (operation) => format`
        --${boundary}
        ${operation.getHttp()}
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
      .flatMap((response) => response)
      .some((response) => response.status >= 400)

    return {
      operations: (responses as unknown) as OperationResponseList<T>,
      hasError,
    }
  }

  public toString(): string {
    return this.value
  }
}

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
