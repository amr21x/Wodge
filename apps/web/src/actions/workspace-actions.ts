"use server";

import { currentUser } from "@/lib/supabase/current-user";
import {
  NewWorkspace,
  NewWorkspaceSchema,
  Workspace,
  workspaces,
  WorkspaceSchema,
} from "@wodge/data";
import { createDb } from "@/lib/data-server";
import { eq } from "drizzle-orm";
import "server-only";

export async function updateWorkspace(
  workspaceId: string,
  data: Pick<Workspace, "name" | "slug">,
) {
  // 1. Authenticate user
  const user = await currentUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // TODO authorize action

  // 2. Validate data
  const validatedFields = WorkspaceSchema.pick({
    name: true,
    slug: true,
  }).safeParse(data);

  if (!validatedFields.success) {
    return { error: "Invalid data" };
  }

  const { data: updatedData } = validatedFields;

  const db = createDb();

  // 3. update workspace
  await db
    .update(workspaces)
    .set(updatedData)
    .where(eq(workspaces.id, workspaceId));
}
