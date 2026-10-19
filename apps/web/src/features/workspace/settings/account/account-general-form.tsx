import { api } from "@/client/api";
import { FeatureGate } from "@/components/feature-flags-provider";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { PublicUserSchema } from "@wodge/domain/user/validation";
import { PublicUserType } from "@wodge/domain/user/models";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

import { toast } from "@/components/ui/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/features/account/hooks/use-current-user";

function AccountGeneralFormContent() {
  const queryClient = useQueryClient();

  const { user } = useCurrentUser();

  const form = useForm<PublicUserType>({
    resolver: zodResolver(
      PublicUserSchema.pick({
        username: true,
        displayName: true,
      }),
    ),
    defaultValues: {
      username: user?.username || "",
      displayName: user?.displayName || "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username as string,
        displayName: user.displayName as string,
      });
    }
  }, [user, form]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (
      data: Pick<PublicUserType, "username" | "displayName">,
    ) => {
      const response = await api.api.users.update.$post({ json: data });
      if (!response.ok) throw new Error("Account update failed");

      return data;
    },
    onSuccess: (_data) => {
      toast.success("Account updated");
      queryClient.invalidateQueries({
        queryKey: ["user"],
      });
    },
    onError() {
      toast.error("Account update failed");
    },
  });

  async function onSubmit(
    data: Pick<PublicUserType, "username" | "displayName">,
  ) {
    mutate(data);
    form.reset(data);
  }

  return (
    <div className="space-y-2">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex w-full flex-col gap-4"
        >
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input {...field} className="w-2/5" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} className="w-2/5" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            className="w-32"
            disabled={!form.formState.isDirty || isPending}
            size="sm"
            isPending={isPending}
          >
            Update account
          </Button>
        </form>
      </Form>
    </div>
  );
}

export function AccountGeneralForm() {
  return (
    <FeatureGate feature="profiles">
      <AccountGeneralFormContent />
    </FeatureGate>
  );
}
