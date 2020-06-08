import { v4 as uuid } from "uuid"
import { ODataBatchOperation, OperationResponse } from "./odata-batch-operation"
import {
  format,
  newline,
  parseHttpBodyPart,
  splitAtBoundary,
  splitContent,
} from "./utilities"

export class ODataBatchChangeset<T extends readonly ODataBatchOperation[]> {
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
    if (
      splitContent(value).headers.get("Content-Type") === "application/http"
    ) {
      const { status, body } = parseHttpBodyPart(value)
      return { changeset: this, status, body }
    }

    const baseResponses = splitAtBoundary(value).map(parseHttpBodyPart)

    const responses: OperationResponse[] = []
    for (const [index, operation] of this.operations.entries()) {
      const baseResponse = baseResponses.find(
        (response) => response.contentId === getContentIdFromIndex(index),
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
  T extends readonly ODataBatchOperation[]
> = {
  readonly changeset: ODataBatchChangeset<T>
  readonly status: number
  readonly body?: unknown
}

function getReferenceContentId(
  operations: readonly ODataBatchOperation[],
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
