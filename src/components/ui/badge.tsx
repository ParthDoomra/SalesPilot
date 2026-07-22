import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-signal-soft text-signal border-transparent",
        success: "bg-success-soft text-success border-transparent",
        warning: "bg-amber-soft text-amber border-transparent",
        danger: "bg-danger-soft text-danger border-transparent",
        outline: "border-border-default text-muted-foreground bg-transparent",
        neutral: "bg-surface-raised text-muted-foreground border-border-subtle",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
