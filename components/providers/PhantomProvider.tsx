"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { Connection, Transaction, type PublicKey } from "@solana/web3.js";

import { RPC_URL } from "@/lib/config";

export type PhantomAdapter = PhantomWalletAdapter;

type PhantomContextValue = {
  connection: Connection;
  adapter: PhantomWalletAdapter;
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  /** Phantom extension detected in the browser. */
  installed: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  /** Sign with the connected wallet and return the raw, signed bytes. */
  sign: (transaction: Transaction) => Promise<Uint8Array>;
  walletAddress: string | null;
};

const PhantomContext = createContext<PhantomContextValue | null>(null);

function detectPhantom() {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    phantom?: { solana?: { isPhantom?: boolean } };
    solana?: { isPhantom?: boolean; phantom?: unknown };
  };
  return Boolean(w.phantom?.solana?.isPhantom || w.solana?.isPhantom || w.solana?.phantom);
}

export function PhantomProvider({ children }: { children: ReactNode }) {
  const connection = useMemo(() => new Connection(RPC_URL, "confirmed"), []);
  const adapter = useMemo(() => new PhantomWalletAdapter(), []);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [installed, setInstalled] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setInstalled(detectPhantom());

    const sync = () => {
      if (!mounted.current) return;
      setConnected(adapter.connected);
      setConnecting(adapter.connecting);
      setPublicKey(adapter.publicKey ?? null);
    };

    (adapter as any).on("statusChange", sync);
    adapter.on("connect", sync);
    adapter.on("disconnect", sync);
    adapter.on("error", sync);

    return () => {
      mounted.current = false;
      (adapter as any).off("statusChange", sync);
      adapter.off("connect", sync);
      adapter.off("disconnect", sync);
      adapter.off("error", sync);
    };
  }, [adapter]);

  const connect = useCallback(async () => {
    if (!detectPhantom()) {
      setInstalled(false);
      return false;
    }
    setInstalled(true);
    setConnecting(true);
    try {
      await adapter.connect();
      return true;
    } catch {
      // User rejected, or the extension is locked. `statusChange` resets state.
      return false;
    } finally {
      if (mounted.current) setConnecting(false);
    }
  }, [adapter]);

  const disconnect = useCallback(async () => {
    try {
      await adapter.disconnect();
    } catch {
      /* already gone */
    }
  }, [adapter]);

  const sign = useCallback(
    async (transaction: Transaction) => {
      const signed = await adapter.signTransaction(transaction);
      return new Uint8Array(signed.serialize());
    },
    [adapter],
  );

  const value = useMemo<PhantomContextValue>(
    () => ({
      connection,
      adapter,
      publicKey,
      connected,
      connecting,
      installed,
      connect,
      disconnect,
      sign,
      walletAddress: publicKey ? publicKey.toBase58() : null,
    }),
    [connection, adapter, publicKey, connected, connecting, installed, connect, disconnect, sign],
  );

  return <PhantomContext.Provider value={value}>{children}</PhantomContext.Provider>;
}

export function usePhantom(): PhantomContextValue {
  const ctx = useContext(PhantomContext);
  if (!ctx) throw new Error("usePhantom must be used inside <PhantomProvider>.");
  return ctx;
}
