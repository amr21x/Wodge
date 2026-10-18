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
import { Room } from "@wodge/domain/rooms/models";
import { RoomSchema } from "@wodge/domain/rooms/validation";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function AddRoomForm({
  folderId,
  teamId,
  room,
}: {
  folderId?: string;
  teamId: string;
  room?: Room;
}) {
  const { workspaceRep, structure } = useCurrentWorkspace();
  const form = useForm<Room>({
    resolver: zodResolver(RoomSchema),
    defaultValues: {
      name: room?.name || "",
      avatar: room?.avatar || "",
      editGroups: room?.editGroups || ["team-members"],
      viewGroups: room?.viewGroups || ["team-members"],
      id: room?.id || createEntityId(),
    },
  });

  const closeRef = useRef<HTMLButtonElement>(null);

  async function onSubmit(data: Room) {
    try {
      if (room) {
        await workspaceRep?.mutate.updateRoom({
          teamId,
          ...data,
        });

        return closeRef.current?.click();
      }

      await workspaceRep?.mutate.createRoom({
        teamId,
        ...data,
      });
      form.reset();
      form.setValue("id", createEntityId());
      closeRef.current?.click();
    } catch {
      if (room) {
        toast.error("Room update failed");
      } else {
        toast.error("Room creation failed");
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
                <FormLabel>Room name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="new room" />
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
                      preset={room?.viewGroups}
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
                      preset={room?.editGroups}
                    />
                  </FormControl>
                </FormItem>
              );
            }}
          />

          <Button type="submit" className="w-full">
            {room ? "Update" : "Create"} room
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
