"use client";

import dynamic from "next/dynamic";

import { useAtmoGrid } from "@/components/providers/AtmoGridProvider";
import { cn } from "@/lib/utils";

const AtmoGlobe = dynamic(() => import("@/components/globe/AtmoGlobe"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center">
      <div className="flex flex-col items-center gap-3">
        <span className="h-16 w-16 animate-breathe rounded-full border border-neon-cyan/40 bg-neon-cyan/10" />
        <span className="label">compiling shaders</span>
      </div>
    </div>
  ),
});

const LEGEND = [
  { hex: "#22e39a", label: "good" },
  { hex: "#7dd3fc", label: "moderate" },
  { hex: "#fbbf24", label: "sensitive" },
  { hex: "#fb7185", label: "unhealthy" },
  { hex: "#c084fc", label: "hazardous" },
];

export function GlobeStage({ className }: { className?: string }) {
  const { pulses, surge, networkNodes, feed } = useAtmoGrid();
  const live = feed.filter((entry) => Date.now() - entry.at < 60_000).length;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Ambient bloom behind the wire earth. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(closest-side, rgba(34,211,238,0.16), rgba(34,227,154,0.06) 55%, transparent 72%)",
        }}
      />
      <AtmoGlobe pulses={pulses} surge={surge} className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-breathe rounded-full bg-neon-mint" />
                <span className="relative h-2 w-2 rounded-full bg-neon-mint" />
              </span>
              <span className="label text-neon-mint">network live</span>
            </div>
            <p className="mono mt-2 text-3xl font-semibold text-white sm:text-4xl">
              {networkNodes}
              <span className="ml-2 text-sm font-normal text-zinc-500">sensor nodes</span>
            </p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="label">last 60s</p>
            <p className="mono text-xl text-zinc-200">{live} packets</p>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {LEGEND.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: item.hex, boxShadow: `0 0 10px ${item.hex}` }}
                />
                <span className="label">{item.label}</span>
              </li>
            ))}
          </ul>
          <p className="label hidden sm:block">drag to orbit</p>
        </div>
      </div>
    </div>
  );
}
