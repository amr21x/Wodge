import type { z } from "zod";
import type {
  AssignRoleSchema,
  CreateRoleSchema,
  UpdateRoleSchema,
} from "./validation";

export type CreateRoleInput = z.output<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.output<typeof UpdateRoleSchema>;
export type AssignRoleInput = z.output<typeof AssignRoleSchema>;
