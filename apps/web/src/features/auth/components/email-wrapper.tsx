"use client";

import { Step, Stepper, StepperContainer } from "@/components/ui/stepper";
import { EmailForm } from "./email-form";
import { OTP } from "./otp";

export function EmailWrapper() {
  return (
    <Stepper>
      <StepperContainer className="">
        <Step index={1} className="p-0.5">
          <EmailForm />
        </Step>
        <Step index={2} className="w-full p-0.5">
          <OTP />
        </Step>
      </StepperContainer>
    </Stepper>
  );
}
