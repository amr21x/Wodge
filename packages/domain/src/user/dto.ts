import type { z } from "zod";
import type { UpdateUserSchema, PublicUserSchema } from "./validation";

export type UpdateUserInput = z.output<typeof UpdateUserSchema>;

export type PublicUserDTO = z.output<typeof PublicUserSchema>;
