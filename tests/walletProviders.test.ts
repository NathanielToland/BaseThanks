import assert from "node:assert/strict";
import {
  findWalletProvider,
  resetWalletProviderDiscoveryForTests,
  setupEip6963WalletDiscovery
} from "../lib/walletProviders";

type ProviderMock = Record<string, unknown> & { id: string };

class WindowMock extends EventTarget {
  ethereum?: ProviderMock & { providers?: ProviderMock[] };
  okxwallet?: ProviderMock | { ethereum: ProviderMock };
  okxWallet?: ProviderMock;
}

function setWindow(win: WindowMock) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: win
  });
}

function provider(id: string, flags: Record<string, unknown>): ProviderMock {
  return {
    id,
    request: async () => [],
    on: () => undefined,
    removeListener: () => undefined,
    ...flags
  };
}

function reset(win = new WindowMock()) {
  resetWalletProviderDiscoveryForTests();
  setWindow(win);
  return win;
}

{
  const win = reset();
  const okx = provider("okx-only", { isOkxWallet: true });
  win.ethereum = okx;
  assert.equal(findWalletProvider("okx"), okx, "only OKX should be detected as OKX");
  assert.equal(findWalletProvider("metamask"), undefined, "OKX must not be detected as MetaMask");
}

{
  const win = reset();
  const metaMask = provider("metamask-only", { isMetaMask: true });
  win.ethereum = metaMask;
  assert.equal(findWalletProvider("metamask"), metaMask, "only MetaMask should be detected as MetaMask");
  assert.equal(findWalletProvider("okx"), undefined, "MetaMask must not be detected as OKX");
}

{
  const win = reset();
  const okx = provider("okx-in-array", { isOkxWallet: true, isMetaMask: true });
  const metaMask = provider("metamask-in-array", { isMetaMask: true });
  win.ethereum = provider("host", {});
  win.ethereum.providers = [metaMask, okx];
  assert.equal(findWalletProvider("okx"), okx, "OKX button should select OKX from providers array");
  assert.equal(findWalletProvider("metamask"), metaMask, "MetaMask button should skip OKX-compatible provider");
}

{
  const win = reset();
  const baseInjected = provider("base-app-injected", {});
  win.ethereum = baseInjected;
  assert.equal(findWalletProvider("okx"), undefined, "unbranded Base injected provider must not become OKX");
  assert.equal(findWalletProvider("metamask"), undefined, "unbranded Base injected provider must not become MetaMask");
}

{
  const win = reset();
  const eip6963Okx = provider("eip6963-okx", { isOKExWallet: true });
  setupEip6963WalletDiscovery();
  win.dispatchEvent(
    new CustomEvent("eip6963:announceProvider", {
      detail: {
        info: { uuid: "okx-uuid", name: "OKX Wallet", rdns: "com.okx.wallet" },
        provider: eip6963Okx
      }
    })
  );
  assert.equal(findWalletProvider("okx"), eip6963Okx, "EIP-6963 OKX provider should be detected");
}

{
  const win = reset();
  const okx = provider("okxwallet-ethereum", { isOKExWallet: true });
  win.okxwallet = { ethereum: okx };
  assert.equal(findWalletProvider("okx"), okx, "window.okxwallet.ethereum should be detected");
}

console.log("wallet provider detection tests passed");
