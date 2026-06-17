/**
 * Passcode security helpers.
 *
 * Provides a deterministic lookup fingerprint plus a slow salted scrypt hash
 * for room passcodes. The raw passcode must never be persisted.
 */

import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";
import { env } from "@/lib/env";

const scrypt = promisify(scryptCallback);
const PASSCODE_HASH_PREFIX = "scrypt";
const PASSCODE_SALT_BYTES = 16;
const PASSCODE_KEY_LENGTH = 64;

function normalizePasscode(passcode: string) {
  return passcode.trim();
}

export function hashPasscodeLegacy(passcode: string): string {
  return createHash("sha256")
    .update(normalizePasscode(passcode))
    .digest("hex");
}

export function buildPasscodeLookup(passcode: string): string {
  return createHmac("sha256", env.PASSCODE_PEPPER)
    .update(normalizePasscode(passcode))
    .digest("hex");
}

export async function hashPasscode(passcode: string): Promise<string> {
  const normalizedPasscode = normalizePasscode(passcode);
  const salt = randomBytes(PASSCODE_SALT_BYTES).toString("hex");
  const derivedKey = (await scrypt(
    `${env.PASSCODE_PEPPER}:${normalizedPasscode}`,
    salt,
    PASSCODE_KEY_LENGTH
  )) as Buffer;

  return `${PASSCODE_HASH_PREFIX}:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPasscode(
  passcode: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash.startsWith(`${PASSCODE_HASH_PREFIX}:`)) {
    return hashPasscodeLegacy(passcode) === storedHash;
  }

  const [, salt, expectedHash] = storedHash.split(":");

  if (!salt || !expectedHash) {
    return false;
  }

  const derivedKey = (await scrypt(
    `${env.PASSCODE_PEPPER}:${normalizePasscode(passcode)}`,
    salt,
    PASSCODE_KEY_LENGTH
  )) as Buffer;
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (derivedKey.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, expectedBuffer);
}
