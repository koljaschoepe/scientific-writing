#!/usr/bin/env node
// Stop-Hook: Tagesaktivität fortschreiben, Abzeichen prüfen, dashboard.html neu schreiben.
// Fail-open: meldet nie Fehler an Claude, endet immer mit exit 0.

import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function main() {
  let eingabe = '';
  await new Promise((r) => {
    if (process.stdin.isTTY) return r();
    process.stdin.on('data', (c) => (eingabe += c)); process.stdin.on('end', r); process.stdin.on('error', r);
    setTimeout(r, 300);
  });
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const imp = (rel) => import(pathToFileURL(path.join(root, ...rel.split('/'))).href);
  const z = await imp('kit/werkzeuge/zustand.mjs');
  const { existiert, p } = await imp('kit/werkzeuge/lib.mjs');
  if (!existiert(p(root, 'arbeit', 'zustand.json'))) return;

  try { z.aktivitaet(root); } catch {}
  let neu = [];
  try { neu = z.pruefeAbzeichen(root); } catch {}
  try { (await imp('kit/dashboard/server.mjs')).schreibeStatisch(root); } catch {}

  if (neu.length) {
    process.stdout.write(JSON.stringify({
      systemMessage: neu.map((a) => `Abzeichen erreicht: ${a.name}. ${a.beschreibung}`).join(' '),
    }));
  }
}

main().catch(() => {}).finally(() => process.exit(0));
