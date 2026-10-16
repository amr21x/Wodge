import { zodResolver } from "@hookform/resolvers/zod";
import { JoinWorkspaceSchema } from "@wodge/data";

import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { useQueryClient } from "@tanstack/react-query";

export function JoinWorkspaceForm() {
  const form = useForm<z.infer<typeof JoinWorkspaceSchema>>({
    resolver: zodResolver(JoinWorkspaceSchema),
    defaultValues: {
      url: "",
    },
  });

  const router = useRouter();

  const queryClient = useQueryClient();

  async function onSubmit(data: z.infer<typeof JoinWorkspaceSchema>) {
    router.push(data.url);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-3 flex flex-col gap-4 px-2"
      >
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invite link</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="w-full"
                  placeholder={"https://domain.com/" + nanoid(6)}
                />
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
          <Button type="submit" className="basis-2/3">
            Join Workspace
          </Button>
        </div>
      </form>
    </Form>
  );
}
