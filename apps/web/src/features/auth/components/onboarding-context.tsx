"use client";

import type { UserType } from "@wodge/domain/user/models";

import { createContext, useContext, useState } from "react";

interface ContextValues {
  user: UserType;
  isPending: boolean;
  setIsPending: (pending: boolean) => void;
}

const Context = createContext<ContextValues | null>(null);

export function OnboardingProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: UserType;
}) {
  const [isPending, setIsPending] = useState(false);

  return (
    <Context.Provider
      value={{
        user,
        isPending,
        setIsPending,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(Context);

  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }

  return context;
}
