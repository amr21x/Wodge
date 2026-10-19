"use client";

import * as React from "react";
import { LucideIcon } from "lucide-react";
import { IconType } from "react-icons/lib";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils/index";
import Link from "next/link";

interface SidebarItemBtnProps extends ButtonProps {
  Icon?: LucideIcon | IconType;
  iconClassName?: string;
  isVisible?: () => boolean;
  sr?: string;
  href?: string;
}

export const SidebarItemBtn = React.forwardRef<
  HTMLButtonElement,
  SidebarItemBtnProps
>(
  (
    {
      className,
      Icon,
      iconClassName,
      isVisible = () => true,
      children,
      sr,
      onClick,
      href,
      ...props
    },
    ref,
  ) => {
    let jsx = (
      <>
        <span className="sr-only">{sr || "sidebar item action"}</span>
        {Icon && (
          <Icon
            className={cn(
              "h-4 w-4 opacity-60 transition-opacity group-hover/sidebtn:opacity-100",
              iconClassName,
            )}
          />
        )}
        {children}
      </>
    );

    if (href) {
      jsx = <Link href={href}>{jsx}</Link>;
    }

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="fit"
        className={cn(
          "group/sidebtn z-20 aria-expanded:visible aria-expanded:text-accent-foreground",
          !isVisible() && "invisible",
          className,
        )}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        {...props}
        {...(href && { asChild: true })}
      >
        {jsx}
      </Button>
    );
  },
);
