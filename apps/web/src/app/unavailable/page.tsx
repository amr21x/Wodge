"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { safeRedirect } from "@/features/auth/redirect";
import { Button } from "@/components/ui/button";

export default function UnavailablePage() {
  const params = useSearchParams();
  const destination = safeRedirect(params.get("returnTo"));
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">
        Wodge is temporarily unavailable
      </h1>
      <p role="alert">
        We could not verify your session. Check your connection and try again.
        Pending local edits have been kept.
      </p>
      <Button onClick={() => window.location.assign(destination)}>
        Try again
      </Button>
      <Link href="/login" className="underline">
        Go to sign in
      </Link>
    </main>
  );
}
