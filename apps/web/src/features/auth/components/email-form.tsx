import { authClient } from "@/features/auth/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/loader";
import { useStepper } from "@/components/ui/stepper";
import { toast } from "@/components/ui/toast";
import { useAtom, useSetAtom } from "jotai";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { emailAtom } from "./email-atom";

const EmailFormSchema = z.object({
  email: z.string().email(),
});

export function EmailForm() {
  const [isPending, setIsPending] = useState(false);
  const [successOTP, setSuccessOTP] = useState(false);
  const [emailAtomVal, setEmailAtom] = useAtom(emailAtom);

  const { nextStep } = useStepper();

  // Form definition
  const form = useForm<z.infer<typeof EmailFormSchema>>({
    resolver: zodResolver(EmailFormSchema),
    defaultValues: {
      email: emailAtomVal || "",
    },
  });

  // Submit handler with type-safe and validated values

  async function onSubmit(values: z.infer<typeof EmailFormSchema>) {
    setIsPending(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: values.email,
      type: "sign-in",
    });

    if (!error) {
      toast.success("OTP sent! Check your inbox.");
      setEmailAtom(values.email);
      nextStep();
    } else {
      toast.error("An error occurred. Please try again.");
    }

    setIsPending(false);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-3"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              {/* <FormLabel className="text-muted-foreground">Email</FormLabel> */}
              <FormControl>
                <Input {...field} className="bg-background" label="Email" />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <Loader color="hsl(var(--primary-foreground))" />
          ) : (
            "Continue with email"
          )}
        </Button>
      </form>
    </Form>
  );
}
