import { FeatureGate } from "@/components/feature-flags-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { JoinWorkspaceSchema } from "@wodge/domain/workspace/validation";

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
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

function JoinWorkspaceFormContent() {
  const form = useForm<z.infer<typeof JoinWorkspaceSchema>>({
    resolver: zodResolver(JoinWorkspaceSchema),
    defaultValues: {
      url: "",
    },
  });

  const router = useRouter();

  useQueryClient();

  async function onSubmit(data: z.infer<typeof JoinWorkspaceSchema>) {
    const url = new URL(data.url, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      !/^\/[^/]+\/join\/[^/]+$/.test(url.pathname)
    ) {
      form.setError("url", {
        message: "Enter an invitation link for this Wodge site.",
      });
      return;
    }
    router.push(url.pathname);
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
              <FormMessage />
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

export function JoinWorkspaceForm() {
  return (
    <FeatureGate feature="membership">
      <JoinWorkspaceFormContent />
    </FeatureGate>
  );
}
