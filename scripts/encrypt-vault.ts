/**
 * Encrypts vault/vault.md into src/content/vault.enc.json (PRD §9). Run with
 * `npm run vault:encrypt` after every edit to vault.md.
 *
 * The passphrase comes from VAULT_PASSPHRASE (the environment or .env.local), or an
 * interactive prompt. Plaintext and passphrase never leave this machine.
 *
 *   --in <file>          plaintext markdown (default vault/vault.md)
 *   --out <file>         output JSON (default src/content/vault.enc.json)
 *   --passphrase-env <N> read the passphrase from env var N instead (used for the test fixture)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { encryptVault } from "../src/vault/crypto.ts";

const { values } = parseArgs({
  options: {
    in: { type: "string", default: "vault/vault.md" },
    out: { type: "string", default: "src/content/vault.enc.json" },
    "passphrase-env": { type: "string", default: "VAULT_PASSPHRASE" },
  },
});

function fromEnvLocal(name: string): string | undefined {
  if (!existsSync(".env.local")) return undefined;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match?.[1] === name) return match[2]!.replace(/^(['"])(.*)\1$/, "$2");
  }
  return undefined;
}

/** Prompts without echoing what is typed. */
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output = rl as unknown as { _writeToOutput: (s: string) => void };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    output._writeToOutput = (s: string) => {
      if (s.startsWith(question)) process.stdout.write(question);
    };
  });
}

const envName = values["passphrase-env"]!;
let passphrase = process.env[envName] ?? fromEnvLocal(envName);
if (!passphrase) passphrase = await prompt("Vault passphrase: ");
if (!passphrase || passphrase.length < 16) {
  console.error("Use a long passphrase (16+ characters): the vault only resists casual visitors (PRD §9).");
  process.exit(1);
}
if (!existsSync(values.in!)) {
  console.error(`No plaintext at ${values.in}. Write your notes there first (it is gitignored).`);
  process.exit(1);
}

const file = await encryptVault(readFileSync(values.in!, "utf8"), passphrase);
writeFileSync(values.out!, `${JSON.stringify(file, null, 2)}\n`);
console.log(`Encrypted ${values.in} → ${values.out}`);
