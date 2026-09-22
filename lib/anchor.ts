/**
 * Hand-rolled Anchor client.
 *
 * Deliberately dependency-free: we only need two instructions and one account
 * layout, so instead of pulling `@coral-xyz/anchor` into the browser bundle
 * (Node polyfills, IDL drift) we reproduce the exact ABI it would emit —
 * `sha256("global:<ix_name>")[0..8]` discriminators and borsh LE args.
 */
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type Connection,
} from "@solana/web3.js";

import { PROGRAM_ID } from "./config";

export const SENSOR_SEED = "sensor";

/** 8 (discriminator) + 32 authority + 8 u64 + 2 u16 + 1 u8 */
export const SENSOR_NODE_LEN = 51;

const discriminatorCache = new Map<string, Promise<Uint8Array>>();

function sighash(name: string): Promise<Uint8Array> {
  const cached = discriminatorCache.get(name);
  if (cached) return cached;

  const pending = (async () => {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      throw new Error(
        "Web Crypto is unavailable — serve the app over http://localhost or https.",
      );
    }
    const bytes = new TextEncoder().encode(`global:${name}`);
    const digest = await subtle.digest("SHA-256", bytes);
    return new Uint8Array(digest).slice(0, 8);
  })();

  discriminatorCache.set(name, pending);
  return pending;
}

function programKey(): PublicKey {
  if (!PROGRAM_ID) throw new Error("Program id is not configured.");
  return new PublicKey(PROGRAM_ID);
}

/** `["sensor", authority]` — mirrors the on-chain seeds constraint. */
export function deriveSensorNode(authority: PublicKey, programId?: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode(SENSOR_SEED), authority.toBuffer()],
    programId ?? programKey(),
  );
  return pda;
}

export function tryDeriveSensorNode(authority: PublicKey): PublicKey | null {
  try {
    return deriveSensorNode(authority);
  } catch {
    return null;
  }
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export async function encodeInitializeNode(
  authority: PublicKey,
): Promise<TransactionInstruction> {
  const id = programKey();
  const sensorNode = deriveSensorNode(authority, id);
  const data = await sighash("initialize_node");

  return new TransactionInstruction({
    programId: id,
    keys: [
      // Program-derived account created by `init` → signed by the program.
      { pubkey: sensorNode, isSigner: true, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export async function encodeSubmitData(
  authority: PublicKey,
  aqiReading: number,
): Promise<TransactionInstruction> {
  const id = programKey();
  const sensorNode = deriveSensorNode(authority, id);
  const clamped = Math.max(0, Math.min(500, Math.round(aqiReading)));

  const u16 = new Uint8Array(2);
  new DataView(u16.buffer).setUint16(0, clamped, true);

  return new TransactionInstruction({
    programId: id,
    keys: [
      { pubkey: sensorNode, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
    ],
    data: concatBytes(await sighash("submit_data"), u16),
  });
}

export type SensorNodeAccount = {
  address: string;
  authority: string;
  dataSubmissions: number;
  lastAqiReading: number;
  bump: number;
};

export function decodeSensorNode(address: PublicKey, raw: Uint8Array): SensorNodeAccount {
  if (raw.length < SENSOR_NODE_LEN) {
    throw new Error(`SensorNode is too small (${raw.length} bytes).`);
  }
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  return {
    address: address.toBase58(),
    authority: new PublicKey(raw.slice(8, 40)).toBase58(),
    dataSubmissions: Number(view.getBigUint64(40, true)),
    lastAqiReading: view.getUint16(48, true),
    bump: raw[50],
  };
}

export async function readSensorNode(
  connection: Connection,
  address: PublicKey,
): Promise<SensorNodeAccount | null> {
  const account = await connection.getAccountInfo(address, "confirmed");
  if (!account || !account.data) return null;
  const bytes = new Uint8Array(account.data);
  if (bytes.length < SENSOR_NODE_LEN) return null;
  return decodeSensorNode(address, bytes);
}

export async function buildTransaction(
  connection: Connection,
  feePayer: PublicKey,
  instructions: TransactionInstruction[],
): Promise<Transaction> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  return new Transaction({ feePayer, blockhash, lastValidBlockHeight }).add(...instructions);
}
