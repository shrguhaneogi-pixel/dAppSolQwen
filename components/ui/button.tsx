import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  cn(
    "relative inline-flex select-none items-center justify-center gap-2 overflow-hidden",
    "rounded-xl font-medium tracking-tight outline-none transition-all duration-200",
    "focus-visible:ring-2 focus-visible:ring-neon-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
    "disabled:pointer-events-none disabled:opacity-45 active:scale-[0.985]",
  ),
  {
    variants: {
      variant: {
        primary: cn(
          "bg-gradient-to-b from-neon-cyan to-[#0e9db8] text-ink-950 font-semibold",
          "shadow-[0_10px_40px_-12px_rgba(34,211,238,0.75)] hover:from-white hover:to-neon-cyan",
        ),
        mint: cn(
          "bg-gradient-to-b from-neon-mint to-[#12a578] text-ink-950 font-semibold",
          "shadow-[0_10px_40px_-12px_rgba(34,227,154,0.8)] hover:from-white hover:to-neon-mint",
        ),
        ghost: cn(
          "border border-white/10 bg-white/[0.03] text-zinc-200 backdrop-blur",
          "hover:border-neon-cyan/40 hover:bg-neon-cyan/[0.07] hover:text-white",
        ),
        outline: cn(
          "border border-neon-mint/35 bg-neon-mint/[0.06] text-neon-mint",
          "hover:bg-neon-mint/[0.14] hover:text-white",
        ),
        subtle: "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-[15px]",
        xl: "h-14 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
