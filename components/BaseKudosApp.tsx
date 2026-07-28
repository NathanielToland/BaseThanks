"use client";

import { Gift, Inbox, Link2, LogOut, Send, Sparkles, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { concatHex, encodeFunctionData, isAddress, zeroAddress, type Address } from "viem";
import { readContract, sendTransaction, waitForTransactionReceipt } from "wagmi/actions";
import { useAccount, useConfig, useConnect, useDisconnect } from "wagmi";
import { baseKudosAbi } from "@/lib/abi/baseKudosAbi";
import { requireContractAddress } from "@/lib/contract";
import { attributionVersion, builderCode, chainId, contractAddress, hasContractAddress } from "@/lib/env";
import { errorMessage, normalizeKudos, normalizeUser, safeBigInt, type KudosCard, type UserStats } from "@/lib/normalize";
import { coinbaseConnector, dataSuffix, metaMaskConnector, okxConnector, wagmiConfig } from "@/lib/wagmi";
import { findWalletProvider, setupEip6963WalletDiscovery, type WalletKind, type WalletProvider } from "@/lib/walletProviders";

const cardThemes = [
  { name: "Great Work", tone: "bg-[#fff1a8] border-[#ecd56f] text-[#4d3d09]" },
  { name: "Keep Going", tone: "bg-[#dff4df] border-[#acd5ac] text-[#284d2a]" },
  { name: "You Did It", tone: "bg-[#ffd6cf] border-[#efaaa0] text-[#6a3029]" }
] as const;
const maxMessageLength = 240;

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

export function BaseKudosApp() {
  const config = useConfig();
  const { address, isConnected, chain } = useAccount();
  const { connectAsync, isPending: isConnecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const [receiver, setReceiver] = useState("");
  const [message, setMessage] = useState("");
  const [cardType, setCardType] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [stats, setStats] = useState<UserStats>(emptyStats);
  const [totalKudos, setTotalKudos] = useState(0);
  const [kudosWall, setKudosWall] = useState<KudosCard[]>([]);
  const [myCards, setMyCards] = useState<KudosCard[]>([]);
  const [cardBalances, setCardBalances] = useState([0, 0, 0]);
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
        abi: baseKudosAbi,
        functionName: "totalKudos"
      });
      const total = Number(safeBigInt(totalRaw));
      setTotalKudos(total);

      const ids = Array.from({ length: Math.min(total, 10) }, (_, index) => BigInt(total - index - 1));
      const notes = await Promise.all(
        ids.map(async (id) => {
          const raw = await readContract(wagmiConfig, {
            address: addressValue,
            abi: baseKudosAbi,
            functionName: "getKudos",
            args: [id]
          });
          return normalizeKudos(raw, id);
        })
      );
      setKudosWall(notes);

      if (address) {
        const userRaw = await readContract(wagmiConfig, {
          address: addressValue,
          abi: baseKudosAbi,
          functionName: "getUser",
          args: [address]
        });
        setStats(normalizeUser(userRaw));
        setMyCards(notes.filter((note) => note.receiver.toLowerCase() === address.toLowerCase()));

        const balances = await Promise.all(
          [0n, 1n, 2n].map(async (id) => {
            const raw = await readContract(wagmiConfig, {
              address: addressValue,
              abi: baseKudosAbi,
              functionName: "balanceOf",
              args: [address, id]
            });
            return Number(safeBigInt(raw));
          })
        );
        setCardBalances(balances);
      } else {
        setStats(emptyStats);
        setMyCards([]);
        setCardBalances([0, 0, 0]);
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

  async function sendKudos() {
    setError("");
    setStatus("");

    if (!isConnected || !address) {
      setError("Connect a wallet before sending kudos.");
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
    if (cardType < 0 || cardType >= cardThemes.length) {
      setError("Card theme is invalid.");
      return;
    }
    const trimmed = message.trim();
    if (trimmed.length > maxMessageLength) {
      setError("Message must be 240 characters or fewer.");
      return;
    }

    try {
      setIsSending(true);
      setStatus("Waiting for wallet confirmation...");
      const callData = encodeFunctionData({
        abi: baseKudosAbi,
        functionName: "sendKudos",
        args: [receiver as Address, BigInt(cardType), trimmed, referrer]
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
      setStatus("Kudos sent on Base. Send again whenever you want.");
      setMessage("");
      await refreshContractData();
    } catch (caught) {
      const msg = errorMessage(caught);
      if (/rejected|denied|cancel/i.test(msg)) {
        setError("Transaction was rejected by the user.");
      } else {
        setError(`Transaction failed or reverted: ${msg}`);
      }
    } finally {
      setIsSending(false);
    }
  }

  const walletButtons: WalletKind[] = ["okx", "metamask", "coinbase"];
  const hasReceiver = isAddress(receiver);
  const primaryLabel = !isConnected ? "Connect Wallet" : isSending ? "Sending..." : !receiver ? "Add Receiver" : hasReceiver ? "Send Kudos" : "Fix Receiver";

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 border-b border-[#ecd7cd] bg-[#fffaf4]/88 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <a className="text-xl font-semibold tracking-normal text-[#342621]" href="#send">
            BaseKudos
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
          <p className="text-sm font-semibold uppercase tracking-normal text-[#df6f5f]">Send kudos on Base.</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight text-[#342621] sm:text-5xl">
            Encouragement cards for every small win.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#806d65]">
            Pick a card, write a note if you want, and mint a small ERC1155 kudos card to any wallet.
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
        <form className="rounded-lg border border-[#ecd7cd] bg-[#fffaf4] p-5 shadow-sm" onSubmit={(event) => { event.preventDefault(); void sendKudos(); }}>
          <h2 className="text-2xl font-semibold">Send a kudos card</h2>
          <label className="mt-5 block text-sm font-semibold" htmlFor="receiver">Receiver wallet address</label>
          <input
            className="focus-ring mt-2 w-full rounded-md border border-[#d8bdb0] bg-white px-3 py-3 text-sm"
            id="receiver"
            onChange={(event) => setReceiver(event.target.value)}
            placeholder="0x..."
            value={receiver}
          />

          <fieldset className="mt-4">
            <legend className="text-sm font-semibold">Card theme</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {cardThemes.map((theme, index) => (
                <button
                  className={`focus-ring min-h-20 rounded-lg border px-3 py-3 text-left text-sm font-semibold shadow-sm transition ${theme.tone} ${cardType === index ? "ring-2 ring-[#df6f5f]" : ""}`}
                  key={theme.name}
                  onClick={() => setCardType(index)}
                  type="button"
                >
                  <Sparkles size={16} />
                  <span className="mt-2 block">{theme.name}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mt-4 block text-sm font-semibold" htmlFor="message">Message</label>
          <textarea
            className="focus-ring mt-2 min-h-24 w-full resize-y rounded-md border border-[#d8bdb0] bg-white px-3 py-3 text-sm leading-6"
            id="message"
            maxLength={maxMessageLength}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Optional note for the card."
            value={message}
          />
          <div className="mt-2 text-right text-xs text-[#806d65]">{message.length}/{maxMessageLength}</div>
          <button
            className="focus-ring mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#df6f5f] px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isConnected || isSending || !hasReceiver}
            type="submit"
          >
            <Send size={17} />
            {primaryLabel}
          </button>
          {status ? <p className="mt-4 rounded-md bg-[#f8fbf0] px-3 py-2 text-sm text-[#4f6849]">{status}</p> : null}
          {error ? <p className="mt-4 rounded-md border border-[#e7b6a9] bg-[#fff1ec] px-3 py-2 text-sm text-[#9a4334]">{error}</p> : null}
        </form>

        <div className="grid content-start gap-4">
          <Stats stats={stats} totalKudos={totalKudos} cardBalances={cardBalances} />
          <div className="rounded-lg border border-[#ecd7cd] bg-[#fffaf4] p-5 shadow-sm" id="invite">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Link2 size={18} /> Invite</h2>
            <p className="mt-2 text-sm text-[#806d65]">Share your referral link after connecting a wallet.</p>
            <input className="mt-3 w-full rounded-md border border-[#d8bdb0] bg-white px-3 py-3 text-xs" readOnly value={inviteLink || "Connect a wallet to generate a link."} />
          </div>
          <div className="rounded-lg border border-[#ecd7cd] bg-[#fffaf4] p-5 shadow-sm" id="cards">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><WalletCards size={18} /> My Cards</h2>
            <div className="mt-3 grid gap-2">
              {cardThemes.map((theme, index) => (
                <div className={`rounded-lg border px-3 py-3 text-sm ${theme.tone}`} key={theme.name}>
                  <span className="font-semibold">{theme.name}</span>
                  <span className="float-right font-mono">{cardBalances[index]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 px-4 py-6 md:grid-cols-2" id="wall">
        <CardList icon={<Gift size={18} />} title="Kudos Wall" cards={kudosWall} />
        <CardList icon={<Inbox size={18} />} title="My Received Cards" cards={myCards} />
      </section>

      <nav className="fixed inset-x-0 bottom-0 border-t border-[#ecd7cd] bg-[#fffaf4]/94 px-4 py-2 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 text-xs font-semibold text-[#5a4239]">
          <a className="flex flex-col items-center gap-1 py-1" href="#send"><Send size={17} />Send</a>
          <a className="flex flex-col items-center gap-1 py-1" href="#cards"><WalletCards size={17} />Cards</a>
          <a className="flex flex-col items-center gap-1 py-1" href="#wall"><Gift size={17} />Wall</a>
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

function Stats({ stats, totalKudos, cardBalances }: { stats: UserStats; totalKudos: number; cardBalances: number[] }) {
  const items = [
    ["Kudos Sent", stats.sentCount, Send],
    ["Kudos Received", stats.receivedCount, Inbox],
    ["Reward Points", stats.rewardPoints, Sparkles],
    ["Cards Collected", cardBalances.reduce((sum, value) => sum + value, 0), WalletCards],
    ["Total Kudos", totalKudos, Gift]
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

function CardList({ cards, icon, title }: { cards: KudosCard[]; icon: React.ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-[#ecd7cd] bg-[#fffaf4] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-semibold">{icon}{title}</h2>
      <div className="mt-4 grid gap-3">
        {cards.length ? cards.map((card) => <KudosCardView card={card} key={card.id} />) : <p className="text-sm text-[#806d65]">No kudos cards yet.</p>}
      </div>
    </section>
  );
}

function KudosCardView({ card }: { card: KudosCard }) {
  const theme = cardThemes[card.cardType] ?? cardThemes[0];
  return (
    <article className={`rounded-lg border p-4 shadow-sm ${theme.tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs opacity-80">
        <span>{theme.name}</span>
        <time>{formatTime(card.timestamp)}</time>
      </div>
      <p className="mt-3 break-words text-sm leading-6">{card.message || "A small card for a small win."}</p>
      <div className="mt-4 grid gap-1 font-mono text-[11px] opacity-80">
        <span>From {shortAddress(card.sender)}</span>
        <span>To {shortAddress(card.receiver)}</span>
      </div>
    </article>
  );
}
