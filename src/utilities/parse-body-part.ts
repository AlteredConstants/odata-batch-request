import { parseResponse, splitContent } from "./parse-response"

export function parseHttpBodyPart(value: string): HttpResponse {
  const root = splitContent(value)

  const contentType = root.headers.get("Content-Type")
  if (contentType !== "application/http") {
    throw new Error(`Unexpected operation content type: ${contentType}`)
  }

  const contentId = root.headers.get("Content-ID") || undefined

  const { status, body } = parseResponse(root.body)

  return { status, contentId, body }
}

type HttpResponse = {
  status: number
  contentId?: string
  body: string
}
