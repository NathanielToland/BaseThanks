import { type Address } from "viem";
import { baseThanksAbi } from "@/lib/abi/baseThanksAbi";
import { contractAddress, hasContractAddress } from "@/lib/env";

export const baseThanksContract = {
  abi: baseThanksAbi,
  address: contractAddress as Address
};

export function requireContractAddress(): Address {
  if (!hasContractAddress) throw new Error("Contract address is missing or invalid.");
  return contractAddress as Address;
}
