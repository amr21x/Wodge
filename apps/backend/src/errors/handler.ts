import { ApplicationError } from "@wodge/core/errors";
import { IntegrationUnavailableError } from "@wodge/infra/integration-unavailable";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { CORS } from "../lib/helpers/responses";
import { applicationErrorStatus } from "./mappings";

/** Translate semantic failures at the HTTP boundary; unexpected details stay in server logs. */
export function handleError(error: unknown): Response {
  if (error instanceof IntegrationUnavailableError) {
    return Response.json(
      {
        ok: false,
        error: { code: "INTEGRATION_UNAVAILABLE", message: error.message },
      },
      { status: 503, headers: CORS },
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Invalid request",
          issues: error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
      },
      { status: 400, headers: CORS },
    );
  }

  if (error instanceof HTTPException) {
    return Response.json(
      { ok: false, error: { code: "HTTP_ERROR", message: error.message } },
      { status: error.status, headers: CORS },
    );
  }

  if (
    error instanceof ApplicationError &&
    Object.hasOwn(applicationErrorStatus, error.code)
  ) {
    const status =
      applicationErrorStatus[error.code as keyof typeof applicationErrorStatus];

    if (status >= 500) {
      console.error("Application dependency failure", error);
    }

    return Response.json(
      { ok: false, error: error.toJSON() },
      { status, headers: CORS },
    );
  }

  // Provider errors can echo credentials in their message/cause. Keep only diagnostic frames.
  console.error("Unhandled backend error", {
    type: error instanceof Error ? error.name : typeof error,
    frames:
      error instanceof Error
        ? error.stack
            ?.split("\n")
            .filter((line) => /^\s+at\s/.test(line))
            .join("\n")
        : undefined,
  });

  return Response.json(
    {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    },
    { status: 500, headers: CORS },
  );
}

export async function handleIngress<T>(
  action: () => T | Promise<T>,
): Promise<T | Response> {
  try {
    return await action();
  } catch (error) {
    return handleError(error);
  }
}

// Startup runs before object routes. Reject with a safe message for the runtime boundary.

export async function handleStartup(
  action: () => Promise<void>,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    console.error("Backend startup failed", error);

    throw new HTTPException(500, {
      message: "Internal server error",
      cause: error,
    });
  }
}
