import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SettingsContentAction, SettingsContentSection } from "../settings";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { Workspace, WorkspaceSchema } from "@wodge/data";
import { useCurrentWorkspace } from "@/components/workspace-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Info } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { env } from "@wodge/env";
import { useRouter } from "next/navigation";

export function WorkspaceGeneralForm() {
  const { workspace, workspaceRep, workspaceId } = useCurrentWorkspace();
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
    if (workspace) form.reset(workspace);
  }, [workspace]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: Pick<Workspace, "name" | "slug">) => {
      await fetch(`/api/workspaces/${workspaceId}/update`, {
        method: "POST",
        body: JSON.stringify(data),
      });

      return data;
    },
    onSuccess: (data) => {
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
