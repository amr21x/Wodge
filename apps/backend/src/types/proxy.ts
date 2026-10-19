import type { Endpoint, Schema } from "hono/types";

/** Object routes inherit the required parameter introduced by their public Worker mount. */
export type WithPathParameter<Routes extends Schema, Name extends string> = {
  [Path in keyof Routes]: {
    [Method in keyof Routes[Path]]: Routes[Path][Method] extends infer Route extends
      Endpoint
      ? Omit<Route, "input"> & {
          input: Route["input"] & { param: Record<Name, string> };
        }
      : never;
  };
};
