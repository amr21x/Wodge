//@ts-nocheck
import { WriteTransaction } from "replicache";
import { NewWorkspace } from "@wodge/domain/workspace/models";
import { NewWorkspaceSchema } from "@wodge/domain/workspace/validation";
import { UserWorkspacesStore } from "@wodge/domain/user/models";
import { makeWorkspacesStoreKey } from "@wodge/domain/sync/index";

export const userMutators = {
  async createWorkspace(tx: WriteTransaction, data: NewWorkspace) {
    const validatedFields = NewWorkspaceSchema.safeParse(data);

    if (!validatedFields.success) {
      throw new Error("Invalid data");
    }

    const { data: newWorkspace } = validatedFields;

    const workspacesStore = await tx.get<UserWorkspacesStore[]>(
      makeWorkspacesStoreKey(),
    );

    // check if workspace already exists

    if (workspacesStore?.some((ws) => ws.workspaceId === newWorkspace.id)) {
      throw new Error("Workspace already exists");
    }

    // add the new workspace to the store

    const updatedStore: UserWorkspacesStore[] = [
      ...(workspacesStore ?? []),
      {
        workspaceId: newWorkspace.id,
        environment: newWorkspace.onCloud ? "cloud" : "local",
        workspaceName: newWorkspace.name,
        workspaceAvatar: newWorkspace.avatar,
      },
    ];

    await tx.set(makeWorkspacesStoreKey(), updatedStore);
  },
};
