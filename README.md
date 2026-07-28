# BaseThanks

BaseThanks is a Base Mini App for sending small onchain gratitude notes.

## Features

- Send repeatable thanks notes to any non-zero wallet address.
- Send thanks to yourself without reverting.
- Track sent count, received count, reward points, referrals, and total thanks.

## Wallets

Only three wallet buttons are shown:

- OKX Wallet
- MetaMask
- Coinbase Wallet

OKX detection checks `window.okxwallet`, `window.okxWallet`, nested OKX providers, provider arrays, and EIP-6963 announcements before connecting.

MetaMask detection accepts only real `isMetaMask` providers and excludes OKX-compatible providers. Coinbase Wallet uses Wagmi's Coinbase connector with EOA-only preference.

## Environment

Copy `.env.example` to `.env.local` and set the public contract address, chain ID, Base app ID, builder code, and data suffix.

## Local Development

```bash
npm install
npm run dev
```

## Verification

Run TypeScript checks, wallet provider routing tests, and a production build before deployment.
