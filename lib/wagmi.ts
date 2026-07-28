import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { coinbaseWallet } from "wagmi/connectors/coinbaseWallet";
import { getDataSuffix } from "@/lib/env";
import { findWalletProvider } from "@/lib/walletProviders";

export const dataSuffix = getDataSuffix();

export const okxConnector = injected({
  shimDisconnect: true,
  target: () => ({
    id: "okx",
    name: "OKX Wallet",
    provider: () => findWalletProvider("okx")
  })
});

export const metaMaskConnector = injected({
  shimDisconnect: true,
  target: () => ({
    id: "metaMask",
    name: "MetaMask",
    provider: () => findWalletProvider("metamask")
  })
});

export const coinbaseConnector = coinbaseWallet({
  appName: "BaseThanks",
  preference: { options: "eoaOnly" }
});

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [okxConnector, metaMaskConnector, coinbaseConnector],
  transports: {
    [base.id]: http()
  }
});
