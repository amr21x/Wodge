"use client";

import { OnboardingProvider } from "@/features/auth/components/onboarding-context";
import { OnboardingSteps } from "@/features/auth/components/onboarding-steps";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";

function OnboardingPage() {
  const { user } = useCurrentUser();

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-grid-black/[0.2] dark:bg-grid-white/[0.2]">
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background opacity-85 [mask-image:radial-gradient(ellipse_at_center)]" />
      <OnboardingProvider user={user}>
        <OnboardingSteps />
        {/* <EmailFor */}
      </OnboardingProvider>
    </div>
  );
}

export default OnboardingPage;
