"use client";

import { motion } from "framer-motion";
import { Blocks, Clock3, Gauge, RadioTower, type LucideIcon } from "lucide-react";

import { useAtmoGrid } from "@/components/providers/AtmoGridProvider";
import { aqiBand } from "@/lib/aqi";
import { CHAIN_LABEL } from "@/lib/config";
import { SENSOR_NETWORK } from "@/lib/nodes";
import { formatCount } from "@/lib/utils";

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function StatsStrip() {
  const { feed, submissions } = useAtmoGrid();

  const average = Math.round(
    SENSOR_NETWORK.reduce((sum, node) => sum + node.baseline, 0) / SENSOR_NETWORK.length,
  );
  const band = aqiBand(average);

  type Stat = {
    icon: LucideIcon;
    label: string;
    value: string;
    hint: string;
    accent?: string;
  };

  const stats: Stat[] = [
    {
      icon: RadioTower,
      label: "active nodes",
      value: formatCount(SENSOR_NETWORK.length),
      hint: "virtual sensors",
    },
    {
      icon: Gauge,
      label: "mean aqi",
      value: String(average),
      hint: band.label,
      accent: band.hex,
    },
    {
      icon: Blocks,
      label: "packets / min",
      value: formatCount(Math.max(feed.length * 6, 24)),
      hint: "rolling window",
    },
    {
      icon: Clock3,
      label: "finality",
      value: "≈0.4s",
      hint: CHAIN_LABEL,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: index * 0.06, ease }}
          className="glass flex items-center gap-3 p-4"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03]">
            <stat.icon className="h-4 w-4" style={{ color: stat.accent ?? "#7dd3fc" }} />
          </span>
          <div className="min-w-0">
            <p className="label truncate">{stat.label}</p>
            <p className="mono truncate text-lg font-semibold text-zinc-100">{stat.value}</p>
            <p className="truncate text-[11px] text-zinc-600">{stat.hint}</p>
          </div>
        </motion.div>
      ))}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="sr-only"
      >
        {submissions} packets transmitted from this wallet.
      </motion.p>
    </div>
  );
}
