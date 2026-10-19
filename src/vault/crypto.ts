/**
 * Heart vault cryptography (PRD §9), shared by scripts/encrypt-vault.ts (Node) and the
 * page (browser). Both use Web Crypto, so the format is identical on each side:
 * PBKDF2-HMAC-SHA256 → AES-256-GCM, with the GCM tag appended to the ciphertext.
 */
export type VaultFile = { v: 1; salt: string; iv: string; iter: number; ct: string };

export const VAULT_ITERATIONS = 600_000;

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number, usage: KeyUsage) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

export async function encryptVault(plaintext: string, passphrase: string, iterations = VAULT_ITERATIONS): Promise<VaultFile> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, iterations, "encrypt");
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return { v: 1, salt: toBase64(salt), iv: toBase64(iv), iter: iterations, ct: toBase64(new Uint8Array(ct)) };
}

/** Returns the plaintext, or throws when the passphrase is wrong or the file was tampered with. */
export async function decryptVault(file: VaultFile, passphrase: string): Promise<string> {
  if (file.v !== 1) throw new Error(`Unsupported vault version ${String(file.v)}`);
  const key = await deriveKey(passphrase, fromBase64(file.salt), file.iter, "decrypt");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(file.iv) as BufferSource },
    key,
    fromBase64(file.ct) as BufferSource,
  );
  return new TextDecoder().decode(plain);
}
