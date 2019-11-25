declare module "http-z" {
  function parse(value: string): HttpResponse

  interface HttpResponse {
    protocolVersion: string
    statusCode: number
    statusMessage: string
    headers?: Array<{
      name: string
      values: Array<{ value: string; params?: string[] }>
    }>
    cookies?: Array<{
      name: string
      value?: string
      params?: string[]
    }>
    body?:
      | {
          contentType:
            | "multipart/form-data"
            | "application/x-www-form-urlencoded"
          formDataParams: Array<{ name: string; value: string }>
        }
      | { contentType: "application/json"; json: unknown }
      | { contentType: string; plain: string }
  }
}
