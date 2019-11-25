import * as uuid from "uuid/v4"
import { ODataBatchOperation, OperationResponse } from "./odata-batch-operation"
import {
  format,
  getHeaderValue,
  newline,
  parseHttpResponse,
  splitAtBoundary,
} from "./utilities"

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

export type ChangesetFailureResponse<
  T extends ReadonlyArray<ODataBatchOperation>
> = {
  readonly changeset: ODataBatchChangeset<T>
  readonly statusCode: number
  readonly body?: unknown
}

function getContentIdFromIndex(index: number): string {
  return `${index + 1}`
}
