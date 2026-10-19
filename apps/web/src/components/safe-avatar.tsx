"use client";

import { forwardRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";

interface SafeAvatarProps {
  src?: string | null;
  fallback?: string | null;
  className?: string;
  fallbackClassName?: string;
  isBlob?: boolean;
  color?: string;
}

export const SafeAvatar = forwardRef<HTMLDivElement, SafeAvatarProps>(
  (
    { src, className, fallback, fallbackClassName, color }: SafeAvatarProps,
    ref,
  ) => {
    return (
      <>
        {src && (
          <Avatar
            ref={ref}
            className={cn(
              "h-12 w-12 rounded-full ring-[1.5px] ring-primary/30",
              className,
            )}
            {...(color && {
              style: {
                "--tw-ring-color": color,
              } as React.CSSProperties,
            })}
          >
            <AvatarImage src={src} alt={fallback || ""} />
            <AvatarFallback className={"capitalize " + fallbackClassName}>
              {fallback?.[0]}
            </AvatarFallback>
          </Avatar>
        )}
        {!src && (
          <Avatar
            ref={ref}
            className={cn(
              "h-12 w-12 rounded-full ring-[1.5px] ring-primary/30",
              className,
            )}
            {...(color && {
              style: {
                "--tw-ring-color": color,
              } as React.CSSProperties,
            })}
          >
            <AvatarFallback className={"capitalize " + fallbackClassName}>
              {fallback?.[0]}
            </AvatarFallback>
          </Avatar>
        )}
      </>
    );
  },
);
