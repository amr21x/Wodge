import { injectable } from "tsyringe";

export type HttpTransport = (request: Request) => Promise<Response>;

/** Shared HTTP mechanics. Callers select a network or bound-object transport. */
@injectable()
export class HttpClient {
  request(
    input: RequestInfo | URL,
    init?: RequestInit,
    transport: HttpTransport = (request) => fetch(request),
  ): Promise<Response> {
    return transport(new Request(input, init));
  }
}
