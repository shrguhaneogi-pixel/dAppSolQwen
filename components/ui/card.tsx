import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass glass-top p-5", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex items-start justify-between gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-[15px] font-semibold tracking-tight text-zinc-100", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-[13px] leading-relaxed text-zinc-500", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-5", className)} {...props} />;
}

export function Badge({
  children,
  className,
  tone = "neutral",
  dot,
}: {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "cyan" | "mint" | "amber" | "rose" | "violet";
  dot?: boolean;
}) {
  const tones: Record<string, string> = {
    neutral: "border-white/10 bg-white/[0.03] text-zinc-400",
    cyan: "border-neon-cyan/25 bg-neon-cyan/[0.07] text-neon-cyan",
    mint: "border-neon-mint/25 bg-neon-mint/[0.07] text-neon-mint",
    amber: "border-amber-400/25 bg-amber-400/[0.07] text-amber-300",
    rose: "border-rose-400/25 bg-rose-400/[0.07] text-rose-300",
    violet: "border-neon-violet/25 bg-neon-violet/[0.07] text-neon-violet",
  };
  return (
    <span className={cn("chip", tones[tone], className)}>
      {dot ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-breathe rounded-full bg-current opacity-70" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {children}
    </span>
  );
}
