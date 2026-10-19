import { describe, expect, it } from "vitest";
import fixture from "../fixtures/vault.enc.json";
import { decryptVault, encryptVault, VAULT_ITERATIONS, type VaultFile } from "../../src/vault/crypto";

const TEST_PASSPHRASE = "test-passphrase-not-real";

describe("vault crypto", () => {
  it("round-trips with fresh salt and IV each time", async () => {
    const a = await encryptVault("hello vault", "a long enough passphrase", 1000);
    const b = await encryptVault("hello vault", "a long enough passphrase", 1000);
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
    expect(await decryptVault(a, "a long enough passphrase")).toBe("hello vault");
  });

  it("uses the PRD parameters: 16-byte salt, 12-byte IV, 600k iterations", async () => {
    const file = await encryptVault("x", "a long enough passphrase");
    expect(atob(file.salt)).toHaveLength(16);
    expect(atob(file.iv)).toHaveLength(12);
    expect(file.iter).toBe(VAULT_ITERATIONS);
    expect(VAULT_ITERATIONS).toBe(600_000);
  });

  it("rejects a wrong passphrase and tampered ciphertext", async () => {
    const file = await encryptVault("secret", "a long enough passphrase", 1000);
    await expect(decryptVault(file, "wrong passphrase!!")).rejects.toThrow();
    const bytes = Uint8Array.from(atob(file.ct), (c) => c.charCodeAt(0));
    bytes[0]! ^= 1;
    const tampered = { ...file, ct: btoa(String.fromCharCode(...bytes)) };
    await expect(decryptVault(tampered, "a long enough passphrase")).rejects.toThrow();
  });

  it("decrypts the committed test fixture with the test passphrase", async () => {
    const text = await decryptVault(fixture as VaultFile, TEST_PASSPHRASE);
    expect(text).toContain("# Fixture vault");
  });
});
