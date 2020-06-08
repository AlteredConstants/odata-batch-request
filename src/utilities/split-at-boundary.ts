import { getHeaderValue } from "./get-header-value"
import { newline } from "./miscellaneous"

export function splitAtBoundary(
  response: string,
  contentType = getHeaderValue(response, "Content-Type"),
): string[] {
  if (contentType === undefined) {
    throw new Error("Could not find content type header.")
  }

  const boundary = getBoundary(contentType)

  return removeEndBoundary(response, boundary)
    .split(`--${boundary}${newline}`)
    .slice(1)
}

function getBoundary(contentType: string): string {
  const boundaryPart = contentType
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("boundary="))

  if (!boundaryPart) {
    throw new Error("Boundary could not be found in content type.")
  }

  const [, boundary] = boundaryPart.split("=")
  return boundary
}

function removeEndBoundary(response: string, boundary: string): string {
  const maybeIndex = response.indexOf(`--${boundary}--`)
  const index = maybeIndex < 0 ? response.length : maybeIndex
  return response.slice(0, index)
}
