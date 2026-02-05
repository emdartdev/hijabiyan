import * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Frontend-only button styling (soft, feminine 3D feel).
 * Keeps all Button functionality identical; only changes presentation.
 */
export default function SiteButton({ className, ...props }: ButtonProps) {
  return (
    <Button
      {...props}
      className={cn(
        // Shape + depth
        "rounded-xl",
        "shadow-[0_10px_18px_-12px_hsl(var(--primary)/0.45),_0_2px_0_0_hsl(var(--primary)/0.35)]",
        // 3D press interaction
        "transform-gpu transition",
        "hover:-translate-y-0.5 hover:shadow-[0_16px_26px_-18px_hsl(var(--primary)/0.55),_0_3px_0_0_hsl(var(--primary)/0.35)]",
        "active:translate-y-0 active:shadow-[0_8px_14px_-12px_hsl(var(--primary)/0.45),_0_1px_0_0_hsl(var(--primary)/0.30)]",
        // Soft highlight / sheen
        "relative overflow-hidden",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
        "before:bg-[radial-gradient(120%_90%_at_30%_10%,hsl(var(--background)/0.70),transparent_55%)]",
        // Focus
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    />
  );
}
