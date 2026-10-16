import { zodResolver } from "@hookform/resolvers/zod";
import { ID_LENGTH } from "@wodge/domain/constants";
import { NewWorkspaceSchema, type NewWorkspace } from "@wodge/data";
import { env } from "@wodge/env";

import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "@/components/ui/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function CreateWorkspaceForm() {
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
    mutationFn: async (data: NewWorkspace & { id: string }) => {
      const res = await fetch(`/api/workspaces/new`, {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to create workspace");

      return data.slug;
    },
    onSuccess: (slug) => {
      queryClient.invalidateQueries({
        queryKey: ["user-workspaces"],
      });
      router.push("/" + slug);
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  function onSubmit(data: NewWorkspace) {
    if (!user) return;

    const workspaceId = nanoid(ID_LENGTH);

    mutate({ ...data, id: workspaceId });
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
