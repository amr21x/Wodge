import { v7, validate, version } from "uuid";
import { z } from "zod";

/** Default for new entities in every runtime. Existing identifiers remain unchanged. */
export function createEntityId(): string {
  return v7();
}

/** Accept the historic format while new records use UUIDv7. */
export function entityIdSchema(legacyLength: number) {
  return z
    .string()
    .refine(
      (value) =>
        value.length === legacyLength ||
        (validate(value) && version(value) === 7),
      "Invalid entity identifier",
    );
}
