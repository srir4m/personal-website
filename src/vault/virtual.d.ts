declare module "virtual:vault" {
  import type { VaultFile } from "./crypto";
  const vault: VaultFile | null;
  export default vault;
}

declare module "virtual:game-emblems" {
  /** File names present in public/assets/games, e.g. "cs2.svg". */
  const files: string[];
  export default files;
}
