import { type Address } from "viem";
import { baseKudosAbi } from "@/lib/abi/baseKudosAbi";
import { contractAddress, hasContractAddress } from "@/lib/env";

export const baseKudosContract = {
  abi: baseKudosAbi,
  address: contractAddress as Address
};

export function requireContractAddress(): Address {
  if (!hasContractAddress) throw new Error("Contract address is missing or invalid.");
  return contractAddress as Address;
}
