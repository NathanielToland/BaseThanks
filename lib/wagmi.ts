import { Attribution } from "ox/erc8021";
import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { base } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { baseAccount } from "wagmi/connectors/baseAccount";
import { coinbaseWallet } from "wagmi/connectors/coinbaseWallet";
import { builderCode } from "@/lib/env";
import { findWalletProvider } from "@/lib/walletProviders";

export const dataSuffix = Attribution.toDataSuffix({
  codes: [builderCode]
}) as `0x${string}`;

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
  appName: "BaseKudos",
  preference: { options: "eoaOnly" }
});

export const baseAccountConnector = baseAccount({
  appName: "BaseKudos",
  preference: { options: "all" }
});

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [okxConnector, metaMaskConnector, coinbaseConnector, baseAccountConnector],
  storage: createStorage({
    storage: cookieStorage
  }),
  transports: {
    [base.id]: http()
  }
});
