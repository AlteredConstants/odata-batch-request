import { newline } from "./miscellaneous"

export function getHeaderValue(
  response: string,
  headerKey: string,
): string | undefined {
  const headersEndIndex = response.indexOf(newline + newline)
  const headers = response.slice(0, headersEndIndex).split(newline)

  return headers
    .find(header =>
      header.toLowerCase().startsWith(`${headerKey.toLowerCase()}:`),
    )
    ?.replace(new RegExp(`^${headerKey}:`, "i"), "")
    .trim()
}
