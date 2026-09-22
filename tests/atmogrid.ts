import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

// Cast to `any` so the test compiles before `anchor build` emits target/types.
const program = (anchor.workspace as any).Atmogrid;
const authority: anchor.web3.PublicKey = provider.wallet.publicKey;

const [sensorNode, bump] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("sensor"), authority.toBuffer()],
  program.programId,
);

describe("atmogrid", () => {
  before(async () => {
    const balance = await provider.connection.getBalance(authority);
    if (balance < anchor.web3.LAMPORTS_PER_SOL) {
      await provider.connection.requestAirdrop(authority, 2 * anchor.web3.LAMPORTS_PER_SOL);
    }
  });

  it("initialize_node then submit_data advances the counter", async () => {
    const existing = await provider.connection.getAccountInfo(sensorNode);
    if (existing) {
      // Re-running against a live cluster: wipe local expectations instead of failing.
      console.warn(`SensorNode ${sensorNode.toBase58()} already exists — skipping init.`);
    } else {
      await program.methods
        .initializeNode()
        .accounts({ sensorNode, authority, systemProgram: anchor.web3.SystemProgram.programId })
        .rpc();
    }

    let node = await program.account.sensorNode.fetch(sensorNode);
    assert.equal(node.bump, bump, "stored bump should match derivation");
    const before = Number(node.dataSubmissions);

    const reading = 137;
    await program.methods
      .submitData(reading)
      .accounts({ sensorNode, authority })
      .rpc();

    node = await program.account.sensorNode.fetch(sensorNode);
    assert.equal(Number(node.dataSubmissions), before + 1, "counter should increment");
    assert.equal(node.lastAqiReading, reading, "latest reading should persist");
  });

  it("rejects an out-of-range AQI reading", async () => {
    try {
      await program.methods.submitData(9_000).accounts({ sensorNode, authority }).rpc();
      assert.fail("submit_data accepted AQI > 500");
    } catch (error: any) {
      assert.include(String(error.message ?? error), "EPA", "should surface InvalidAqi");
    }
  });
});
