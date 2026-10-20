"use client";

import Link from "next/link";
import { Button } from "./ui/button";

export function RecoveryScreen({ reset }: { reset: () => void }) {
  return (
    <main role="alert" className="space-y-4 p-6">
      <h1>We could not load Wodge.</h1>
      <p>
        Check your connection and try loading it again. Pending local edits have
        not been deleted.
      </p>
      <Button onClick={reset}>Try again</Button>
      <Link className="ml-4 underline" href="/">
        Choose workspace
      </Link>
    </main>
  );
}
