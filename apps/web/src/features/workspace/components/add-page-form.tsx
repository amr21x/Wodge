import { Button } from "@/components/ui/button";
import { DialogClose, DialogContent } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { GroupMultiSelect } from "@/features/workspace/components/group-multi-select";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { createEntityId } from "@wodge/domain/identifiers";
import { Page } from "@wodge/domain/pages/models";
import { PageSchema } from "@wodge/domain/pages/validation";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function AddPageForm({
  folderId,
  teamId,
  page,
}: {
  folderId?: string;
  teamId: string;
  page?: Page;
}) {
  const { workspaceRep, structure } = useCurrentWorkspace();
  const form = useForm<Page>({
    resolver: zodResolver(PageSchema),
    defaultValues: {
      name: page?.avatar || "",
      avatar: page?.avatar || "",
      editGroups: page?.editGroups || ["team-members"],
      viewGroups: page?.viewGroups || ["team-members"],
      id: page?.id || createEntityId(),
    },
  });

  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    form?.reset(page);
  }, [page, form]);

  async function onSubmit(data: Page) {
    try {
      if (page) {
        await workspaceRep?.mutate.updatePage({
          folderId: folderId || "root-" + teamId,
          teamId,
          ...data,
        });

        return closeRef.current?.click();
      }

      await workspaceRep?.mutate.createPage({
        folderId: folderId || "root-" + teamId,
        teamId,
        ...data,
      });
      form.reset();
      form.setValue("id", createEntityId());
      closeRef.current?.click();
    } catch {
      if (page) {
        toast.error("Page update failed");
      } else {
        toast.error("Page creation failed");
      }
    }
  }

  return (
    <DialogContent className="max-w-80">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 px-1.5"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Page name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="new page" />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="viewGroups"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>View groups</FormLabel>
                  <FormControl>
                    <GroupMultiSelect
                      onChange={field.onChange}
                      baseGroups={structure.groups}
                      preset={page?.viewGroups}
                    />
                  </FormControl>
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="editGroups"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>Edit groups</FormLabel>
                  <FormControl>
                    <GroupMultiSelect
                      onChange={field.onChange}
                      baseGroups={structure.groups}
                      preset={page?.editGroups}
                    />
                  </FormControl>
                </FormItem>
              );
            }}
          />

          <Button type="submit" className="w-full">
            {page ? "Update" : "Create"} page
          </Button>

          <DialogClose asChild>
            <button
              ref={closeRef}
              className="hidden"
              aria-label="close dialog"
            />
          </DialogClose>
        </form>
      </Form>
    </DialogContent>
  );
}
