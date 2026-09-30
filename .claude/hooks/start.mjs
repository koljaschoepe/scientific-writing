#!/usr/bin/env node
// SessionStart-Hook: Dashboard sicherstellen, eine Zeile Lagebild an Claude, Link an die Person.
// Fail-open: Egal was passiert, dieser Hook blockiert nie und endet mit exit 0.

import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function main() {
  // stdin lesen und verwerfen (Claude Code schickt JSON), mit Zeitlimit
  await new Promise((r) => {
    if (process.stdin.isTTY) return r();
    process.stdin.on('data', () => {}); process.stdin.on('end', r); process.stdin.on('error', r);
    setTimeout(r, 300);
  });
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const imp = (rel) => import(pathToFileURL(path.join(root, ...rel.split('/'))).href);
  const { ladeStand } = await imp('kit/werkzeuge/stand.mjs');
  const s = ladeStand(root);

  let url = null;
  try {
    const { stelleServerSicher } = await imp('kit/dashboard/server.mjs');
    url = (await stelleServerSicher(root)).url;
  } catch {}

  const teile = [];
  if (!s.eingerichtet) {
    teile.push('Projekt noch nicht eingerichtet: begrüße die Person kurz und biete /start an (per AskUserQuestion).');
  } else {
    teile.push(`Phase ${s.phaseName} (${s.phaseIndex + 1}/8).`);
    teile.push(`Nächster Schritt: ${s.naechster_schritt}`);
    if (s.abgabe.tage != null) teile.push(s.abgabe.tage >= 0 ? `Abgabe in ${s.abgabe.tage} Tagen.` : `Abgabe war vor ${-s.abgabe.tage} Tagen.`);
    if (s.woerter.gesamt) teile.push(`${s.woerter.gesamt} Wörter${s.woerter.ziel ? ` von ${s.woerter.ziel}` : ''}.`);
    if (s.quellen.zaehler.vorschlag) teile.push(`${s.quellen.zaehler.vorschlag} Quellenvorschläge warten auf Entscheidung.`);
    if (s.quellen.eingang.length) teile.push(`${s.quellen.eingang.length} Dateien in quellen/eingang (/quellen).`);
    if (s.sync.erinnern) teile.push(s.sync.tage == null ? 'Noch nie mit /sync gesichert: daran erinnern.' : `Letzter /sync vor ${s.sync.tage} Tagen: daran erinnern.`);
  }
  if (url) teile.push(`Dashboard: ${url}`);

  const aus = {
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: teile.join(' ') },
  };
  if (url) aus.systemMessage = `Dashboard: ${url}  (in VS Code: Strg+Shift+P, "Simple Browser: Show", Adresse einfügen)`;
  process.stdout.write(JSON.stringify(aus));
}

main().catch(() => {}).finally(() => process.exit(0));
