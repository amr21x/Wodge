"use client";

import type { UserType } from "@wodge/domain/user/models";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useTransition } from "react";

interface ContextValues {
  user: UserType;
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
}

const Context = createContext<ContextValues | null>(null);

export function OnboardingProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: UserType;
}) {
  const [isPending, startTransition] = useTransition();

  useQueryClient();

  // useEffect(() => {
  //   queryClient.invalidateQueries({
  //     queryKey: ["user"],
  //   });
  // }, []);

  return (
    <Context.Provider
      value={{
        user,
        isPending,
        startTransition,
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
