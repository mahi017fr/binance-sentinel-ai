/**
 * SERVER-ONLY: Encrypted, stateless OAuth state/token store.
 *
 * The app runs on serverless (Vercel), where in-memory/server-side state does
 * not survive across invocations. To keep the real Binance MCP OAuth flow
 * working end-to-end WITHOUT adding a database dependency, the transient
 * OAuth state (state, PKCE code_verifier) and the exchanged tokens are
 * stored in AES-256-GCM-encrypted, HttpOnly, SameSite=Lax cookies.
 *
 * Security properties:
 *  - Payloads are encrypted with a server-side secret (AES-256-GCM). Tokens
 *    and code_verifiers are never readable by browser JavaScript.
 *  - Cookies are HttpOnly + SameSite=Lax, so they are not exposed to XSS and
 *    are sent only on top-level navigations (matching the OAuth redirect
 *    flow).
 *  - The encryption key comes from `BINANCE_MCP_STORE_SECRET`. In production
 *    this MUST be set to a stable 32+ byte secret so tokens survive redeploys
 *    and warm/cold function switches. In local dev a fallback key is derived.
 *
 * IMPORTANT: This is appropriate for a single-user research tool. Do not use
 * the cookie for anything beyond the transient MCP authorization state.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

/** Resolve a stable 32-byte key from the environment (dev has a local fallback). */
function getKey(): Buffer {
  const secret = process.env.BINANCE_MCP_STORE_SECRET;
  if (secret && secret.length >= 32) {
    return Buffer.from(secret, "utf8").subarray(0, 32);
  }
  // Dev-only deterministic fallback so `npm run dev` works without env setup.
  // Production MUST set BINANCE_MCP_STORE_SECRET for real security.
  return Buffer.from(
    "sentinel-dev-insecure-fallback-key-0000000000000000",
    "utf8"
  ).subarray(0, 32);
}

/** Encrypt a JSON-serializable payload into an opaque cookie value. */
export function encryptPayload(payload: unknown): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Format: iv.authTag.ciphertext (all base64url)
  return [iv, tag, encrypted]
    .map((b) => b.toString("base64url"))
    .join(".");
}

/**
 * Decrypt a cookie value produced by encryptPayload. Returns null on any
 * tampering/format error (so a forged cookie is treated as absent).
 */
export function decryptPayload<T>(value: string): T | null {
  try {
    const [ivB64, tagB64, dataB64] = value.split(".");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const iv = Buffer.from(ivB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const data = Buffer.from(dataB64, "base64url");
    if (iv.length !== IV_LEN || tag.length !== TAG_LEN) return null;
    const decipher = createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(plain) as T;
  } catch {
    return null;
  }
}
