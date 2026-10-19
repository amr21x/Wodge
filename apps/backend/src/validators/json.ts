import type { Context, Env } from "hono";
import { validator } from "hono/validator";
import type { z } from "zod";

/** Preserve both the wire input and parsed output in Hono's route contract. */
export function jsonBody<Schema extends z.ZodTypeAny>(schema: Schema) {
  return validator("json", (value: z.input<Schema>): z.output<Schema> =>
    schema.parse(value),
  );
}

export type JsonContext<
  Environment extends Env,
  Schema extends z.ZodTypeAny,
> = Context<
  Environment,
  string,
  { in: { json: z.input<Schema> }; out: { json: z.output<Schema> } }
>;
