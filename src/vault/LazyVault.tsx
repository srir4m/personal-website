import { lazy } from "react";

/** The vault ships in its own chunk, loaded only when opened. */
export const Vault = lazy(async () => {
  const [{ VaultPanel }, { default: vault }] = await Promise.all([import("./VaultPanel"), import("virtual:vault")]);
  return { default: () => <VaultPanel vault={vault} /> };
});
