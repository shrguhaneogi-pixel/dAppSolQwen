/**
 * Live devnet verification for AtmoGrid.
 *
 * Drives the *shipped browser code path* on purpose: lib/anchor.ts hand-encodes the
 * Anchor ABI (sha256("global:<ix>")[0..8] discriminators via Web Crypto, borsh LE args)
 * and decodes the raw 51-byte SensorNode account itself, with no @coral-xyz/anchor.
 * Nothing here re-implements that, so a pass proves the frontend's ABI against real
 * on-chain state — the one surface `tests/atmogrid.ts` cannot reach, because the
 * Anchor SDK there uses its own encoder.
 *
 *   NEXT_PUBLIC_PROGRAM_ID=<id> DEPLOYER_KEYPAIR=<path> \
 *     npx ts-node --project tsconfig.anchor.json scripts/verify-devnet.ts
 *
 * Exits non-zero on any mismatch; it never reports success without reading the chain.
 */
import { readFileSync } from "fs";

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import {
  buildTransaction,
  encodeInitializeNode,
  encodeSubmitData,
  readSensorNode,
  tryDeriveSensorNode,
} from "../lib/anchor";
import { CHAIN_LABEL, DEPLOYED, explorerTx, PROGRAM_ID, RPC_URL } from "../lib/config";

const AQI_SAMPLE = 77;

function readKeypair(file: string): Keypair {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(Array.isArray(raw) ? raw : raw.secretKey));
}

async function confirm(connection: Connection, signature: string) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const result: any = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  const err = result?.value?.err ?? result?.err;
  if (err) throw new Error(`transaction ${signature} failed: ${JSON.stringify(err)}`);
}

async function main() {
  if (!DEPLOYED) {
    throw new Error("NEXT_PUBLIC_PROGRAM_ID is not set — refusing to run against the mock id.");
  }
  const keypairFile = process.env.DEPLOYER_KEYPAIR;
  if (!keypairFile) throw new Error("DEPLOYER_KEYPAIR must point at a funded keypair file.");

  const connection = new Connection(RPC_URL, "confirmed");
  const programId = new PublicKey(PROGRAM_ID);

  const info = await connection.getAccountInfo(programId, "confirmed");
  if (!info || !info.executable) {
    throw new Error(`program ${PROGRAM_ID} is not deployed on ${CHAIN_LABEL}`);
  }
  console.log(`program ${PROGRAM_ID} is executable on ${CHAIN_LABEL} (${info.data.length} bytes)`);

  // Fund the ephemeral operator from the local deployer key rather than the public
  // faucet, which is rate limited. A fresh operator means a fresh PDA, so the run is
  // repeatable and cannot collide with earlier verification state.
  const deployer = readKeypair(keypairFile);
  const operator = Keypair.generate();
  const funding = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: deployer.publicKey,
      toPubkey: operator.publicKey,
      lamports: LAMPORTS_PER_SOL / 2,
    }),
  );
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  funding.recentBlockhash = blockhash;
  funding.feePayer = deployer.publicKey;
  funding.sign(deployer);
  const fundingSig = await connection.sendRawTransaction(funding.serialize(), {
    skipPreflight: false,
  });
  await confirm(connection, fundingSig);
  console.log(`funded operator ${operator.publicKey.toBase58()}`);
  console.log(`  funding tx: ${explorerTx(fundingSig)}`);

  // ---- initialize_node, encoded by the browser client ----
  const pda = tryDeriveSensorNode(operator.publicKey);
  if (!pda) throw new Error("PDA derivation failed");
  console.log(`derived SensorNode PDA: ${pda.toBase58()}`);
  if (await connection.getAccountInfo(pda, "confirmed")) {
    throw new Error("PDA unexpectedly already exists — expected a fresh operator key");
  }

  const initTx = await buildTransaction(connection, operator.publicKey, [
    await encodeInitializeNode(operator.publicKey),
  ]);
  initTx.sign(operator);
  const initSig = await connection.sendRawTransaction(initTx.serialize(), { skipPreflight: false });
  await confirm(connection, initSig);
  console.log(`initialize_node confirmed: ${initSig}`);
  console.log(`  explorer: ${explorerTx(initSig)}`);

  const created = await readSensorNode(connection, pda);
  if (!created) throw new Error("readSensorNode returned null for a freshly created account");
  console.log("  decoded by lib/anchor.ts:", JSON.stringify(created));
  if (
    created.authority !== operator.publicKey.toBase58() ||
    created.dataSubmissions !== 0 ||
    created.lastAqiReading !== 0
  ) {
    throw new Error("decoded genesis state does not match the operator PDA");
  }

  // ---- submit_data, encoded by the browser client ----
  const submitTx = await buildTransaction(connection, operator.publicKey, [
    await encodeSubmitData(operator.publicKey, AQI_SAMPLE),
  ]);
  submitTx.sign(operator);
  const submitSig = await connection.sendRawTransaction(submitTx.serialize(), {
    skipPreflight: false,
  });
  await confirm(connection, submitSig);
  console.log(`submit_data(${AQI_SAMPLE}) confirmed: ${submitSig}`);
  console.log(`  explorer: ${explorerTx(submitSig)}`);

  const updated = await readSensorNode(connection, pda);
  console.log("  decoded after transmit:", JSON.stringify(updated));
  if (updated?.dataSubmissions !== 1 || updated?.lastAqiReading !== AQI_SAMPLE) {
    throw new Error(
      `state mismatch: expected 1/${AQI_SAMPLE}, got ${updated?.dataSubmissions}/${updated?.lastAqiReading}`,
    );
  }

  console.log("LIVE VERIFICATION PASSED");
}

main().catch((error) => {
  console.error("LIVE VERIFICATION FAILED:", error?.message ?? error);
  process.exit(1);
});
