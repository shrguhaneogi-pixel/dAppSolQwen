"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { PublicKey, TransactionInstruction } from "@solana/web3.js";

import { usePhantom } from "@/components/providers/PhantomProvider";
import {
  buildTransaction,
  encodeInitializeNode,
  encodeSubmitData,
  readSensorNode,
  tryDeriveSensorNode,
  type SensorNodeAccount,
} from "@/lib/anchor";
import {
  CHAIN_LABEL,
  CONFIRM_TIMEOUT_MS,
  DEPLOYED,
  explorerTx,
} from "@/lib/config";
import { simulateAqi } from "@/lib/aqi";
import {
  SENSOR_NETWORK,
  homeNodeFor,
  stationCode,
  type SensorSeed,
} from "@/lib/nodes";
import { sleep } from "@/lib/utils";

export type Pulse = {
  key: number;
  station: string;
  lat: number;
  lng: number;
  aqi: number;
  mine: boolean;
  born: number;
  /** 0..1 — how hard this event punches through the globe shader. */
  power: number;
};

export type FeedEntry = {
  key: number;
  station: string;
  city: string;
  aqi: number;
  mine: boolean;
  at: number;
  signature?: string;
};

export type NodeStatus = "locked" | "idle" | "deploying" | "live" | "transmitting";
export type ExecutionMode = "onchain" | "sim";

type AtmoValue = {
  status: NodeStatus;
  mode: ExecutionMode;
  station: SensorSeed | null;
  callsign: string;
  nodeAddress: string | null;
  account: SensorNodeAccount | null;
  submissions: number;
  lastAqi: number;
  pulses: Pulse[];
  feed: FeedEntry[];
  /** Timestamp of the last local write — drives the full-globe flash. */
  surge: number;
  busy: boolean;
  networkNodes: number;
  deployNode: () => Promise<void>;
  transmit: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AtmoContext = createContext<AtmoValue | null>(null);

const SIM_KEY = "atmogrid:sim:v1";
const PULSE_CAP = 18;
const FEED_CAP = 10;

let seq = 1;
const nextKey = () => seq++;

type SimState = { submissions: number; lastAqi: number; deployed: boolean };
const EMPTY_SIM: SimState = { submissions: 0, lastAqi: 0, deployed: false };

function readSim(): SimState {
  if (typeof window === "undefined") return EMPTY_SIM;
  try {
    const raw = window.localStorage.getItem(SIM_KEY);
    if (!raw) return EMPTY_SIM;
    const parsed = JSON.parse(raw) as Partial<SimState>;
    return {
      submissions: Number(parsed.submissions) || 0,
      lastAqi: Number(parsed.lastAqi) || 0,
      deployed: Boolean(parsed.deployed),
    };
  } catch {
    return EMPTY_SIM;
  }
}

function writeSim(value: SimState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIM_KEY, JSON.stringify(value));
  } catch {
    /* private mode — state stays in memory */
  }
}

async function waitForSignature(
  connection: ReturnType<typeof usePhantom>["connection"],
  signature: string,
) {
  const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const statuses = await connection.getSignatureStatuses([signature]);
    const status = statuses.value[0];
    if (status?.err) throw new Error(String(JSON.stringify(status.err)));
    if (
      status &&
      (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")
    ) {
      return;
    }
    await sleep(1200);
  }
  throw new Error("Timed out waiting for confirmation.");
}

