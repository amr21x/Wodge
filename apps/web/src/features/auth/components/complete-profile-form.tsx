"use client";

import { failureMessage, requireOk } from "@/client/errors";
import { api } from "@/client/api";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useStepper } from "@/components/ui/stepper";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { UpdateUserSchema } from "@wodge/domain/user/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AvatarBtn } from "../../../components/avatar-btn";
import { useUpload } from "@/features/files/hooks/use-upload";
import { useDelete } from "@/features/files/hooks/use-delete";
import { useOnboarding } from "./onboarding-context";
import { toast } from "sonner";

export function CompleteProfileForm() {
  const { user, setIsPending, isPending } = useOnboarding();
  const { nextStep } = useStepper();

  const { mutateAsync } = useMutation({
    mutationFn: async (data: z.infer<typeof UpdateUserSchema>) => {
      const res = await api.api.users.update.$post({ json: data });

      await requireOk(res);

      return true;
    },
    onError(error) {
      toast.error(failureMessage(error));
    },
  });

  const form = useForm<z.infer<typeof UpdateUserSchema>>({
    resolver: zodResolver(UpdateUserSchema.omit({ avatar: true })),
    defaultValues: {
      displayName: user?.displayName ?? "",
      username: user?.username ?? "",
    },
  });

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

  async function onSubmit(data: z.infer<typeof UpdateUserSchema>) {
    if (isPending) return;
    setIsPending(true);
    try {
      await mutateAsync(data);
      void queryClient.invalidateQueries({ queryKey: ["user"] });
      nextStep();
    } catch {
      // The mutation displays a safe error; keep the form and its input intact.
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Form {...form}>
      <div className="z-20 flex flex-col space-y-3">
        <div className="flex justify-center">
          <AvatarBtn
            avatar={user?.avatar}
            fallback={user?.displayName}
            className="h-20 w-20 rounded-full border-2 border-primary/30"
            isDeleting={isDeleting}
            isUploading={isUploading}
            onRemove={deleteAvatar}
            onUpload={onUpload}
          />
        </div>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col space-y-2"
          id="profile-form"
        >
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">
                  Display name
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="John Doe"
                    className="peer bg-background"
                  />
                </FormControl>
                <FormDescription withError collapsible>
                  This how people will see you. Use whatever you want.
                </FormDescription>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">
                  Username
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="peer bg-background"
                    placeholder="johndoe"
                  />
                </FormControl>
                <FormDescription withError collapsible>
                  Only letters, numbers, dashes, and underscores.
                </FormDescription>
              </FormItem>
            )}
          />
        </form>
      </div>
    </Form>
  );
}
