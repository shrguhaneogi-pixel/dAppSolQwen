"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Copy,
  Cpu,
  LoaderCircle,
  Lock,
  MapPin,
  Radio,
  Rocket,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useState } from "react";

import { useAtmoGrid } from "@/components/providers/AtmoGridProvider";
import { usePhantom } from "@/components/providers/PhantomProvider";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { aqiBand } from "@/lib/aqi";
import { explorerAddress } from "@/lib/config";
import { cn, formatCount, shortAddress } from "@/lib/utils";

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

const TIERS = [
  { min: 0, name: "Recruit", tone: "neutral" as const },
  { min: 1, name: "Spotter", tone: "cyan" as const },
  { min: 5, name: "Analyst", tone: "mint" as const },
  { min: 20, name: "Sentinel", tone: "violet" as const },
  { min: 50, name: "Oracle", tone: "amber" as const },
];

function tierFor(submissions: number) {
  return [...TIERS].reverse().find((tier) => submissions >= tier.min) ?? TIERS[0];
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
      <p className="label">{label}</p>
      <p className={cn("value mt-1.5", accent)}>{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function Dashboard() {
  const {
    status,
    mode,
    station,
    callsign,
    nodeAddress,
    submissions,
    lastAqi,
    busy,
    deployNode,
    transmit,
  } = useAtmoGrid();
  const { connected, connecting, connect, walletAddress } = usePhantom();
  const [copied, setCopied] = useState(false);

  const band = aqiBand(lastAqi);
  const tier = tierFor(submissions);
  const nextTier = TIERS[TIERS.findIndex((t) => t.name === tier.name) + 1];
  const progress = nextTier
    ? Math.min(1, submissions / nextTier.min)
    : 1;

  const copyNode = () => {
    if (!nodeAddress) return;
    navigator.clipboard?.writeText(nodeAddress).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      },
      () => undefined,
    );
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-neon-cyan" />
            Node console
          </CardTitle>
          <CardDescription>
            {mode === "onchain"
              ? "Live state read straight from your SensorNode PDA."
              : "Program id not configured — writes land in the local simulation layer."}
          </CardDescription>
        </div>
        <Badge tone={mode === "onchain" ? "mint" : "amber"} dot>
          {mode === "onchain" ? "on-chain" : "sim"}
        </Badge>
      </CardHeader>

      <div className="relative min-h-[290px] flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {!connected ? (
            <motion.div
              key="locked"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.45, ease }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-ink-800">
                  <Lock className="h-4 w-4 text-zinc-500" />
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-200">Console locked</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500">
                    Connect Phantom to mint a virtual sensor node to the grid.
                  </p>
                </div>
              </div>
              <ol className="space-y-2.5 text-[12px] text-zinc-500">
                {[
                  "Connect Phantom and sign one transaction",
                  "A SensorNode PDA is derived from your address",
                  "Transmit AQI packets to build protocol reputation",
                ].map((line, index) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span className="mono mt-px grid h-5 w-5 shrink-0 place-items-center rounded-md border border-neon-cyan/20 bg-neon-cyan/[0.06] text-[10px] text-neon-cyan">
                      {index + 1}
                    </span>
                    {line}
                  </li>
                ))}
              </ol>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={connecting}
                onClick={() => void connect()}
              >
                {connecting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                Connect Phantom
              </Button>
            </motion.div>
          ) : status === "live" || status === "transmitting" ? (
            <motion.div
              key="live"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label="data points"
                  value={formatCount(submissions)}
                  hint="lifetime packets"
                  accent="text-neon-mint"
                />
                <Stat
                  label="last aqi"
                  value={lastAqi || "—"}
                  hint={lastAqi ? band.label : "no reading yet"}
                />
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <div className="flex items-center justify-between">
                  <p className="label">reputation</p>
                  <Badge tone={tier.tone}>{tier.name}</Badge>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-mint"
                    initial={false}
                    animate={{ width: `${Math.max(4, progress * 100)}%` }}
                    transition={{ duration: 0.8, ease }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-zinc-500">
                  {nextTier
                    ? `${Math.max(0, nextTier.min - submissions)} more packet${
                        nextTier.min - submissions === 1 ? "" : "s"
                      } to ${nextTier.name}`
                    : "Top tier reached — the grid is watching you."}
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="label">node pda</p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={copyNode}
                      className="rounded-md p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
                      title="Copy PDA address"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={nodeAddress ? explorerAddress(nodeAddress) : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-neon-cyan"
                      title="Open in Solana Explorer"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
                <p className="mono break-all text-[12px] text-zinc-300">
                  {copied ? "copied ✓" : nodeAddress ? shortAddress(nodeAddress, 12, 10) : "—"}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="chip">
                    <Cpu className="h-3 w-3" />
                    {callsign}
                  </span>
                  {station ? (
                    <span className="chip">
                      <MapPin className="h-3 w-3" />
                      {station.city}
                    </span>
                  ) : null}
                  {walletAddress ? (
                    <span className="chip">{shortAddress(walletAddress, 6, 4)}</span>
                  ) : null}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-neon-cyan/15 bg-neon-cyan/[0.04] p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-neon-cyan" />
                  <p className="text-sm font-medium text-zinc-100">Node not deployed</p>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-zinc-400">
                  Register <span className="mono text-neon-cyan">{callsign}</span> as a SensorNode
                  PDA seeded by your wallet. Rent-exempt, one signature.
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-[12px]">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                  <dt className="label">assigned cell</dt>
                  <dd className="mt-1.5 text-zinc-200">{station?.city ?? "auto"}</dd>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                  <dt className="label">instruction</dt>
                  <dd className="mono mt-1.5 text-zinc-200">initialize_node</dd>
                </div>
              </dl>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={busy || status === "deploying"}
                onClick={() => void deployNode()}
              >
                {status === "deploying" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4" />
                )}
                {status === "deploying" ? "Awaiting signature…" : "Deploy Sensor Node"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CardFooter>
        <Button
          variant="mint"
          size="lg"
          className="w-full"
          disabled={status !== "live" || busy}
          onClick={() => void transmit()}
        >
          {status === "transmitting" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Waves className="h-4 w-4" />
          )}
          {status === "transmitting" ? "Broadcasting…" : "Transmit Air Quality Data"}
        </Button>
        <p className="mt-3 text-center text-[11px] text-zinc-600">
          Simulated telemetry · AQI drawn from the EPA 0–500 scale
        </p>
      </CardFooter>
    </Card>
  );
}