export function AtmoGridProvider({ children }: { children: ReactNode }) {
  const { connection, publicKey, connected, sign, walletAddress } = usePhantom();

  const [account, setAccount] = useState<SensorNodeAccount | null>(null);
  const [nodeAddress, setNodeAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<NodeStatus>("locked");
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [surge, setSurge] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sim, setSim] = useState<SimState>(EMPTY_SIM);

  const mode: ExecutionMode = DEPLOYED ? "onchain" : "sim";
  const station = useMemo(
    () => (walletAddress ? homeNodeFor(walletAddress) : null),
    [walletAddress],
  );

  const emit = useCallback((pulse: Pulse, entry?: FeedEntry) => {
    setPulses((prev) => [...prev, pulse].slice(-PULSE_CAP));
    setFeed((prev) => [entry ?? {
      key: pulse.key,
      station: pulse.station,
      city: pulse.station,
      aqi: pulse.aqi,
      mine: pulse.mine,
      at: pulse.born,
    }, ...prev].slice(0, FEED_CAP));
  }, []);

  const fire = useCallback(
    (node: SensorSeed, aqi: number, mine: boolean, power: number, signature?: string) => {
      const key = nextKey();
      const born = Date.now();
      emit(
        { key, station: node.id, lat: node.lat, lng: node.lng, aqi, mine, born, power },
        { key, station: node.id, city: node.city, aqi, mine, at: born, signature },
      );
    },
    [emit],
  );

  // ---------------------------------------------------------------- boot state
  const refresh = useCallback(async () => {
    if (!connected || !publicKey) {
      setStatus("locked");
      setAccount(null);
      setNodeAddress(null);
      return;
    }
    const pda = tryDeriveSensorNode(publicKey);
    setNodeAddress(pda ? pda.toBase58() : null);

    if (mode === "sim") {
      const stored = readSim();
      setSim(stored);
      setStatus(stored.deployed ? "live" : "idle");
      return;
    }
    if (!pda) return;
    try {
      const loaded = await readSensorNode(connection, pda);
      setAccount(loaded);
      setStatus(loaded ? "live" : "idle");
    } catch {
      // RPC unreachable — keep the UI explorable instead of bricking it.
      const stored = readSim();
      setSim(stored);
      setStatus(stored.deployed ? "live" : "idle");
    }
  }, [connected, connection, mode, publicKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ------------------------------------------------- simulated network chatter
  // Ambient readings from other operators so the globe never looks dead.
  useEffect(() => {
    const tick = () => {
      const node = SENSOR_NETWORK[Math.floor(Math.random() * SENSOR_NETWORK.length)];
      const mine = Boolean(station && node.id === station.id);
      fire(node, simulateAqi(node.baseline), mine, mine ? 1 : 0.4);
    };
    const timer = window.setInterval(tick, 2400);
    // Seed a few readings immediately so first paint isn't an empty globe.
    for (let i = 0; i < 5; i += 1) tick();
    return () => window.clearInterval(timer);
  }, [fire, station]);

  // ------------------------------------------------------------------ actions
  const runOnChain = useCallback(
    async (
      label: string,
      signer: PublicKey,
      instruction: () => Promise<TransactionInstruction>,
    ) => {
      const id = "atmo-tx";
      toast.loading(`Confirm in Phantom — ${label}`, { id, duration: Infinity });

      const instructions = [await instruction()];
      const tx = await buildTransaction(connection, signer, instructions);
      const raw = await sign(tx);

      toast.loading(`Broadcasting to ${CHAIN_LABEL}…`, { id, duration: Infinity });
      const signature = await connection.sendRawTransaction(raw, { skipPreflight: false });
      await waitForSignature(connection, signature);

      toast.success(`${label} confirmed`, {
        id,
        duration: 7000,
        description: `${signature.slice(0, 20)}… · ${CHAIN_LABEL}`,
        action: {
          label: "View",
          onClick: () => window.open(explorerTx(signature), "_blank", "noopener,noreferrer"),
        },
      });
      return signature;
    },
    [connection, sign],
  );

  const deployNode = useCallback(async () => {
    if (busy || !connected || !publicKey) return;
    setBusy(true);
    setStatus("deploying");
    try {
      let signature: string | undefined;
      if (mode === "onchain") {
        signature = await runOnChain("Deploy sensor", publicKey, () =>
          encodeInitializeNode(publicKey),
        );
        await refresh();
      } else {
        await simFlow("Deploy sensor node");
        const next = { submissions: 0, lastAqi: 0, deployed: true };
        writeSim(next);
        setSim(next);
      }
      if (station) fire(station, 12, true, 1, signature);
      setSurge(Date.now());
      setStatus("live");
    } catch {
      setStatus("idle");
    } finally {
      setBusy(false);
    }
  }, [busy, connected, mode, publicKey, refresh, runOnChain, station, fire]);

  const transmit = useCallback(async () => {
    if (busy || !connected || !publicKey || !station) return;
    setBusy(true);
    setStatus("transmitting");
    const reading = simulateAqi(station.baseline);
    try {
      let signature: string | undefined;
      if (mode === "onchain") {
        signature = await runOnChain("Transmit AQI", publicKey, () =>
          encodeSubmitData(publicKey, reading),
        );
        await refresh();
      } else {
        await simFlow("Transmit air-quality data");
        const next = { submissions: sim.submissions + 1, lastAqi: reading, deployed: true };
        writeSim(next);
        setSim(next);
      }
      fire(station, reading, true, 1, signature);
      setSurge(Date.now());
      setStatus("live");
    } catch {
      setStatus("live");
    } finally {
      setBusy(false);
    }
  }, [busy, connected, mode, publicKey, runOnChain, refresh, sim.submissions, station, fire]);

  const submissions = mode === "onchain" ? account?.dataSubmissions ?? 0 : sim.submissions;
  const lastAqi = mode === "onchain" ? account?.lastAqiReading ?? 0 : sim.lastAqi;

  const value = useMemo<AtmoValue>(
    () => ({
      status,
      mode,
      station,
      callsign: walletAddress ? stationCode(walletAddress) : "ATM-000",
      nodeAddress,
      account,
      submissions,
      lastAqi,
      pulses,
      feed,
      surge,
      busy,
      networkNodes: SENSOR_NETWORK.length,
      deployNode,
      transmit,
      refresh,
    }),
    [
      status, mode, station, nodeAddress, account, submissions, lastAqi, pulses, feed,
      surge, busy, deployNode, transmit, refresh, walletAddress,
    ],
  );

  return <AtmoContext.Provider value={value}>{children}</AtmoContext.Provider>;
}

// ------------------------------------------------------------ simulation path
async function simFlow(label: string) {
  const id = "atmo-tx";
  toast.loading(`Confirm in Phantom — ${label}`, { id, duration: Infinity });
  await sleep(900);
  toast.loading("Broadcasting to simulation layer…", { id, duration: Infinity });
  await sleep(1000);
  toast.success(`${label} confirmed`, {
    id,
    duration: 5000,
    description: "SIMULATION — set NEXT_PUBLIC_PROGRAM_ID after `anchor deploy` to write on-chain.",
  });
}

export function useAtmoGrid(): AtmoValue {
  const ctx = useContext(AtmoContext);
  if (!ctx) throw new Error("useAtmoGrid must be used inside <AtmoGridProvider>.");
  return ctx;
}
