import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-extrabold tracking-wide uppercase ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-white hover:bg-amber-50 text-slate-700 border-2 border-amber-100 shadow-[0_3px_0_0_#f1e6c7] active:translate-y-[1px] active:shadow-[0_1px_0_0_#f1e6c7]",

        defaultOutline:
          "bg-transparent hover:bg-amber-50 text-slate-700 border border-amber-100 shadow-none",

        primary:
          "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white border-2 border-emerald-700 shadow-[0_4px_0_0_#065f46] active:translate-y-[1px] active:shadow-[0_2px_0_0_#065f46]",

        primaryOutline: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200",

        secondary:
          "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white border-2 border-blue-700 shadow-[0_4px_0_0_#1e3a8a] active:translate-y-[1px] active:shadow-[0_2px_0_0_#1e3a8a]",

        secondaryOutline: "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200",

        danger:
          "bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white border-2 border-rose-700 shadow-[0_4px_0_0_#9f1239] active:translate-y-[1px] active:shadow-[0_2px_0_0_#9f1239]",

        dangerOutline: "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200",

        super:
          "bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-slate-900 border-2 border-orange-600 shadow-[0_4px_0_0_#c2410c] active:translate-y-[1px] active:shadow-[0_2px_0_0_#c2410c]",

        superOutline: "bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200",

        sidebar:
          "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-2 border-emerald-200 shadow-none",

        sidebarOutline:
          "bg-transparent hover:bg-amber-50 text-slate-600 border-2 border-transparent shadow-none",

        locked:
          "bg-neutral-200 hover:bg-neutral-200/90 text-neutral-500 border-2 border-neutral-300 shadow-[0_3px_0_0_#a3a3a3] active:translate-y-[1px] active:shadow-[0_1px_0_0_#a3a3a3]",
      },
      size: {
        sm: "h-9 px-3",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
        rounded: "rounded-full",
        default: "h-11 px-4 py-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
