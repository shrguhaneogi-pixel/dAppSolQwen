"use client";

import { Toaster } from "sonner";

import { AtmoGridProvider } from "@/components/providers/AtmoGridProvider";
import { PhantomProvider } from "@/components/providers/PhantomProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PhantomProvider>
      <AtmoGridProvider>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "!bg-ink-800/95 !border-white/10 !text-zinc-200 !font-sans !shadow-2xl !backdrop-blur",
              title: "!text-zinc-50 !text-[13px] !font-semibold",
              description: "!text-zinc-400 !text-[12px] !font-mono",
              actionButton:
                "!bg-neon-cyan/15 !text-neon-cyan !border !border-neon-cyan/30 !rounded-lg !text-[11px]",
            },
          }}
        />
      </AtmoGridProvider>
    </PhantomProvider>
  );
}
