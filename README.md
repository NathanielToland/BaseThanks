# BaseKudos

BaseKudos is a Base Mini App for sending onchain encouragement cards.

## Features

- Send repeatable kudos cards to any non-zero wallet address.
- Send kudos to yourself without reverting.
- Mint one ERC1155 card to the receiver for each kudos.
- Track sent count, received count, reward points, referrals, card balances, and total kudos.

## Wallets

Only three wallet buttons are shown:

- OKX Wallet
- MetaMask
- Coinbase Wallet

OKX detection checks `window.okxwallet`, `window.okxWallet`, nested OKX providers, provider arrays, and EIP-6963 announcements before connecting.

MetaMask detection accepts only real `isMetaMask` providers and excludes OKX-compatible providers. Coinbase Wallet uses Wagmi's Coinbase connector with EOA-only preference.

## Environment

Copy `.env.example` to `.env.local` and set the public contract address, chain ID, Base app ID, builder code, and data suffix.

The default Builder Code is `bc_94sb390d`. The app generates the ERC-8021 suffix with `Attribution.toDataSuffix({ codes: [...] })` instead of appending the raw code string.

## Local Development

```bash
npm install
npm run dev
```

## Verification

Run TypeScript checks, wallet provider routing tests, and a production build before deployment.

```bash
npm run typecheck
npm run test:wallets
npm run build
```

## Contract Files

- Contract: `contracts/BaseKudos.sol`
- ABI: `lib/abi/baseKudosAbi.ts`

## Deployment

Deploy with Vercel after setting the same `NEXT_PUBLIC_*` values used locally.

After deployment, open the production domain and confirm the Contract Info panel shows the latest attribution version and suffix tail before sending a new transaction.
