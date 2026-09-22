# AtmoGrid

**A gamified DePIN air-quality oracle on Solana.** Register a virtual sensor node as a
program-derived account, transmit simulated AQI packets, and watch a WebGL network globe answer
with light.

> **MVP scope.** Environmental readings are synthetic (no ESP32 yet), node geography is a
> hardcoded registry (`lib/nodes.ts`), peer traffic is generated client-side, and Phantom is the
> only wallet wired up. The on-chain surface is real: two instructions, one account.

---

## Implemented

| Layer | What shipped |
| --- | --- |
| **Program** | `initialize_node` + `submit_data` on a `SensorNode` PDA seeded `["sensor", authority]`, with signer/seeds/`has_one` constraints and an EPA `0–500` range check. |
| **Wallet** | Phantom-only provider (`components/providers/PhantomProvider.tsx`) built directly on `@solana/wallet-adapter-phantom` — no UI kit, no version-drift surface. |
| **Transactions** | Explicit stages: *Confirm in Phantom* → *Broadcasting to devnet* → *Success/Fail*, with a Solana Explorer link in the toast. Signature polled with a 60 s ceiling. |
| **3D globe** | React Three Fiber + raw three.js: 5 400-point land-masked dot shell, graticule, fresnel atmosphere, AQI-tinted node markers, expanding shockwave rings on every write, drag-to-orbit with inertia. |
| **Dashboard** | Derived node PDA (copy + explorer), lifetime packet count, last AQI with EPA band, reputation tiers, and the transmit CTA. Framer Motion cross-fades Deploy ⇄ Live. |
| **Off-chain fallback** | With no `NEXT_PUBLIC_PROGRAM_ID`, the identical UI runs against a local simulation layer (persisted in `localStorage`), so the demo never depends on a deployment. |

No `@coral-xyz/anchor` in the browser bundle: `lib/anchor.ts` hand-encodes the Anchor ABI
(`sha256("global:<ix>")[0..8]` discriminators via Web Crypto, borsh little-endian args) and
decodes the 51-byte account directly. That keeps `@solana/web3.js` as the only chain dependency
on the client.

---

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · three.js /
`@react-three/fiber` · framer-motion · lucide-react · sonner · `@solana/web3.js` · Anchor 0.29

---

## Run the frontend

```bash
npm install
cp .env.example .env.local     # leave NEXT_PUBLIC_PROGRAM_ID empty for simulation mode
npm run dev                    # http://localhost:3000
```

`npm run typecheck` runs `tsc --noEmit`; `npm run build` produces the production bundle.

## Deploy the program

Requires the Anchor (0.29.0) and Solana CLI (1.18.x) toolchains — they are **not** part of
`npm install`.

```bash
solana config set --url https://api.devnet.solana.com
solana airdrop 2 <your-pubkey>          # fund the deployer

anchor keys sync                        # writes the real program id into lib.rs + Anchor.toml
anchor build                            # programs/atmogrid/src/lib.rs -> target/deploy
anchor deploy                           # devnet (per [provider] in Anchor.toml)
```

Then point the frontend at it:

```bash
# .env.local — paste the id printed by `anchor keys sync`
NEXT_PUBLIC_PROGRAM_ID=<program-id>
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_CLUSTER=devnet
```

Restart `npm run dev`. The navbar badge flips from `simulation` to `on-chain`, and the dashboard
reads your node straight off the ledger.

## Test

```bash
anchor test        # tests/atmogrid.ts — happy path + AQI range rejection
```

---

## Layout

```
programs/atmogrid/src/lib.rs      Anchor program (SensorNode, initialize_node, submit_data)
Anchor.toml / Cargo.toml          workspace + toolchain pins
app/                              layout, page, globals.css (dark shell)
components/
  providers/                      PhantomProvider (wallet) · AtmoGridProvider (node state, tx, pulses)
  globe/AtmoGlobe.tsx             the R3F scene (dynamically imported, ssr: false)
  GlobeStage.tsx                  globe + HUD overlay
  Dashboard.tsx / FeedPanel.tsx   node console + packet stream
  Navbar.tsx / HeroCopy.tsx / Protocol.tsx / StatsStrip.tsx
lib/
  anchor.ts                       PDA derivation, instruction encoding, account decoding
  nodes.ts                        mocked sensor registry (lat/lng + baseline AQI)
  aqi.ts config.ts utils.ts       EPA bands, env config, helpers
tests/atmogrid.ts                 Anchor happy-path test
```

## Flow

`Connect Phantom` → `Deploy Sensor Node` (signs `initialize_node`) → console unlocks →
`Transmit Air Quality Data` (signs `submit_data(aqi)`) → account refetch + shockwave on the globe.

## Known MVP boundaries

- Sensor telemetry is simulated — no verifier, no stake, no reward mint.
- Node geography is a static array; a real index would live off-chain.
- Program id is a placeholder until `anchor keys sync`; the app runs in simulation mode otherwise.
- Solana devnet only; no mainnet configuration shipped.
