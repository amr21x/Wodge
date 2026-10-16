import { zodResolver } from "@hookform/resolvers/zod";
import {
  BRAND_COLOR,
  WORKSPACE_GROUP_ID_LENGTH,
  WORKSPACE_TEAM_ID_LENGTH,
} from "@wodge/domain/constants";
import { DrObj, Group, GroupSchema } from "@wodge/data";

import { useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { ColorPicker } from "../color-picker";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { hexToRgb } from "@/lib/utils";
import { useCurrentWorkspace } from "@/components/workspace-provider";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function GroupGeneralForm({ group }: { group?: DrObj<Group> }) {
  const { workspaceRep, workspaceSlug } = useCurrentWorkspace();
  const isAddition = !group;

  const [colored, setColored] = useState(false);
  const router = useRouter();

  const form = useForm<DrObj<Group>>({
    resolver: zodResolver(GroupSchema.omit({ members: true, createdBy: true })),
    defaultValues: {
      id: isAddition ? nanoid(WORKSPACE_TEAM_ID_LENGTH) : group.id,
      name: isAddition ? "" : group.name,
      color: isAddition ? BRAND_COLOR : group.color,
    },
  });

  const formRef = useRef<HTMLFormElement>(null);

  // const { toastId } = useSubmitToast(form, formRef, colored);

  useEffect(() => {
    if (isAddition)
      return form.reset({ id: nanoid(WORKSPACE_GROUP_ID_LENGTH) });

    form.reset(group);
    setColored(false);
  }, [group, isAddition]);

  async function onSubmit(data: Omit<Group, "members" | "createdBy">) {
    let flag = false;
    try {
      if (isAddition) {
        await workspaceRep?.mutate.createGroup(data);

        flag = true;
      }

      if (!isAddition)
        await workspaceRep?.mutate.updateGroup({
          groupId: data.id,
          groupUpdate: {
            action: "updateInfo",
            update: {
              name: data.name,
              color: data.color,
            },
          },
        });

      setColored(false);

      if (flag) router.push(`/${workspaceSlug}/settings/groups/${data.id}`);
    } catch {
      toast.error("Group operation failed");
    }
  }

  return (
    <div className="space-y-2">
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex w-full flex-col gap-4"
        >
          <div className="space-y-2">
            <p className="text-sm">Color & Name</p>

            <div className="flex w-64 items-end gap-2">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} type="hidden" />
                    </FormControl>
                    <ColorPicker
                      key={group?.id}
                      handler={(c) => {
                        form.setValue("color", c);
                        if (c === group?.color) return;
                        setColored(true);
                      }}
                      defaultColor={group?.color || BRAND_COLOR}
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="w-64">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Group Name"
                        style={{
                          backgroundColor: `rgba(${hexToRgb(form.watch("color"))},0.25)`,
                          borderColor: form.watch("color"),
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="id"
            render={({ field }) => (
              <FormItem className="hidden">
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <Button
            className="w-fit"
            disabled={!form.formState.isDirty && !colored}
            size="sm"
          >
            {isAddition ? "Create group" : "Update group"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
