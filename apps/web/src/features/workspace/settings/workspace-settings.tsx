"use client";

import {
  SettingsContentDescription,
  SettingsContentHeader,
  SettingsContentSection,
} from "./settings";

import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { WorkspaceDangerZone } from "./workspace-danger-zone";
import { WorkspaceGeneralForm } from "./workspace-general-form";
import { useIsOwnerOrAdmin } from "@/features/workspace/hooks/use-is-owner-or-admin";
import { AvatarBtn } from "@/components/avatar-btn";

import { useUpload } from "@/features/files/hooks/use-upload";
import { useDelete } from "@/features/files/hooks/use-delete";

export function WorkspaceSettings() {
  const { workspace } = useCurrentWorkspace();

  const isManager = useIsOwnerOrAdmin();

  const { upload, isUploading } = useUpload("workspace", workspace?.id);
  const { deleteAvatar, isDeleting } = useDelete("workspace", workspace?.id);

  function onUpload(file: File) {
    const formData = new FormData();

    formData.append("file", file);
    upload(formData);
  }

  return (
    <div className="relative w-full shrink-0 grow divide-y-[1px] divide-border/70">
      <SettingsContentHeader
        label="Workspace"
        {...(isManager && {
          description: "Manage workspace settings",
        })}
      />
      {isManager && (
        <>
          <SettingsContentSection header="Avatar">
            <div className="space-y-3">
              <AvatarBtn
                className="h-16 w-16 ring-2"
                fallback={workspace?.name}
                onUpload={onUpload}
                onRemove={deleteAvatar}
                avatar={workspace?.avatar}
                isUploading={isUploading}
                isDeleting={isDeleting}
                isSquare
              />

              <SettingsContentDescription>
                Update your workspace avatar. Recommended is 256x256px
              </SettingsContentDescription>
            </div>
          </SettingsContentSection>

          <SettingsContentSection header="General">
            <WorkspaceGeneralForm />
          </SettingsContentSection>
        </>
      )}

      <SettingsContentSection header="Danger Zone">
        <WorkspaceDangerZone />
      </SettingsContentSection>
    </div>
  );
}
