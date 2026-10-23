import { api } from "@/client/api";
import { FeatureGate } from "@/components/feature-flags-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NewWorkspace } from "@wodge/domain/workspace/models";
import { NewWorkspaceSchema } from "@wodge/domain/workspace/validation";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { failureMessage, requireOk } from "@/client/errors";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function CreateWorkspaceFormContent() {
  const { user } = useCurrentUser();
  const router = useRouter();

  const form = useForm<NewWorkspace>({
    resolver: zodResolver(NewWorkspaceSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewWorkspace) => {
      const res = await api.api.workspaces.new.$post({ json: data });

      await requireOk(res);

      return data.slug;
    },
    onSuccess: (slug) => {
      queryClient.invalidateQueries({
        queryKey: ["user-workspaces"],
      });
      router.push("/" + slug);
    },
    onError: (e) => {
      toast.error(failureMessage(e));
    },
  });

  function onSubmit(data: NewWorkspace) {
    if (!user) {
      return;
    }

    mutate(data);
  }

  return (
    <Form {...form}>
      <form
        className="mt-3 flex flex-col gap-4 px-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workspace name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Workspace name" />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workspace URL</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Workspace url" />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <DialogClose asChild>
            <Button variant="outline" type="button" className="basis-1/3">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" className="basis-2/3" isPending={isPending}>
            Create Workspace
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function CreateWorkspaceForm() {
  return (
    <FeatureGate feature="workspaceCreation">
      <CreateWorkspaceFormContent />
    </FeatureGate>
  );
}
