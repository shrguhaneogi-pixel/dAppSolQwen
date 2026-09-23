import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;

// `anchor.workspace` is populated by the Anchor CLI (`anchor test`), and the
// generated `target/types` declarations only exist after `anchor build`. The
// cast is a compile-time concession to that codegen order; every value below is
// resolved at runtime against the real cluster.
const program = (anchor.workspace as any).Atmogrid;
const programId: PublicKey = program.programId;

const SENSOR_SEED = Buffer.from("sensor");
const RENT_EXEMPT_PROBE_LAMPORTS = LAMPORTS_PER_SOL / 2;

function sensorPda(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SENSOR_SEED, authority.toBuffer()], programId);
}

/** Infrastructure failures must never be mistaken for a program rejecting a transaction. */
const CLIENT_SIDE_FAILURES = [
  "blockhash",
  "Blockhash",
  "not found",
  "insufficient",
  "Insufficient",
  "Unable to reach a cluster",
  "fetch failed",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "429",
  "rate limit",
  "exceeded",
  "InvalidArguments",
  "keypair",
];

function assertRejectedByCluster(error: unknown, context: string): void {
  const message = String(
    (error as any)?.message ?? (error as any)?.toString?.() ?? error ?? "",
  );
  const infra = CLIENT_SIDE_FAILURES.find((needle) => message.includes(needle));
  assert.isUndefined(
    infra,
    `${context}: expected the cluster to reject this transaction, but it failed for an ` +
      `infrastructure reason ("${infra}"). A rejected transaction must be attributable to the ` +
      `program, not to a missing deployment, an unfunded payer, or RPC trouble. Raw: ${message}`,
  );
}

async function fund(account: PublicKey, lamports = LAMPORTS_PER_SOL): Promise<void> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const signature = await connection.requestAirdrop(account, lamports);
  // web3.js returns either SignatureResult or RPCResponseAndContext<SignatureStatus>
  // depending on version, so read the error out of whichever shape arrived.
  const result: any = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  const err = result?.value?.err ?? result?.err ?? null;
  assert.strictEqual(err, null, `airdrop to ${account.toBase58()} failed: ${JSON.stringify(err)}`);
}

/** Reads the account and fails loudly if it is absent — every check below needs real state. */
async function fetchNode(address: PublicKey, context: string) {
  const node = await program.account.sensorNode.fetch(address).catch((error: any) => {
    assert.fail(`${context}: could not fetch SensorNode ${address.toBase58()}: ${error?.message}`);
  });
  assert.isDefined(node, `${context}: SensorNode ${address.toBase58()} missing`);
  return node;
}

