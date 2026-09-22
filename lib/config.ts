/**
 * Single source of truth for on-chain/network configuration.
 *
 * `PROGRAM_ID` is intentionally empty by default. Until the Anchor program is
 * deployed and the id is supplied through `.env.local`, the app runs in
 * SIMULATION mode: identical UI, identical globe pulses, no chain writes.
 */
export const PROGRAM_ID: string = (
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? ""
).trim();

export const RPC_URL: string =
  (process.env.NEXT_PUBLIC_RPC_URL ?? "").trim() ||
  "https://api.devnet.solana.com";

export const CLUSTER: string =
  (process.env.NEXT_PUBLIC_CLUSTER ?? "").trim() || "devnet";

export const IS_MAINNET = CLUSTER === "mainnet-beta";

export const EXPLORER_BASE = "https://explorer.solana.com";

function clusterQuery() {
  return IS_MAINNET ? "" : `?cluster=${CLUSTER}`;
}

export function explorerTx(signature: string) {
  return `${EXPLORER_BASE}/tx/${signature}${clusterQuery()}`;
}

export function explorerAddress(address: string) {
  return `${EXPLORER_BASE}/address/${address}${clusterQuery()}`;
}

export const CHAIN_LABEL = IS_MAINNET ? "mainnet-beta" : CLUSTER;

/** How long we wait for a transaction to land before giving up. */
export const CONFIRM_TIMEOUT_MS = 60_000;

export const PROGRAM_CONFIGURED = (() => {
  // Cheap validation without importing web3.js into server components.
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(PROGRAM_ID);
})();

export const DEPLOYED = PROGRAM_CONFIGURED;
