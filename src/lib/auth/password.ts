import { hash, verify } from "@node-rs/argon2";

// Argon2id with the OWASP-recommended baseline (19 MiB, 2 iterations, 1 lane).
const options = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string) {
  return hash(password, options);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Verifying against a throwaway hash keeps "unknown email" as slow as "wrong
// password", so response timing does not reveal which emails exist.
let decoyHash: Promise<string> | undefined;
export async function verifyDecoy(password: string) {
  decoyHash ??= hash("decoy-password-that-never-matches", options);
  await verifyPassword(await decoyHash, password);
  return false;
}
