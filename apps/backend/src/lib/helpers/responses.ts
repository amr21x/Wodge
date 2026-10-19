// Responses for sync and runtime boundaries without a Hono context.
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers": "Authorization,*",
};

export const json = <T>(data: T, status = 200) =>
  Response.json(data, { status, headers: CORS });

export const ok = () => json({ ok: true });

export const error = (err: string | { message: string }, status = 500) => {
  console.error("Error response", err);

  return json(
    {
      ok: false,
      error: typeof err === "string" ? err : (err.message ?? "Unknown error"),
    },
    status,
  );
};

export const unauthorized = () => error("Unauthorized", 401);

export const badRequest = () => error("Bad request", 400);
