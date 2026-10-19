import { HTTPException } from "hono/http-exception";

export async function readJson(request: {
  json(): Promise<unknown>;
}): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new HTTPException(400, { message: "Malformed JSON" });
    }

    throw error;
  }
}
