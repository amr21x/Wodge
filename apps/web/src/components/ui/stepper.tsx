"use client";

import { cn } from "@/lib/utils";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Button, ButtonProps } from "./button";

interface StepsProps {
  index: number;
  children: React.ReactNode;
  className?: string;
}

interface StepperProps {
  children?: React.ReactNode;
  startStep?: number;
  className?: string;
}

interface StepperContextValues {
  currentStep: number;
  count: React.MutableRefObject<number>;
  nextStep: () => void;
  prevStep: () => void;
}

const Context = createContext<StepperContextValues | null>(null);

export function Stepper({ children, startStep, className }: StepperProps) {
  const [currentStep, setCurrentStep] = useState(startStep || 1);
  const count = useRef(0);

  const nextStep = () =>
    setCurrentStep((s) => (s === count.current ? s : s + 1));
  const prevStep = () => setCurrentStep((s) => (s === 1 ? s : s - 1));

  return (
    <Context.Provider value={{ currentStep, nextStep, prevStep, count }}>
      <div className={className}>{children}</div>
    </Context.Provider>
  );
}

export function StepperContainer({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex items-center", className)}>{children}</div>;
}

export function useStepper() {
  const context = useContext(Context);

  if (!context) {
    throw new Error("useStepper must be used within a Stepper");
  }

  return context;
}

export function Step({ index, children, className }: StepsProps) {
  const { currentStep, count } = useStepper();

  useEffect(() => {
    count.current++;

    return () => {
      count.current--;
    };
  }, []);

  return (
    <div
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full transition-all",
        "flex flex-col items-center gap-8",
        currentStep === index ? "visible opacity-100" : "visible opacity-0",
        className,
      )}
      style={{
        transform:
          currentStep > index
            ? `translateX(-${index * 100}%)`
            : currentStep === index
              ? `translateX(-${(index - 1) * 100}%)`
              : `translateX(${0}%)`,
      }}
    >
      {children}
    </div>
  );
}

export function NextBtn({ children, className, ...props }: ButtonProps) {
  const { nextStep } = useStepper();

  return (
    <Button onClick={() => nextStep()} className={className} {...props}>
      {children}
    </Button>
  );
}

export function PrevBtn({ children, className, ...props }: ButtonProps) {
  const { prevStep } = useStepper();

  return (
    <Button onClick={() => prevStep()} className={className} {...props}>
      {children}
    </Button>
  );
}
