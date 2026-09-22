"use client";

import { motion } from "framer-motion";
import { Cpu, Flame, Layers, ShieldCheck, Waypoints } from "lucide-react";

import { Card } from "@/components/ui/card";
import { CHAIN_LABEL, DEPLOYED, PROGRAM_ID, explorerAddress } from "@/lib/config";

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PILLARS = [
  {
    icon: Layers,
    title: "One PDA per operator",
    body: "SensorNode is seeded by [\"sensor\", authority] — no registry, no admin key. Your wallet address *is* the station id.",
  },
  {
    icon: ShieldCheck,
    title: "Signed or silent",
    body: "submit_data requires the registering signer and an AQI inside the EPA 0–500 range, enforced by the program, not the UI.",
  },
  {
    icon: Waypoints,
    title: "Reputation as state",
    body: "data_submissions is a monotonic u64 on-chain. Gamified tiers are derived from it, so nobody can inflate a score offline.",
  },
];

const PROGRAM_SOURCE = `#[account]
pub struct SensorNode {
    pub authority: Pubkey,        // owner wallet
    pub data_submissions: u64,    // lifetime packets
    pub last_aqi_reading: u16,    // 0..=500
    pub bump: u8,
}

#[derive(Accounts)]
pub struct InitializeNode<'info> {
    #[account(init, payer = authority,
        seeds = [b"sensor", authority.key().as_ref()],
        bump, space = SensorNode::LEN)]
    pub sensor_node: Account<'info, SensorNode>,
    #[account(mut)] pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}`;

export function Protocol() {
  return (
    <section id="protocol" className="mx-auto w-full max-w-[1400px] px-5 pb-20 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease }}
        className="mb-8 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <span className="chip">
            <Cpu className="h-3 w-3" />
            anchor · {CHAIN_LABEL}
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            A four-field oracle.
          </h2>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-zinc-500">
            Two instructions, one account, zero token mints. The whole on-chain surface fits in a
            screen — the fun lives in what you do with the readings.
          </p>
        </div>
        {DEPLOYED ? (
          <a
            href={explorerAddress(PROGRAM_ID)}
            target="_blank"
            rel="noopener noreferrer"
            className="mono text-[11px] text-neon-cyan transition hover:text-white"
          >
            view program on explorer →
          </a>
        ) : (
          <span className="mono text-[11px] text-zinc-600">deploy with anchor keys sync</span>
        )}
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="space-y-4">
          {PILLARS.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.07, ease }}
            >
              <Card className="flex gap-4 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-neon-mint/20 bg-neon-mint/[0.06]">
                  <pillar.icon className="h-4 w-4 text-neon-mint" />
                </span>
                <div>
                  <h3 className="text-[14px] font-semibold text-zinc-100">{pillar.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{pillar.body}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="glass overflow-hidden p-0"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <span className="label">programs/atmogrid/src/lib.rs</span>
            <span className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400/60" />
              <span className="h-2 w-2 rounded-full bg-amber-400/60" />
              <span className="h-2 w-2 rounded-full bg-neon-mint/70" />
            </span>
          </div>
          <pre className="overflow-x-auto p-4 text-[11.5px] leading-[1.7]">
            <code className="mono text-zinc-400">{PROGRAM_SOURCE}</code>
          </pre>
          <div className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-3 text-[11px] text-zinc-600">
            <Flame className="h-3.5 w-3.5 text-neon-cyan" />
            Space: 51 bytes · rent ≈ 0.00115 SOL · seeded PDA, program-signed on init
          </div>
        </motion.div>
      </div>
    </section>
  );
}
