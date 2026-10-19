"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Component({
  params: { workspaceSlug },
}: {
  params: { workspaceSlug: string };
}) {
  const [countdown, setCountdown] = useState(5);

  const router = useRouter();

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
          <CircleXIcon className="h-10 w-10 text-red-500 dark:text-red-400" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Payment Unsuccessful
        </h1>
        <p className="mt-4 text-muted-foreground">
          We're sorry, but your payment was not successful. Please try again or
          contact support if you have any issues.
        </p>
        <div className="mt-6">
          <Button
            size="sm"
            disabled={countdown > 0}
            onClick={() => router.push(`/${workspaceSlug}/settings/upgrade`)}
          >
            {countdown === 0
              ? "Back to workspace"
              : `Redirecting in ${countdown} seconds`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CircleXIcon(
  props: React.SVGProps<SVGSVGElement> & { className?: string },
) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}
