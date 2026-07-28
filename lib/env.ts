import { isAddress, zeroAddress } from "viem";

const rawChainId = process.env.NEXT_PUBLIC_CHAIN_ID ?? "8453";
const parsedChainId = Number.parseInt(rawChainId, 10);

export const chainId = Number.isSafeInteger(parsedChainId) ? parsedChainId : 8453;
export const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
export const hasContractAddress = Boolean(contractAddress && isAddress(contractAddress) && contractAddress !== zeroAddress);
export const baseAppId = process.env.NEXT_PUBLIC_BASE_APP_ID ?? "";
export const builderCode = process.env.NEXT_PUBLIC_BUILDER_CODE ?? "";

export function getDataSuffix(): `0x${string}` | undefined {
  const value = process.env.NEXT_PUBLIC_DATA_SUFFIX;
  if (!value) return undefined;
  return /^0x[0-9a-fA-F]*$/.test(value) ? (value as `0x${string}`) : undefined;
}
