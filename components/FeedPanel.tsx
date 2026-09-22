"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowUpRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { useAtmoGrid } from "@/components/providers/AtmoGridProvider";
import { Badge, Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { aqiBand } from "@/lib/aqi";
import { explorerTx } from "@/lib/config";

function ago(now: number, at: number) {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 2) return "now";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

export function FeedPanel() {
  const { feed } = useAtmoGrid();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-neon-mint" />
            Packet stream
          </CardTitle>
          <CardDescription>Inbound telemetry across the grid.</CardDescription>
        </div>
        <Badge tone="mint" dot>
          streaming
        </Badge>
      </CardHeader>

      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {feed.map((entry) => {
            const band = aqiBand(entry.aqi);
            return (
              <motion.li
                key={entry.key}
                layout
                initial={{ opacity: 0, x: -12, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div
                  className="group flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2"
                  style={
                    entry.mine
                      ? { borderColor: "rgba(34,227,154,0.28)", background: "rgba(34,227,154,0.05)" }
                      : undefined
                  }
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: band.hex, boxShadow: `0 0 10px ${band.hex}` }}
                  />
                  <span className="mono w-11 shrink-0 text-[11px] text-zinc-500">
                    {entry.station}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-300">
                    {entry.city}
                    {entry.mine ? <span className="ml-1.5 text-neon-mint">· you</span> : null}
                  </span>
                  <span className="mono shrink-0 text-[12px] text-zinc-200">{entry.aqi}</span>
                  <span className="mono w-9 shrink-0 text-right text-[11px] text-zinc-600">
                    {ago(now, entry.at)}
                  </span>
                  {entry.signature ? (
                    <a
                      href={explorerTx(entry.signature)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-zinc-600 transition hover:text-neon-cyan"
                      title="Open transaction"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="w-[14px] shrink-0" />
                  )}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-zinc-600">
        <Sparkles className="h-3 w-3" />
        Peer packets are simulated; your own packets mirror the on-chain writes.
      </p>
    </Card>
  );
}
