"use client";

import { Heart, Inbox, Link2, LogOut, Send, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { concatHex, encodeFunctionData, isAddress, zeroAddress, type Address } from "viem";
import { readContract, sendTransaction, waitForTransactionReceipt } from "wagmi/actions";
import { useAccount, useConfig, useConnect, useDisconnect } from "wagmi";
import { baseThanksAbi } from "@/lib/abi/baseThanksAbi";
import { requireContractAddress } from "@/lib/contract";
import { attributionVersion, builderCode, chainId, contractAddress, hasContractAddress } from "@/lib/env";
import { errorMessage, normalizeThanks, normalizeUser, safeBigInt, type ThanksNote, type UserStats } from "@/lib/normalize";
import { coinbaseConnector, dataSuffix, metaMaskConnector, okxConnector, wagmiConfig } from "@/lib/wagmi";
import { findWalletProvider, setupEip6963WalletDiscovery, type WalletKind, type WalletProvider } from "@/lib/walletProviders";

const thanksTypes = ["helpful", "kind", "support", "builder", "community"] as const;
const maxMessageLength = 280;

const emptyStats: UserStats = {
  sentCount: 0,
  receivedCount: 0,
  rewardPoints: 0,
  referralOf: zeroAddress
};

function shortAddress(value?: string) {
  if (!value) return "Not connected";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatTime(seconds: number) {
  if (!seconds) return "Pending time";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(seconds * 1000));
}

function connectorFor(kind: WalletKind) {
  if (kind === "okx") return okxConnector;
  if (kind === "metamask") return metaMaskConnector;
  return coinbaseConnector;
}

function walletLabel(kind: WalletKind) {
  if (kind === "okx") return "OKX Wallet";
  if (kind === "metamask") return "MetaMask";
  return "Coinbase Wallet";
}

function walletError(kind: WalletKind) {
  return `${walletLabel(kind)} not detected.`;
}

export function BaseThanksApp() {
  const config = useConfig();
  const { address, isConnected, chain } = useAccount();
  const { connectAsync, isPending: isConnecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const [receiver, setReceiver] = useState("");
  const [message, setMessage] = useState("");
  const [thanksType, setThanksType] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState<UserStats>(emptyStats);
  const [totalThanks, setTotalThanks] = useState(0);
  const [publicWall, setPublicWall] = useState<ThanksNote[]>([]);
  const [receivedNotes, setReceivedNotes] = useState<ThanksNote[]>([]);
  const [detected, setDetected] = useState<Record<WalletKind, boolean>>({ okx: false, metamask: false, coinbase: false });
  const selectedProviderRef = useRef<WalletProvider | undefined>(undefined);
  const lastRefreshErrorRef = useRef("");

  const referrer = useMemo(() => {
    if (typeof window === "undefined") return zeroAddress;
    const value = new URLSearchParams(window.location.search).get("ref");
    return value && isAddress(value) ? (value as Address) : zeroAddress;
  }, []);

  const inviteLink = useMemo(() => {
    if (!address || typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("ref", address);
    return url.toString();
  }, [address]);

  const refreshDetection = useCallback(() => {
    setDetected({
      okx: Boolean(findWalletProvider("okx")),
      metamask: Boolean(findWalletProvider("metamask")),
      coinbase: Boolean(findWalletProvider("coinbase"))
    });
  }, []);

  useEffect(() => {
    setupEip6963WalletDiscovery();
    refreshDetection();
    const timer = window.setTimeout(refreshDetection, 350);
    window.addEventListener("eip6963:announceProvider", refreshDetection);
    window.addEventListener("ethereum#initialized", refreshDetection);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("eip6963:announceProvider", refreshDetection);
      window.removeEventListener("ethereum#initialized", refreshDetection);
    };
  }, [refreshDetection]);

  const refreshContractData = useCallback(async () => {
    if (!hasContractAddress) {
      setError("Contract address is missing or invalid.");
      return;
    }

    try {
      const addressValue = requireContractAddress();
      const totalRaw = await readContract(wagmiConfig, {
        address: addressValue,
        abi: baseThanksAbi,
        functionName: "totalThanks"
      });
      const total = Number(safeBigInt(totalRaw));
      setTotalThanks(total);

      const ids = Array.from({ length: Math.min(total, 10) }, (_, index) => BigInt(total - index - 1));
      const notes = await Promise.all(
        ids.map(async (id) => {
          const raw = await readContract(wagmiConfig, {
            address: addressValue,
            abi: baseThanksAbi,
            functionName: "getThanks",
            args: [id]
          });
          return normalizeThanks(raw, id);
        })
      );
      setPublicWall(notes);

      if (address) {
        const userRaw = await readContract(wagmiConfig, {
          address: addressValue,
          abi: baseThanksAbi,
          functionName: "getUser",
          args: [address]
        });
        setStats(normalizeUser(userRaw));
        setReceivedNotes(notes.filter((note) => note.receiver.toLowerCase() === address.toLowerCase()));
      } else {
        setStats(emptyStats);
        setReceivedNotes([]);
      }

      if (lastRefreshErrorRef.current) {
        lastRefreshErrorRef.current = "";
        setError("");
      }
    } catch (caught) {
      const msg = `Contract read failed: ${errorMessage(caught)}`;
      lastRefreshErrorRef.current = msg;
      setError(msg);
    }
  }, [address]);

  useEffect(() => {
    void refreshContractData();
  }, [refreshContractData]);

  async function connectWallet(kind: WalletKind) {
    setError("");
    setStatus("");
    selectedProviderRef.current = undefined;

    try {
      const provider = findWalletProvider(kind);
      if (!provider) {
        setError(walletError(kind));
        return;
      }
      selectedProviderRef.current = provider;
      await connectAsync({ connector: connectorFor(kind), chainId });
      setStatus(`${walletLabel(kind)} connected.`);
    } catch (caught) {
      setError(`Wallet connection failed: ${errorMessage(caught)}`);
    }
  }

  async function disconnectWallet() {
    try {
      selectedProviderRef.current = undefined;
      await disconnectAsync();
      setStatus("Wallet disconnected.");
    } catch (caught) {
      setError(`Wallet disconnect failed: ${errorMessage(caught)}`);
    }
  }

  async function sendThanks() {
    setError("");
    setStatus("");

    if (!isConnected || !address) {
      setError("Connect a wallet before sending thanks.");
      return;
    }
    if (!hasContractAddress) {
      setError("Contract address is missing or invalid.");
      return;
    }
    if (!isAddress(receiver)) {
      setError("Receiver wallet address is invalid.");
      return;
    }
    const trimmed = message.trim();
    if (!trimmed || trimmed.length > maxMessageLength) {
      setError("Message must be between 1 and 280 characters.");
      return;
    }

    try {
      setStatus("Waiting for wallet confirmation...");
      const callData = encodeFunctionData({
        abi: baseThanksAbi,
        functionName: "sendThanks",
        args: [receiver as Address, trimmed, thanksType, referrer]
      });
      const data = concatHex([callData, dataSuffix]);
      const hash = await sendTransaction(config, {
        to: requireContractAddress(),
        data,
        value: 0n,
        chainId
      });
      setStatus("Transaction sent. Waiting for Base confirmation...");
      await waitForTransactionReceipt(config, { hash });
      setStatus("Thanks sent on Base.");
      setMessage("");
      await refreshContractData();
    } catch (caught) {
      const msg = errorMessage(caught);
      if (/rejected|denied|cancel/i.test(msg)) {
        setError("Transaction was rejected by the user.");
      } else {
        setError(`Transaction failed or reverted: ${msg}`);
      }
    }
  }

  const walletButtons: WalletKind[] = ["okx", "metamask", "coinbase"];

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 border-b border-[#ecd7cd] bg-[#fffaf4]/88 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <a className="text-xl font-semibold tracking-normal text-[#342621]" href="#send">
            BaseThanks
          </a>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-md border border-[#ecd7cd] bg-white/70 px-3 py-2 text-sm text-[#806d65] sm:inline">
              {shortAddress(address)}
            </span>
            {isConnected ? (
              <button
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-[#d8bdb0] bg-white px-3 text-sm font-semibold text-[#5a4239]"
                onClick={disconnectWallet}
                type="button"
              >
                <LogOut size={16} />
                Disconnect
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-5 px-4 py-6 md:grid-cols-[1.05fr_0.95fr]">
        <div className="paper-texture rounded-lg border border-[#ecd7cd] p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-normal text-[#df6f5f]">Send thanks on Base.</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight text-[#342621] sm:text-5xl">
            Small notes of gratitude, kept onchain.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#806d65]">
            Write a kind note, choose a reason, and keep the record public without payments, minting, or reward pools.
          </p>

          {!isConnected ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {walletButtons.map((kind) => (
                <button
                  className="focus-ring flex min-h-12 items-center justify-center rounded-md border border-[#d8bdb0] bg-white px-3 text-sm font-semibold text-[#342621] shadow-sm transition hover:border-[#df6f5f]"
                  disabled={isConnecting}
                  key={kind}
                  onClick={() => void connectWallet(kind)}
                  type="button"
                >
                  {walletLabel(kind)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 text-xs text-[#806d65] sm:grid-cols-3">
            {walletButtons.map((kind) => (
              <span key={kind}>{walletLabel(kind)}: {detected[kind] ? "detected" : "not detected"}</span>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-[#ecd7cd] bg-[#fffaf4] p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Contract Info</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <InfoRow label="Contract address" value={contractAddress || "Missing"} />
            <InfoRow label="Network" value="Base" />
            <InfoRow label="Chain ID" value={String(chain?.id ?? chainId)} />
            <InfoRow label="Attribution status" value={`Onchain attribution: suffix enabled · ${attributionVersion} · ...${dataSuffix.slice(-12)}`} />
            <InfoRow label="Builder code" value={builderCode} />
            <InfoRow label="dataSuffix tail" value={dataSuffix.slice(-12)} />
          </dl>
        </aside>
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 px-4 md:grid-cols-[1fr_0.8fr]" id="send">
        <form className="rounded-lg border border-[#ecd7cd] bg-[#fffaf4] p-5 shadow-sm" onSubmit={(event) => { event.preventDefault(); void sendThanks(); }}>
          <h2 className="text-2xl font-semibold">Send a thank-you note</h2>
          <label className="mt-5 block text-sm font-semibold" htmlFor="receiver">Receiver wallet address</label>
          <input
            className="focus-ring mt-2 w-full rounded-md border border-[#d8bdb0] bg-white px-3 py-3 text-sm"
            id="receiver"
            onChange={(event) => setReceiver(event.target.value)}
            placeholder="0x..."
            value={receiver}
          />
          <label className="mt-4 block text-sm font-semibold" htmlFor="message">Thanks message</label>
          <textarea
            className="focus-ring mt-2 min-h-28 w-full resize-y rounded-md border border-[#d8bdb0] bg-white px-3 py-3 text-sm leading-6"
            id="message"
            maxLength={maxMessageLength}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Thank you for helping the community ship with care."
            value={message}
          />
          <div className="mt-2 text-right text-xs text-[#806d65]">{message.length}/{maxMessageLength}</div>
          <label className="mt-3 block text-sm font-semibold" htmlFor="thanksType">Thanks type</label>
          <select
            className="focus-ring mt-2 w-full rounded-md border border-[#d8bdb0] bg-white px-3 py-3 text-sm"
            id="thanksType"
            onChange={(event) => setThanksType(Number.parseInt(event.target.value, 10))}
            value={thanksType}
          >
            {thanksTypes.map((type, index) => (
              <option key={type} value={index}>{type}</option>
            ))}
          </select>
          <button className="focus-ring mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#df6f5f] px-4 text-sm font-semibold text-white shadow-sm" type="submit">
            <Send size={17} />
            Send Thanks
          </button>
          {status ? <p className="mt-4 rounded-md bg-[#f8fbf0] px-3 py-2 text-sm text-[#4f6849]">{status}</p> : null}
          {error ? <p className="mt-4 rounded-md border border-[#e7b6a9] bg-[#fff1ec] px-3 py-2 text-sm text-[#9a4334]">{error}</p> : null}
        </form>

        <div className="grid content-start gap-4">
          <Stats stats={stats} totalThanks={totalThanks} />
          <div className="rounded-lg border border-[#ecd7cd] bg-[#fffaf4] p-5 shadow-sm" id="invite">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Link2 size={18} /> Invite</h2>
            <p className="mt-2 text-sm text-[#806d65]">Share your referral link after connecting a wallet.</p>
            <input className="mt-3 w-full rounded-md border border-[#d8bdb0] bg-white px-3 py-3 text-xs" readOnly value={inviteLink || "Connect a wallet to generate a link."} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 px-4 py-6 md:grid-cols-2" id="wall">
        <NoteList icon={<Users size={18} />} title="Public Thanks Wall" notes={publicWall} />
        <NoteList icon={<Inbox size={18} />} title="My Received Thanks" notes={receivedNotes} />
      </section>

      <nav className="fixed inset-x-0 bottom-0 border-t border-[#ecd7cd] bg-[#fffaf4]/94 px-4 py-2 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 text-xs font-semibold text-[#5a4239]">
          <a className="flex flex-col items-center gap-1 py-1" href="#send"><Send size={17} />Send</a>
          <a className="flex flex-col items-center gap-1 py-1" href="#wall"><Users size={17} />Wall</a>
          <a className="flex flex-col items-center gap-1 py-1" href="#received"><Inbox size={17} />Received</a>
          <a className="flex flex-col items-center gap-1 py-1" href="#invite"><Link2 size={17} />Invite</a>
        </div>
      </nav>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs uppercase tracking-normal text-[#806d65]">{label}</dt>
      <dd className="break-words font-mono text-xs text-[#342621]">{value}</dd>
    </div>
  );
}

function Stats({ stats, totalThanks }: { stats: UserStats; totalThanks: number }) {
  const items = [
    ["Thanks Sent", stats.sentCount, Heart],
    ["Thanks Received", stats.receivedCount, Inbox],
    ["Reward Points", stats.rewardPoints, Heart],
    ["Total Thanks", totalThanks, Users]
  ] as const;

  return (
    <section className="grid grid-cols-2 gap-3">
      {items.map(([label, value, Icon]) => (
        <div className="rounded-lg border border-[#ecd7cd] bg-[#fffaf4] p-4 shadow-sm" key={label}>
          <Icon className="text-[#df6f5f]" size={18} />
          <div className="mt-3 text-2xl font-semibold">{value}</div>
          <div className="mt-1 text-xs text-[#806d65]">{label}</div>
        </div>
      ))}
    </section>
  );
}

function NoteList({ icon, notes, title }: { icon: React.ReactNode; notes: ThanksNote[]; title: string }) {
  return (
    <section className="rounded-lg border border-[#ecd7cd] bg-[#fffaf4] p-5 shadow-sm" id={title === "My Received Thanks" ? "received" : undefined}>
      <h2 className="flex items-center gap-2 text-xl font-semibold">{icon}{title}</h2>
      <div className="mt-4 grid gap-3">
        {notes.length ? notes.map((note) => <ThanksCard key={note.id} note={note} />) : <p className="text-sm text-[#806d65]">No thanks notes yet.</p>}
      </div>
    </section>
  );
}

function ThanksCard({ note }: { note: ThanksNote }) {
  return (
    <article className="paper-texture rounded-lg border border-[#ecd7cd] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#806d65]">
        <span>{thanksTypes[note.thanksType] ?? "thanks"}</span>
        <time>{formatTime(note.timestamp)}</time>
      </div>
      <p className="mt-3 break-words text-sm leading-6 text-[#342621]">{note.message || "A quiet thanks note."}</p>
      <div className="mt-4 grid gap-1 font-mono text-[11px] text-[#806d65]">
        <span>From {shortAddress(note.sender)}</span>
        <span>To {shortAddress(note.receiver)}</span>
      </div>
    </article>
  );
}
