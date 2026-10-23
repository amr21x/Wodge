"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import * as React from "react";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleTrigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleTrigger>
>(({ ...props }, ref) => {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      className="group/collapsible"
      ref={ref}
      {...props}
    />
  );
});

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ ...props }, ref) => {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      className="overflow-hidden transition-all data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down"
      ref={ref}
      {...props}
    />
  );
});

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
