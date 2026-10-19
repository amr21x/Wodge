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
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { Folder } from "@wodge/domain/workspace/models";
import { FolderSchema } from "@wodge/domain/workspace/validation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEntityId } from "@wodge/domain/identifiers";
import { useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function AddFolderForm({
  teamId,
  folder,
  parentOverride,
}: {
  teamId: string;
  folder?: Folder;
  parentOverride?: string;
}) {
  const { workspaceRep, structure } = useCurrentWorkspace();
  const form = useForm<Folder>({
    resolver: zodResolver(FolderSchema),
    defaultValues: {
      name: folder?.name || "",
      id: folder?.id || createEntityId(),
      channels: folder?.channels || [],
      parentFolder: folder?.parentFolder || parentOverride || "",
    },
  });

  const closeRef = useRef<HTMLButtonElement>(null);

  const team = useMemo(
    () => structure.teams.find((t) => t.id === teamId),
    [structure.teams, teamId],
  );

  async function onSubmit(data: Folder) {
    try {
      if (folder) {
        await workspaceRep?.mutate.updateFolder({
          teamId,
          ...data,
        });

        return closeRef.current?.click();
      }

      await workspaceRep?.mutate.updateTeam({
        teamId,
        teamUpdate: {
          action: "addFolder",
          update: { folder: data },
        },
      });

      form.reset();
      form.setValue("id", createEntityId());
      closeRef.current?.click();
    } catch {
      if (folder) {
        toast.error("Folder update failed");
      } else {
        toast.error("Folder creation failed");
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
                <FormLabel>Folder name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="new folder" />
                </FormControl>
              </FormItem>
            )}
          />

          {/* <FormField
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
                    />
                  </FormControl>
                </FormItem>
              );
            }}
          /> */}

          <FormField
            control={form.control}
            name="parentFolder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent folder</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Assign a parent folder" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {team?.folders
                      .filter((f) => f.id !== folder?.id)
                      .map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.id.startsWith("root-") ? "Root" : f.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full">
            {folder ? "Update" : "Create"} folder
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
