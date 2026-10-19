import type { HonoRequest } from "hono";
import { HTTPException } from "hono/http-exception";

export async function readUpload(request: HonoRequest): Promise<File> {
  let body: Awaited<ReturnType<HonoRequest["parseBody"]>>;
  try {
    body = await request.parseBody();
  } catch {
    throw new HTTPException(400, { message: "Invalid upload body" });
  }
  const file = body.file;

  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: "A file is required" });
  }

  return file;
}
