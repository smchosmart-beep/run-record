import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // 파랑 → 네이비 그라데이션 (주요 액션)
        default: "bg-gradient-to-r from-[hsl(200,98%,45%)] to-[hsl(220,60%,25%)] text-white hover:from-[hsl(200,98%,40%)] hover:to-[hsl(220,60%,20%)] shadow-lg hover:shadow-xl duration-300",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // 네이비 → 파랑 그라데이션 (보조 액션)
        outline: "border-2 border-[hsl(200,98%,45%)] bg-transparent text-[hsl(200,98%,40%)] hover:bg-gradient-to-r hover:from-[hsl(220,60%,25%)] hover:to-[hsl(200,98%,45%)] hover:text-white hover:border-transparent duration-300",
        secondary: "bg-gradient-to-r from-[hsl(220,60%,25%)] to-[hsl(200,98%,45%)] text-white hover:from-[hsl(220,60%,20%)] hover:to-[hsl(200,98%,40%)] shadow-lg hover:shadow-xl duration-300",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // 파랑 → 네이비 그라데이션
        accent: "bg-gradient-to-r from-[hsl(200,98%,45%)] to-[hsl(220,60%,25%)] text-white hover:from-[hsl(200,98%,40%)] hover:to-[hsl(220,60%,20%)] shadow-lg hover:shadow-xl duration-300",
        success: "bg-gradient-to-r from-[hsl(200,98%,45%)] to-[hsl(220,60%,25%)] text-white hover:from-[hsl(200,98%,40%)] hover:to-[hsl(220,60%,20%)] shadow-lg hover:shadow-xl duration-300",
        gold: "bg-gold text-gold-foreground hover:bg-gold/90 shadow-lg hover:shadow-xl duration-300 font-semibold",
        silver: "bg-silver text-silver-foreground hover:bg-silver/90 shadow-lg hover:shadow-xl duration-300 font-semibold",
        bronze: "bg-bronze text-bronze-foreground hover:bg-bronze/90 shadow-lg hover:shadow-xl duration-300 font-semibold",
        // 파랑 → 네이비 그라데이션 (CTA)
        speed: "bg-gradient-to-r from-[hsl(200,98%,45%)] to-[hsl(220,60%,25%)] text-white hover:from-[hsl(200,98%,40%)] hover:to-[hsl(220,60%,20%)] shadow-lg hover:shadow-xl duration-300 font-medium",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
