import { GroupMultiSelect } from "@/components/group-multi-select";
import { zodResolver } from "@hookform/resolvers/zod";
import { Channel, ChannelSchema } from "@wodge/domain/channels";
import { ID_LENGTH } from "@wodge/domain/constants";
import { Page, PageSchema } from "@wodge/domain/pages";
import { Room, RoomSchema, Thread, ThreadSchema } from "@wodge/data";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PopoverClose } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentWorkspace } from "@/components/workspace-provider";
import { nanoid } from "nanoid";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function AddThreadForm({
  folderId,
  teamId,
  thread,
}: {
  folderId?: string;
  teamId: string;
  thread?: Thread;
}) {
  const { workspaceRep, structure } = useCurrentWorkspace();
  const form = useForm<Thread>({
    resolver: zodResolver(ThreadSchema),
    defaultValues: {
      name: thread?.name || "",
      avatar: thread?.avatar || "",
      id: thread?.id || nanoid(ID_LENGTH),
    },
  });

  const closeRef = useRef<HTMLButtonElement>(null);

  async function onSubmit(data: Thread) {
    try {
      if (thread) {
        await workspaceRep?.mutate.updateThread({
          teamId,
          ...data,
        });
        return closeRef.current?.click();
      }

      await workspaceRep?.mutate.createThread({
        teamId,

        ...data,
      });
      form.reset();
      form.setValue("id", nanoid(ID_LENGTH));
      closeRef.current?.click();
    } catch {
      if (thread) toast.error("Thread update failed");
      else toast.error("Thread creation failed");
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
                <FormLabel>Thread name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="new room" />
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full">
            {thread ? "Update" : "Create"} thread
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
