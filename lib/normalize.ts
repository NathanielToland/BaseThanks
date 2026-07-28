import { isAddress, zeroAddress, type Address } from "viem";

export type KudosCard = {
  id: string;
  sender: Address;
  receiver: Address;
  message: string;
  cardType: number;
  timestamp: number;
};

export type UserStats = {
  sentCount: number;
  receivedCount: number;
  rewardPoints: number;
  referralOf: Address;
};

const emptyAddress = zeroAddress;

export function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "bigint") return value > BigInt(Number.MAX_SAFE_INTEGER) ? fallback : Number(value);
  if (typeof value === "number") return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function safeBigInt(value: unknown, fallback = 0n): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : fallback;
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return fallback;
}

function readField(source: unknown, index: number, key: string): unknown {
  if (Array.isArray(source)) return source[index];
  if (source && typeof source === "object") return (source as Record<string, unknown>)[key];
  return undefined;
}

function normalizeAddress(value: unknown): Address {
  return typeof value === "string" && isAddress(value) ? value : emptyAddress;
}

export function normalizeKudos(raw: unknown, id: unknown): KudosCard {
  return {
    id: safeBigInt(id).toString(),
    sender: normalizeAddress(readField(raw, 0, "sender")),
    receiver: normalizeAddress(readField(raw, 1, "receiver")),
    cardType: safeNumber(readField(raw, 2, "cardType")),
    message: String(readField(raw, 3, "message") ?? ""),
    timestamp: safeNumber(readField(raw, 4, "timestamp"))
  };
}

export function normalizeUser(raw: unknown): UserStats {
  return {
    sentCount: safeNumber(readField(raw, 0, "sentCount")),
    receivedCount: safeNumber(readField(raw, 1, "receivedCount")),
    rewardPoints: safeNumber(readField(raw, 2, "rewardPoints")),
    referralOf: normalizeAddress(readField(raw, 3, "referralOf"))
  };
}

export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}
