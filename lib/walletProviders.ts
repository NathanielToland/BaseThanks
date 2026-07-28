import type { EIP1193Provider } from "viem";

export type WalletKind = "okx" | "metamask" | "coinbase";
export type WalletProvider = EIP1193Provider & Record<string, unknown>;

type AnnouncedProvider = {
  info?: {
    name?: string;
    rdns?: string;
    uuid?: string;
  };
  provider?: WalletProvider;
};

const announcedProviders = new Map<string, WalletProvider>();
let eip6963Started = false;

function getWindowLike(): (Window & Record<string, unknown>) | undefined {
  if (typeof window === "undefined") return undefined;
  return window as unknown as Window & Record<string, unknown>;
}

export function isOkxProvider(provider: unknown): provider is WalletProvider {
  const candidate = provider as Record<string, unknown> | undefined;
  return Boolean(candidate && (candidate.isOkxWallet === true || candidate.isOKExWallet === true));
}

export function isMetaMaskProvider(provider: unknown): provider is WalletProvider {
  const candidate = provider as Record<string, unknown> | undefined;
  return Boolean(candidate && candidate.isMetaMask === true && !isOkxProvider(candidate));
}

export function isCoinbaseProvider(provider: unknown): provider is WalletProvider {
  const candidate = provider as Record<string, unknown> | undefined;
  return Boolean(candidate && candidate.isCoinbaseWallet === true);
}

function addProvider(list: WalletProvider[], provider: unknown) {
  if (!provider || typeof provider !== "object") return;
  const walletProvider = provider as WalletProvider;
  if (!list.includes(walletProvider)) list.push(walletProvider);
}

function collectProviders(win = getWindowLike()): WalletProvider[] {
  const providers: WalletProvider[] = [];
  if (!win) return providers;

  const ethereum = win.ethereum as (WalletProvider & { providers?: unknown[] }) | undefined;
  if (Array.isArray(ethereum?.providers)) {
    for (const provider of ethereum.providers) addProvider(providers, provider);
  }

  for (const provider of announcedProviders.values()) addProvider(providers, provider);

  const okxwallet = win.okxwallet as { ethereum?: WalletProvider } | WalletProvider | undefined;
  addProvider(providers, okxwallet);
  addProvider(providers, (okxwallet as { ethereum?: WalletProvider } | undefined)?.ethereum);
  addProvider(providers, win.okxWallet);
  addProvider(providers, ethereum);

  return providers;
}

export function setupEip6963WalletDiscovery() {
  const win = getWindowLike();
  if (!win || eip6963Started) return;
  eip6963Started = true;

  win.addEventListener("eip6963:announceProvider", (event) => {
    const detail = (event as CustomEvent<AnnouncedProvider>).detail;
    if (!detail?.provider) return;
    const key = detail.info?.uuid ?? detail.info?.rdns ?? detail.info?.name ?? String(announcedProviders.size);
    announcedProviders.set(key, detail.provider);
  });

  win.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function findWalletProvider(kind: WalletKind): WalletProvider | undefined {
  setupEip6963WalletDiscovery();
  const matches = kind === "okx" ? isOkxProvider : kind === "metamask" ? isMetaMaskProvider : isCoinbaseProvider;
  return collectProviders().find(matches);
}

export function isWalletDetected(kind: WalletKind): boolean {
  return Boolean(findWalletProvider(kind));
}

export function resetWalletProviderDiscoveryForTests() {
  announcedProviders.clear();
  eip6963Started = false;
}
