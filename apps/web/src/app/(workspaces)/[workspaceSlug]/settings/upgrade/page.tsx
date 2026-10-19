"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { cn } from "@/lib/utils";
import { Workspace } from "@wodge/domain/workspace/models";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type PricingCardProps = {
  title: string;
  monthlyPrice?: number;
  description: string;
  features: string[];
  actionLabel: string;
  popular?: boolean;
  exclusive?: boolean;
  disabled?: Workspace["isPremium"];
  action: () => void;
  isLoading?: boolean;
};

const PricingHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <section className="text-center">
    <h2 className="text-3xl font-bold">{title}</h2>
    <p className="pt-1 text-xl">{subtitle}</p>
    <br />
  </section>
);

const PricingCard = ({
  title,
  monthlyPrice,
  description,
  features,
  actionLabel,
  popular,
  exclusive,
  disabled,
  action,
  isLoading,
}: PricingCardProps) => (
  <Card
    className={cn(
      `flex w-72 flex-col justify-between py-1 ${popular ? "border-rose-400" : "border-zinc-700"} mx-auto sm:mx-0`,
      {
        "animate-background-shine bg-white bg-[length:200%_100%] transition-colors dark:bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)]":
          exclusive,
      },
    )}
  >
    <div>
      <CardHeader className="pb-8 pt-4">
        <CardTitle className="text-lg text-foreground">{title}</CardTitle>
        <div className="flex gap-0.5">
          <h3 className="text-3xl font-bold">
            {monthlyPrice ? "$" + monthlyPrice : "Free"}
          </h3>
          <span className="mb-1 flex flex-col justify-end text-sm">
            {monthlyPrice ? "/month" : null}
          </span>
        </div>
        <CardDescription className="h-12 pt-1.5">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {features.map((feature: string) => (
          <CheckItem key={feature} text={feature} />
        ))}
      </CardContent>
    </div>
    <CardFooter className="mt-2">
      <Button
        isPending={isLoading}
        disabled={!!disabled}
        className="relative inline-flex w-full items-center justify-center rounded-md bg-black px-6 font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 dark:bg-white dark:text-black"
        onClick={() => action()}
      >
        {/* <div className="absolute -inset-0.5 -z-10 rounded-lg bg-gradient-to-b from-[#c7d2fe] to-[#8678f9] opacity-75 blur" /> */}
        {actionLabel}
      </Button>
    </CardFooter>
  </Card>
);

const CheckItem = ({ text }: { text: string }) => (
  <div className="flex gap-2">
    <CheckCircle2 size={18} className="my-auto text-green-400" />
    <p className="pt-0.5 text-sm text-zinc-700 dark:text-zinc-300">{text}</p>
  </div>
);

function UpgradePage() {
  const { workspace } = useCurrentWorkspace();

  const { mutate: upgrade, isPending: isUpgrading } = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/workspaces/${workspace?.id}/billing/checkout`,
      );

      if (!res.ok) {
        throw new Error("Failed to upgrade");
      }

      const data = await res.json<{ url: string }>();

      router.push(data.url);
    },

    onError: (_e) => {
      toast.error("Failed to upgrade");
    },
  });

  const { mutate: revert, isPending: isReverting } = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/workspaces/${workspace?.id}/billing/portal`,
      );

      if (!res.ok) {
        throw new Error("Failed to revert");
      }

      const data = await res.json<{ url: string }>();

      router.push(data.url);
    },

    onError: (_e) => {
      toast.error("Failed to revert");
    },
  });

  const router = useRouter();

  if (!workspace) {
    return null;
  }

  const plans = [
    {
      title: "Basic",
      monthlyPrice: 0,
      description: "Essential features you need to get started",
      features: ["Storage up to 5GB", "Maximum 10 members"],
      actionLabel: workspace?.isPremium ? "Revert" : "Current Plan",
      disabled: !workspace?.isPremium,
      action: revert,
      isLoading: isReverting,
    },
    {
      title: "Pro",
      monthlyPrice: 50,
      description: "Perfect for owners of small & medium businesses",
      features: ["Storage up to 100GB", "Up to 50 members"],
      actionLabel: workspace?.isPremium ? "Current Plan" : "Upgrade",
      exclusive: true,
      disabled: workspace?.isPremium,
      action: upgrade,

      isLoading: isUpgrading,
    },
  ];

  return (
    <div className="py-4">
      <PricingHeader
        title="Pricing Plans"
        subtitle="Choose the plan that's right for you"
      />
      <section className="mt-4 flex flex-col justify-center gap-6 sm:flex-row sm:flex-wrap">
        {plans.map((plan) => {
          return <PricingCard key={plan.title} {...plan} />;
        })}
      </section>
      <div className="invisible h-6" />
    </div>
  );
}

export default UpgradePage;
