declare module "virtual:vault" {
  import type { VaultFile } from "./crypto";
  const vault: VaultFile | null;
  export default vault;
}
