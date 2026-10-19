"use client";

import { FeatureGate } from "@/components/feature-flags-provider";

import {
  SettingsContentDescription,
  SettingsContentHeader,
  SettingsContentSection,
} from "../settings";

import { AvatarBtn } from "@/components/avatar-btn";
import { useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { AccountGeneralForm } from "./account-general-form";
import { ModeToggle } from "@/components/toggle";
import { useUpload } from "@/features/files/hooks/use-upload";
import { useDelete } from "@/features/files/hooks/use-delete";

export function AccountSettings() {
  const { user } = useCurrentUser();

  const queryClient = useQueryClient();

  const { upload, isUploading } = useUpload("user", user?.id, () => {
    queryClient.invalidateQueries({
      queryKey: ["user"],
    });
  });

  const { deleteAvatar, isDeleting } = useDelete("user", user?.id, () => {
    queryClient.invalidateQueries({
      queryKey: ["user"],
    });
  });

  function onUpload(file: File) {
    const formData = new FormData();

    formData.append("file", file);
    upload(formData);
  }

  return (
    <div className="relative w-full shrink-0 grow divide-y-[1px] divide-border/70">
      <SettingsContentHeader
        label="Account"
        description="Manage your account settings"
      />
      <FeatureGate feature="profiles">
        <SettingsContentSection header="Avatar">
          <div className="space-y-3">
            <AvatarBtn
              fallback={user?.displayName}
              onUpload={onUpload}
              onRemove={deleteAvatar}
              avatar={user?.avatar}
              isUploading={isUploading}
              isDeleting={isDeleting}
              className="h-20 w-20 rounded-full ring-2"
            />

            <SettingsContentDescription>
              Update your user avatar. Recommended is 256x256px
            </SettingsContentDescription>
          </div>
        </SettingsContentSection>
      </FeatureGate>
      <SettingsContentSection header="General">
        <AccountGeneralForm />
      </SettingsContentSection>

      <SettingsContentSection header="Theme">
        <ModeToggle />
      </SettingsContentSection>
    </div>
  );
}
