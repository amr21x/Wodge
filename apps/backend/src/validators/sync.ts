import { z } from "zod";

export const SyncTargetHeaders = z.object({
  namespace: z.enum(["user", "workspace", "room", "thread", "page"]),
  id: z.string().min(1),
});

export type SyncTarget = z.output<typeof SyncTargetHeaders>;