describe("atmogrid", () => {
  before(async () => {
    const info = await connection.getAccountInfo(programId, "confirmed");
    assert.isNotNull(
      info,
      `program ${programId.toBase58()} is not deployed on ${connection.rpcEndpoint}. ` +
        `Run \`anchor build && anchor test\` (local validator) or deploy first — ` +
        `these tests must not be counted as passing against an absent program.`,
    );
    assert.isTrue(info!.executable, `account ${programId.toBase58()} is not executable`);

    const payer = provider.wallet.publicKey;
    const balance = await connection.getBalance(payer, "confirmed");
    if (balance < RENT_EXEMPT_PROBE_LAMPORTS) {
      await fund(payer, 2 * LAMPORTS_PER_SOL);
    }
    assert.isAtLeast(
      await connection.getBalance(payer, "confirmed"),
      RENT_EXEMPT_PROBE_LAMPORTS,
      `fee payer ${payer.toBase58()} is underfunded on ${connection.rpcEndpoint}`,
    );
  });

  // An ephemeral authority per scenario: the PDA is seeded by the authority, so a
  // fixed one would make every run after the first collide with its own state.
  async function freshAuthority(): Promise<Keypair> {
    const keypair = Keypair.generate();
    await fund(keypair.publicKey, LAMPORTS_PER_SOL);
    assert.isAbove(
      await connection.getBalance(keypair.publicKey, "confirmed"),
      0,
      `authority ${keypair.publicKey.toBase58()} received no funds`,
    );
    return keypair;
  }

  it("initialize_node creates a zeroed SensorNode at the derived PDA", async () => {
    const authority = await freshAuthority();
    const [node, bump] = sensorPda(authority.publicKey);

    await program.methods
      .initializeNode()
      .accounts({
        sensorNode: node,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const account = await fetchNode(node, "initialize_node");
    assert.isTrue(
      account.authority.equals(authority.publicKey),
      `authority should be ${authority.publicKey.toBase58()}, got ${account.authority.toBase58()}`,
    );
    assert.strictEqual(account.dataSubmissions.toNumber(), 0, "data_submissions should start at 0");
    assert.strictEqual(account.lastAqiReading, 0, "last_aqi_reading should start at 0");
    assert.strictEqual(account.bump, bump, "stored bump should match the canonical derivation");

    // The account the program created must be exactly the 51-byte layout.
    const raw = await connection.getAccountInfo(node, "confirmed");
    assert.isNotNull(raw, "SensorNode account not found after init");
    assert.strictEqual(raw!.data.length, 51, "SensorNode should be discriminator + 43 bytes");
    assert.isTrue(raw!.owner.equals(programId), "SensorNode should be owned by the program");
    assert.strictEqual(
      raw!.lamports,
      await connection.getMinimumBalanceForRentExemption(51),
      "SensorNode should hold exactly the rent-exempt minimum for a 51-byte account",
    );
  });

  it("submit_data advances the counter and stores the latest reading", async () => {
    const authority = await freshAuthority();
    const [node] = sensorPda(authority.publicKey);

    await program.methods
      .initializeNode()
      .accounts({
        sensorNode: node,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const transmit = (aqi: number) =>
      program.methods
        .submitData(aqi)
        .accounts({ sensorNode: node, authority: authority.publicKey })
        .signers([authority])
        .rpc();

    await transmit(42);
    let account = await fetchNode(node, "submit_data(42)");
    assert.strictEqual(account.dataSubmissions.toNumber(), 1, "first packet should count as 1");
    assert.strictEqual(account.lastAqiReading, 42, "latest reading should be 42");

    await transmit(88);
    account = await fetchNode(node, "submit_data(88)");
    assert.strictEqual(account.dataSubmissions.toNumber(), 2, "second packet should count as 2");
    assert.strictEqual(account.lastAqiReading, 88, "latest reading should be 88");

    // Boundary readings the EPA scale permits must both land.
    await transmit(0);
    await transmit(500);
    account = await fetchNode(node, "submit_data(0/500)");
    assert.strictEqual(account.dataSubmissions.toNumber(), 4, "boundary packets should be counted");
    assert.strictEqual(account.lastAqiReading, 500, "AQI 500 should be accepted");
  });

  it("rejects AQI readings outside the 0-500 EPA scale", async () => {
    const authority = await freshAuthority();
    const [node] = sensorPda(authority.publicKey);

    await program.methods
      .initializeNode()
      .accounts({
        sensorNode: node,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const before = await fetchNode(node, "before rejection");
    assert.strictEqual(before.dataSubmissions.toNumber(), 0);

    for (const aqi of [501, 65_535]) {
      let rejected = false;
      try {
        await program.methods
          .submitData(aqi)
          .accounts({ sensorNode: node, authority: authority.publicKey })
          .signers([authority])
          .rpc();
      } catch (error) {
        rejected = true;
        assertRejectedByCluster(error, `submit_data(${aqi})`);
      }
      assert.isTrue(rejected, `submit_data(${aqi}) should be rejected by InvalidAqi`);
    }

    const after = await fetchNode(node, "after rejection");
    assert.strictEqual(
      after.dataSubmissions.toNumber(),
      0,
      "a rejected packet must not advance data_submissions",
    );
    assert.strictEqual(after.lastAqiReading, 0, "a rejected packet must not store a reading");
  });

  it("rejects re-initializing an existing SensorNode", async () => {
    const authority = await freshAuthority();
    const [node, bump] = sensorPda(authority.publicKey);

    const accounts = {
      sensorNode: node,
      authority: authority.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    };
    await program.methods.initializeNode().accounts(accounts).signers([authority]).rpc();

    let rejected = false;
    try {
      await program.methods.initializeNode().accounts(accounts).signers([authority]).rpc();
    } catch (error) {
      rejected = true;
      assertRejectedByCluster(error, "second initialize_node");
    }
    assert.isTrue(rejected, "initialize_node should not be replayable against a live PDA");

    const account = await fetchNode(node, "after replay attempt");
    assert.strictEqual(account.dataSubmissions.toNumber(), 0, "replay must leave state alone");
    assert.strictEqual(account.bump, bump, "replay must not re-derive the bump");
  });

  it("rejects submit_data signed by an authority other than the node owner", async () => {
    const owner = await freshAuthority();
    const impostor = Keypair.generate();
    const [ownedNode] = sensorPda(owner.publicKey);

    await program.methods
      .initializeNode()
      .accounts({
        sensorNode: ownedNode,
        authority: owner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    await program.methods
      .submitData(64)
      .accounts({ sensorNode: ownedNode, authority: owner.publicKey })
      .signers([owner])
      .rpc();

    const before = await fetchNode(ownedNode, "before imposture");
    assert.strictEqual(before.dataSubmissions.toNumber(), 1);

    // The impostor points at the victim's PDA while signing as `authority`, so both
    // the seeds check and `has_one = authority` are violated. It submits a distinct
    // AQI so that a silent overwrite of the owner's reading would be observable.
    let rejected = false;
    try {
      await program.methods
        .submitData(300)
        .accounts({ sensorNode: ownedNode, authority: impostor.publicKey })
        .signers([impostor])
        .rpc();
    } catch (error) {
      rejected = true;
      assertRejectedByCluster(error, "impostor submit_data");
    }
    assert.isTrue(rejected, "a non-owner must not be able to transmit for someone else's node");

    const after = await fetchNode(ownedNode, "after imposture");
    assert.strictEqual(
      after.dataSubmissions.toNumber(),
      before.dataSubmissions.toNumber(),
      "imposture must not advance the owner's counter",
    );
    assert.strictEqual(after.lastAqiReading, 64, "imposture must not overwrite the owner's reading");
    assert.isTrue(
      after.authority.equals(owner.publicKey),
      "imposture must not reassign authority",
    );

    // The impostor's own PDA must not have been silently minted as a side effect.
    const [impostorNode] = sensorPda(impostor.publicKey);
    assert.isNull(
      await connection.getAccountInfo(impostorNode, "confirmed"),
      "impostor must not gain a SensorNode from the failed transaction",
    );
  });
});
