import { Dashboard } from "@/components/Dashboard";
import { FeedPanel } from "@/components/FeedPanel";
import { GlobeStage } from "@/components/GlobeStage";
import { HeroCopy } from "@/components/HeroCopy";
import { Navbar } from "@/components/Navbar";
import { Protocol } from "@/components/Protocol";
import { StatsStrip } from "@/components/StatsStrip";
import { Card } from "@/components/ui/card";

export default function Page() {
  return (
    <main id="top" className="relative">
      <Navbar />

      {/* Faint scaffold lines behind everything. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-lines opacity-[0.35]"
        style={{
          maskImage: "radial-gradient(circle at 50% 20%, #000 0%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 20%, #000 0%, transparent 72%)",
        }}
      />

      <div className="mx-auto w-full max-w-[1400px] px-5 pb-16 pt-28 sm:px-8 sm:pt-32">
        <HeroCopy />

        <div id="network" className="mt-10 scroll-mt-24">
          <StatsStrip />
        </div>

        <div id="console" className="mt-5 grid scroll-mt-24 gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <GlobeStage className="glass min-h-[52vh] p-0 lg:min-h-[66vh]" />
          <Dashboard />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <FeedPanel />
          <Card className="flex flex-col justify-between">
            <div>
              <h3 className="text-[15px] font-semibold tracking-tight text-zinc-100">
                Why a virtual grid?
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                Real DePIN networks die at the cold-start problem: hardware is expensive and the
                first thousand operators see an empty map. AtmoGrid inverts that — the sensor is a
                PDA, the telemetry is synthetic, and the reward loop (tier progression, streaks,
                regional leaderboards) is what ships on day one. Swap the simulator for an ESP32
                and the contract is unchanged.
              </p>
              <ul className="mt-5 space-y-3">
                {[
                  ["Register", "initialize_node → derive SensorNode PDA"],
                  ["Transmit", "submit_data(aqi) → counter + last reading"],
                  ["Climb", "reputation derived from on-chain counters"],
                ].map(([step, detail]) => (
                  <li
                    key={step}
                    className="flex items-baseline gap-3 border-t border-white/[0.06] pt-3 first:border-0 first:pt-0"
                  >
                    <span className="label w-20 shrink-0">{step}</span>
                    <span className="mono text-[12px] text-zinc-400">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-6 text-[11px] leading-relaxed text-zinc-600">
              MVP scope: geo coordinates are a hardcoded registry, peer traffic is generated
              client-side, and only Phantom is wired up.
            </p>
          </Card>
        </div>
      </div>

      <Protocol />

      <footer className="border-t border-white/[0.06] py-8">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 sm:px-8">
          <p className="label">atmogrid · v0.1.0 · mit</p>
          <p className="text-[11px] text-zinc-600">
            Built for the grid, not the gas gauge. Simulated environmental data only.
          </p>
        </div>
      </footer>
    </main>
  );
}
