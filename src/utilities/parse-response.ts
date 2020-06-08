import { Headers } from "cross-fetch"
import { newline } from "./miscellaneous"

export function parseResponse(value: string): HttpResponse {
  const [statusLine, content] = splitAtFirst(value, newline)
  const { headers, body } = splitContent(content)

  const [, status, ...statusText] = statusLine.split(" ")

  return {
    status: Number(status),
    statusText: statusText.join(" "),
    headers,
    body: body.trim(),
  }
}

export function splitContent(value: string): HttpContent {
  const [rawHeaders, body] = splitAtFirst(value, newline + newline)

  const headers = new Headers()
  for (const header of rawHeaders.split(newline)) {
    const [name, value] = splitAtFirst(header, ":")
    headers.append(name, value.trim())
  }

  return { headers, body }
}

function splitAtFirst(value: string, separator: string): [string, string] {
  const index = value.indexOf(separator)
  const front = value.slice(0, index)
  const back = value.slice(index + separator.length)
  return [front, back]
}

interface HttpContent {
  headers: Headers
  body: string
}

interface HttpResponse extends HttpContent {
  status: number
  statusText: string
}
