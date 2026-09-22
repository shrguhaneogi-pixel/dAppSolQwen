"use client";

import { motion } from "framer-motion";
import { ArrowRight, Command, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEPLOYED, PROGRAM_ID } from "@/lib/config";

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function HeroCopy() {
  return (
    <div className="max-w-3xl">
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="chip"
      >
        <Sparkles className="h-3 w-3 text-neon-mint" />
        depin · solana {DEPLOYED ? "on-chain" : "simulation layer"}
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05, ease }}
        className="mt-5 text-[38px] font-semibold leading-[1.05] tracking-tight text-white sm:text-[54px]"
      >
        Every breath, <span className="text-gradient">written to the chain.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.12, ease }}
        className="mt-5 max-w-xl text-[15px] leading-relaxed text-zinc-400"
      >
        AtmoGrid turns air-quality telemetry into a game. Register a virtual sensor node as a
        program-derived account, transmit AQI packets, and watch the network globe answer with
        light — earning protocol reputation with every signature.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.18, ease }}
        className="mt-7 flex flex-wrap items-center gap-3"
      >
        <Button
          variant="primary"
          size="lg"
          onClick={() =>
            document.getElementById("console")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          Deploy a sensor
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={() =>
            document.getElementById("protocol")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          <Command className="h-4 w-4" />
          Read the program
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mono mt-5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-600"
      >
        <span className="label">program</span>
        <span className="text-zinc-500">
          {DEPLOYED ? PROGRAM_ID : "not configured — running the simulation layer"}
        </span>
      </motion.p>
    </div>
  );
}
