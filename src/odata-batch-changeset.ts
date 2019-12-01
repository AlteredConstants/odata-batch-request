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
  public readonly getHttp: () => string

  public constructor(operations: T) {
    const boundary = `changeset_${uuid()}`

    const formattedOperations = operations.map(
      (operation, index) => format`
        --${boundary}
        Content-ID: ${getContentIdFromIndex(index)}
        ${operation.getHttp(
          getReferenceContentId(operations, operation, index),
        )}
      `,
    )

    this.operations = operations

    const value = format`
      Content-Type: multipart/mixed; boundary=${boundary}

      ${formattedOperations.join(newline)}
      --${boundary}--
    `
    this.getHttp = () => value
  }

  public parseResponse(
    value: string,
  ): { [K in keyof T]: OperationResponse } | ChangesetFailureResponse<T> {
    if (getHeaderValue(value, "Content-Type") === "application/http") {
      const { status, body } = parseHttpResponse(value)
      return { changeset: this, status, body }
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
        status: baseResponse.status,
        body: baseResponse.body,
      }
    }

    return responses as { -readonly [K in keyof T]: OperationResponse }
  }

  public toString(): string {
    return this.getHttp()
  }
}

export type ChangesetFailureResponse<
  T extends ReadonlyArray<ODataBatchOperation>
> = {
  readonly changeset: ODataBatchChangeset<T>
  readonly status: number
  readonly body?: unknown
}

function getReferenceContentId(
  operations: ReadonlyArray<ODataBatchOperation>,
  operation: ODataBatchOperation,
  index: number,
): string | undefined {
  if (!operation.rootReference) {
    return undefined
  }

  const rootReferenceIndex = operations.indexOf(operation.rootReference)
  if (rootReferenceIndex === -1) {
    throw new Error("Could not find root reference operation.")
  }
  if (rootReferenceIndex >= index) {
    throw new Error(
      "Referenced operation must come before the operation it's referenced in.",
    )
  }

  return getContentIdFromIndex(rootReferenceIndex)
}

function getContentIdFromIndex(index: number): string {
  return `${index + 1}`
}
