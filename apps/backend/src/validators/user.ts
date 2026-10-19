import { UpdateUserSchema } from "@wodge/domain/user/validation";
import { z } from "zod";

export const RemoveWorkspaceBody = z.object({ workspaceId: z.string().min(1) });

export const UpdateAccountBody = UpdateUserSchema.strict();
