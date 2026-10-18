import type { HonoRequest } from "hono";
import { HTTPException } from "hono/http-exception";

export async function readUpload(request: HonoRequest): Promise<File> {
  const body = await request.parseBody();
  const file = body.file;

  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: "A file is required" });
  }

  return file;
}
