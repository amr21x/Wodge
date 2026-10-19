"use client";

import { Outro, Themes, Welcome } from "./screening";
import { CompleteProfileWrapper } from "./complete-profile-wrapper";
import { useOnboarding } from "./onboarding-context";
import Link from "next/link";
import {
  NextBtn,
  Step,
  Stepper,
  StepperContainer,
} from "@/components/ui/stepper";
import { Loader } from "@/components/ui/loader";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function OnboardingSteps() {
  const { isPending } = useOnboarding();
  const router = useRouter();

  return (
    <Stepper className="z-20 max-w-lg">
      <StepperContainer>
        <Step index={1}>
          <Welcome />
          <NextBtn className="w-4/6">Continue</NextBtn>
        </Step>
        <Step index={2}>
          <CompleteProfileWrapper />
          <NextBtn
            className="w-4/6"
            onClick={() => {}}
            type="submit"
            form="profile-form"
            disabled={isPending}
          >
            {isPending ? (
              <Loader color="hsl(var(--primary-foreground))" />
            ) : (
              "Continue"
            )}
          </NextBtn>
        </Step>
        <Step index={3}>
          <Themes />
          <NextBtn className="w-4/6">Continue</NextBtn>
        </Step>
        <Step index={4}>
          <Outro />

          <Button className="w-4/6" asChild>
            <Link href={DEFAULT_LOGIN_REDIRECT}>Get started</Link>
          </Button>
        </Step>
      </StepperContainer>
    </Stepper>
  );
}
