import { z } from "zod";

export const RoleParams = z.object({ roleId: z.string().min(1) });
export const AssignmentParams = z.object({ assignmentId: z.string().min(1) });
export const InvalidationBody = z
  .object({
    workspaceId: z.string().min(1),
    revision: z.number().int().positive(),
  })
  .strict();
