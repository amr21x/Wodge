import { zodResolver } from "@hookform/resolvers/zod";
import { DrObj } from "@wodge/domain/types";
import { Team } from "@wodge/domain/workspace/models";
import { TeamSchema } from "@wodge/domain/workspace/validation";

import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createEntityId } from "@wodge/domain/identifiers";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

import { SafeAvatar } from "@/components/safe-avatar";
import { Button } from "@/components/ui/button";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function TeamGeneralForm({ team }: { team?: DrObj<Team> }) {
  const { workspaceRep, workspaceSlug } = useCurrentWorkspace();
  const isAddition = !team;
  const router = useRouter();

  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<DrObj<Team>>({
    resolver: zodResolver(
      TeamSchema.pick({ name: true, id: true, avatar: true }),
    ),
    defaultValues: {
      id: isAddition ? createEntityId() : team?.id,
      name: isAddition ? "" : team?.name,
      avatar: isAddition ? "" : team?.avatar,
    },
  });

  // const { toastId } = useSubmitToast(form, formRef);

  useEffect(() => {
    if (isAddition) {
      return form.reset({
        id: createEntityId(),
      });
    }

    form.reset(team);
  }, [team, isAddition, form]);

  async function onSubmit(data: Pick<Team, "id" | "name" | "avatar">) {
    let flag = false;

    try {
      if (isAddition) {
        await workspaceRep?.mutate.createTeam(data);
        flag = true;
      }

      if (!isAddition) {
        await workspaceRep?.mutate.updateTeam({
          teamId: team.id,
          teamUpdate: {
            action: "updateInfo",
            update: {
              name: data.name,
              avatar: data.avatar,
            },
          },
        });
      }

      form.reset();
      if (flag) {
        router.push(`/${workspaceSlug}/settings/teams/${data.id}`);
      }
    } catch {
      if (isAddition) {
        toast.error("Failed to create team");
      } else {
        toast.error("Failed to update team");
      }
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        ref={formRef}
        className="flex w-full flex-col gap-4"
      >
        <div className="space-y-2">
          <p className="text-sm">Icon & Name</p>

          <div className="flex w-64 items-center gap-2">
            <SafeAvatar
              src={team?.avatar}
              fallback={form.watch("name")?.[0] || ""}
              className="h-7 w-7 rounded-md"
              fallbackClassName="rounded-md"
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="">
                  <FormControl>
                    <Input {...field} className="" placeholder="Team Name" />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem className="w-64">
              <FormLabel>Team slug</FormLabel>
              <FormControl>
                <Input {...field} className="" placeholder="Team Name" />
              </FormControl>
            </FormItem>
          )}
        /> */}

        <Button className="w-fit" disabled={!form.formState.isDirty} size="sm">
          {isAddition ? "Create team" : "Update team"}
        </Button>
      </form>
    </Form>
  );
}
