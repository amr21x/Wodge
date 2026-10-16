"use client";

import { Logo } from "@/components/logo";
import { LoginWrapper } from "@/app/(auth)/login/login-wrapper";
import { useEffect } from "react";
import {
  localStoragePersister,
  queryClient,
} from "@wodge/data/lib/query-client";
import { env } from "@wodge/env";

function LoginPage() {
  useEffect(() => {
    queryClient.clear();
    localStoragePersister.removeClient();
  }, []);

  return (
    <main className="bg-page flex h-full min-h-screen w-screen flex-col items-center justify-center space-y-3 overflow-y-auto overflow-x-hidden py-8 bg-grid-black/[0.2] dark:bg-grid-white/[0.2]">
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background  opacity-85 [mask-image:radial-gradient(ellipse_at_center)]" />

      <Logo />
      <LoginWrapper />
    </main>
  );
}

export default LoginPage;
