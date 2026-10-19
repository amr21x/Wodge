import { api } from "@/client/api";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { Workspace } from "@wodge/domain/workspace/models";
import { WorkspaceSchema } from "@wodge/domain/workspace/validation";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

import { toast } from "@/components/ui/toast";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useRouter } from "next/navigation";

export function WorkspaceGeneralForm() {
  const { workspace, workspaceId } = useCurrentWorkspace();
  const queryClient = useQueryClient();

  const form = useForm<Workspace>({
    resolver: zodResolver(WorkspaceSchema.pick({ name: true, slug: true })),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const formRef = useRef<HTMLFormElement>(null);

  const router = useRouter();

  useEffect(() => {
    if (workspace) {
      form.reset(workspace);
    }
  }, [workspace, form]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: Pick<Workspace, "name" | "slug">) => {
      if (!workspaceId) throw new Error("No workspace selected");
      const response = await api.api.workspaces[":workspaceId"].update.$post({
        param: { workspaceId },
        json: data,
      });
      if (!response.ok) throw new Error("Workspace update failed");

      return data;
    },
    onSuccess: (_data) => {
      toast.success("Workspace updated");
      queryClient.invalidateQueries({
        queryKey: ["user-workspaces"],
      });
      // }
    },
    onError() {
      toast.error("Workspace update failed");
    },
  });

  async function onSubmit(data: Pick<Workspace, "name" | "slug">) {
    mutate(data);
    router.push(`/${data.slug}/settings`);
    form.reset(data);
  }

  return (
    <div className="space-y-2">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          ref={formRef}
          className="flex w-full flex-col gap-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Workspace Name</FormLabel>
                <FormControl>
                  <Input {...field} className="w-2/5" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Workspace URL</FormLabel>
                <FormControl>
                  <Input {...field} className="w-2/5" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            className="w-fit"
            disabled={!form.formState.isDirty || isPending}
            size="sm"
          >
            Update workspace
          </Button>
        </form>
      </Form>
    </div>
  );
}
