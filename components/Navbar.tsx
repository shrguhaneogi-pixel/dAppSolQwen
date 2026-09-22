"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Globe, LoaderCircle, Unplug, Wallet } from "lucide-react";

import { usePhantom } from "@/components/providers/PhantomProvider";
import { useAtmoGrid } from "@/components/providers/AtmoGridProvider";
import { Button } from "@/components/ui/button";
import { CHAIN_LABEL, explorerAddress, PROGRAM_ID } from "@/lib/config";
import { cn, shortAddress } from "@/lib/utils";

function CopyAddress({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(
          () => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          },
          () => undefined,
        );
      }}
      className="mono flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-zinc-300 transition hover:bg-white/5 hover:text-white"
      title="Copy wallet address"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-neon-mint" /> : <Copy className="h-3.5 w-3.5" />}
      {shortAddress(value, 4, 4)}
    </button>
  );
}

export function Navbar() {
  const { connected, connecting, installed, connect, disconnect, walletAddress } = usePhantom();
  const { mode } = useAtmoGrid();
  const [busy, setBusy] = useState(false);

  const onConnect = async () => {
    if (!installed) {
      window.open("https://phantom.app/download", "_blank", "noopener,noreferrer");
      return;
    }
    setBusy(true);
    await connect();
    setBusy(false);
  };

  return (
    <motion.header
      initial={{ y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-5 sm:px-8">
        <a href="#top" className="group flex items-center gap-3">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-neon-cyan/25 bg-neon-cyan/10">
            <Globe className="h-[18px] w-[18px] text-neon-cyan" strokeWidth={1.75} />
            <span className="absolute inset-0 animate-breathe rounded-xl bg-neon-cyan/20 blur-md" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-white">
              Atmo<span className="text-neon-mint">Grid</span>
            </span>
            <span className="label mt-1 text-[9px]">depin oracle</span>
          </span>
        </a>

        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {[
            { href: "#network", label: "Network" },
            { href: "#console", label: "Console" },
            { href: "#protocol", label: "Protocol" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-[13px] text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="chip hidden sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-mint" />
            {CHAIN_LABEL}
          </span>
          <span
            className={cn(
              "chip hidden sm:inline-flex",
              mode === "onchain"
                ? "border-neon-mint/25 text-neon-mint"
                : "border-amber-400/25 text-amber-300",
            )}
            title={
              mode === "onchain"
                ? `Writing to ${PROGRAM_ID}`
                : "Program id not set — transactions are simulated locally"
            }
          >
            {mode === "onchain" ? "on-chain" : "simulation"}
          </span>

          {connected && walletAddress ? (
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 pl-1.5">
              <a
                href={explorerAddress(walletAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="mono hidden rounded-lg px-2 py-1 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-white md:block"
              >
                {shortAddress(walletAddress, 4, 4)}
              </a>
              <CopyAddress value={walletAddress} />
              <Button
                variant="subtle"
                size="icon"
                onClick={() => void disconnect()}
                aria-label="Disconnect wallet"
                className="text-zinc-500 hover:text-rose-300"
              >
                <Unplug className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => void onConnect()}
              disabled={busy || connecting}
            >
              {busy || connecting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              {installed ? "Connect Phantom" : "Get Phantom"}
            </Button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
