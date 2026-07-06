#!/usr/bin/env node
// Vérification d'un service Node : build + tests + le serveur démarre et répond.
// Usage : node scripts/verify.mjs [--quick]  (--quick : build + tests seulement)
import { execSync, spawn } from "node:child_process";

const quick = process.argv.includes("--quick");
const run = (cmd) => {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

try {
  run("npm run build --if-present");
  run("npm test --if-present");
} catch {
  console.error("VERIFY ÉCHEC : build ou tests en erreur.");
  process.exit(1);
}

if (quick) {
  console.log("VERIFY OK (quick) : build + tests passent.");
  process.exit(0);
}

const PORT = process.env.PORT ?? 3000;
const server = spawn("npm", ["run", "dev"], {
  stdio: "ignore",
  shell: process.platform === "win32",
  env: { ...process.env, PORT: String(PORT) },
});

setTimeout(async () => {
  try {
    const res = await fetch(`http://localhost:${PORT}/`);
    server.kill();
    if (!res.ok && res.status !== 404) {
      console.error(`VERIFY ÉCHEC : serveur HTTP ${res.status}`);
      process.exit(1);
    }
    console.log("VERIFY OK : build + tests + serveur qui répond.");
    process.exit(0);
  } catch (e) {
    server.kill();
    console.error(`VERIFY ÉCHEC : serveur injoignable (${e.message})`);
    process.exit(1);
  }
}, 4000);
