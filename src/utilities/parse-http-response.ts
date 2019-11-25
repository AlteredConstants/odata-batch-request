import { parse } from "http-z"
import { newline } from "./miscellaneous"

export function parseHttpResponse(value: string): HttpResponse {
  const response = parse(fakeStatusLine + newline + value)

  if (!response.body || !("plain" in response.body)) {
    throw new Error("Unexpected operation body type.")
  }

  if (response.body.contentType !== "application/http") {
    throw new Error(
      `Unexpected operation content type: ${JSON.stringify(response.body)}`,
    )
  }

  const contentId = response.headers?.find(
    header => header.name.toLowerCase() === "content-id",
  )?.values[0]?.value

  const { statusCode, body } = parse(response.body.plain)

  const formattedBody =
    body &&
    ("plain" in body
      ? body.plain.trim()
      : "json" in body
      ? body.json
      : undefined)

  return { statusCode, contentId, body: formattedBody }
}

type HttpResponse = {
  statusCode: number
  contentId?: string
  body?: unknown
}

const fakeStatusLine = "HTTP/1.1 200 OK But Also Not Real"
