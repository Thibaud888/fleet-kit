#!/usr/bin/env node
// Vérification minimale d'un site statique : le serveur démarre et la page d'accueil répond.
// Usage : node scripts/verify.mjs  (la session Claude doit le lancer avant de conclure)
import { spawn } from "node:child_process";

const PORT = process.env.VERIFY_PORT ?? 4000;
const server = spawn("npx", ["serve", "-l", String(PORT), "."], {
  stdio: "ignore",
  shell: process.platform === "win32",
});

const fail = (msg) => {
  server.kill();
  console.error(`VERIFY ÉCHEC : ${msg}`);
  process.exit(1);
};

setTimeout(async () => {
  try {
    const res = await fetch(`http://localhost:${PORT}/`);
    if (!res.ok) fail(`page d'accueil HTTP ${res.status}`);
    const html = await res.text();
    if (!html.toLowerCase().includes("<html")) fail("la réponse ne ressemble pas à du HTML");
    server.kill();
    console.log("VERIFY OK : le site démarre et répond.");
    process.exit(0);
  } catch (e) {
    fail(e.message);
  }
}, 2500);
