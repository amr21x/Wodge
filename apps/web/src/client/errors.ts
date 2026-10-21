/** Browser-safe failures shared by typed and non-JSON transports. */
export class RequestFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RequestFailure";
  }
}

export const accessFailureEvent = "wodge:access-failure";

export function reportAccessFailure(status: number) {
  if ((status === 401 || status === 403) && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(accessFailureEvent, { detail: status }),
    );
  }
}

export async function requireOk(response: {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}): Promise<void> {
  if (response.ok) return;
  reportAccessFailure(response.status);
  const body: unknown = await response.json().catch(() => null);
  let code = "HTTP_ERROR";
  let message = "";
  if (body && typeof body === "object" && "error" in body) {
    const error = body.error;
    if (error && typeof error === "object") {
      if ("code" in error && typeof error.code === "string") code = error.code;
      if ("message" in error && typeof error.message === "string")
        message = error.message;
    }
  }
  throw new RequestFailure(response.status, code, message);
}

export function failureMessage(
  error: unknown,
  fallback = "Unable to complete this request. Please try again.",
): string {
  if (error instanceof TypeError)
    return "Could not connect. Check your connection and try again. Your input has been kept.";
  if (error instanceof RequestFailure) {
    if (error.status === 401)
      return "Your session has expired. Sign in again to continue.";
    if (error.status === 403)
      return "You no longer have permission for this action. Your access is being refreshed.";
    if (error.status === 429)
      return "Too many attempts. Please wait before trying again.";
    if (error.status === 503)
      return "This service is currently unavailable. Please try again later.";
    if (error.status === 400 || error.status === 422)
      return "Check the values you entered and try again.";
    // Application conflict/not-found messages are safe public backend contracts.
    if (
      (error.status === 409 || error.status === 404) &&
      /^[A-Z]+_/.test(error.code) &&
      error.code !== "HTTP_ERROR"
    )
      return error.message || fallback;
  }
  return fallback;
}

export function authFailureMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const code =
      "code" in error && typeof error.code === "string" ? error.code : "";
    const status =
      "status" in error && typeof error.status === "number" ? error.status : 0;
    if (
      code === "TOO_MANY_ATTEMPTS" ||
      code === "TOO_MANY_REQUESTS" ||
      status === 429
    )
      return "Too many attempts. Please wait before trying again.";
    if (
      code === "PROVIDER_NOT_FOUND" ||
      code === "SERVICE_UNAVAILABLE" ||
      status === 503
    )
      return "This sign-in method is currently unavailable. Try another method or try again later.";
    if (status === 400 || status === 401)
      return "Sign-in failed. Please try Google or GitHub again.";
  }
  return failureMessage(
    error,
    "Sign-in could not be completed. Please try again.",
  );
}
