#!/usr/bin/env node
// SessionStart-Hook: Dashboard sicherstellen, kompaktes Lagebild an Claude (additionalContext).
// Kein systemMessage: in der VS-Code-Extension unsichtbar. Den Link nennt Claude selbst.
// Fail-open: Egal was passiert, dieser Hook blockiert nie lange und endet mit exit 0.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const START = Date.now();
const GRENZE_MS = 4500;   // Dashboard-Start höchstens so lange abwarten (hart, Hook-Timeout ist länger)
const MAX_ZEICHEN = 1200;

function stilZeilen(root) {
  let t = '';
  try { t = fs.readFileSync(path.join(root, '.arbeit', 'stil.md'), 'utf8'); } catch { return []; }
  t = t.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '');
  const m = /^#{1,6}\s+So arbeite ich\s*$/m.exec(t);
  if (!m) return [];
  const rest = t.slice(m.index + m[0].length);
  const ende = rest.search(/^#{1,6}\s/m);
  return (ende >= 0 ? rest.slice(0, ende) : rest).split('\n')
    .map((z) => z.trim().replace(/^[-*]\s+/, ''))
    .filter(Boolean)
    .slice(-8)
    .map((z) => (z.length > 140 ? z.slice(0, 137) + '...' : z));
}

function mitZeitlimit(promise, ms) {
  return Promise.race([promise, new Promise((r) => setTimeout(() => r(null), Math.max(0, ms)))]);
}

async function main() {
  // stdin lesen und verwerfen (Claude Code schickt JSON), mit Zeitlimit
  await new Promise((r) => {
    if (process.stdin.isTTY) return r();
    process.stdin.on('data', () => {}); process.stdin.on('end', r); process.stdin.on('error', r);
    setTimeout(r, 200);
  });
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const imp = (rel) => import(pathToFileURL(path.join(root, ...rel.split('/'))).href);

  // Dashboard parallel zum Lagebild starten, Warten hart begrenzt
  const server = (async () => {
    try {
      const { stelleServerSicher } = await imp('.claude/kit/dashboard/server.mjs');
      return (await stelleServerSicher(root))?.url || null;
    } catch { return null; }
  })();

  // Projekte von vor v3 (arbeit/, quellen/zitate, projekt.json): einmal umziehen, bevor gelesen wird.
  let umzug = null;
  if (['arbeit', 'quellen/zitate', 'quellen/kandidaten.json', '.arbeit/projekt.json', '.arbeit/plan.json']
    .some((rel) => fs.existsSync(path.join(root, ...rel.split('/'))))) {
    try { umzug = (await imp('.claude/kit/werkzeuge/zustand.mjs')).init(root).umzug; } catch { umzug = { fehler: true }; }
  }

  const { ladeStand } = await imp('.claude/kit/werkzeuge/stand.mjs');
  const s = ladeStand(root);
  const url = await mitZeitlimit(server, GRENZE_MS - (Date.now() - START));

  const kaputt = Array.isArray(s.kaputt) ? s.kaputt : [];
  const pj = s.projekt || {};
  const zeilen = [];

  if (umzug?.fehler) {
    zeilen.push('Umzug auf die Ordnerstruktur v3 ist fehlgeschlagen. Der Person sagen und node .claude/kit/werkzeuge/zustand.mjs init ausführen, Fehlermeldung übersetzen.');
  } else if (umzug && (umzug.verschoben.length || umzug.einstellungen)) {
    zeilen.push(`Projekt auf die neue Ordnerstruktur umgezogen (${umzug.verschoben.length} Dateien, Kapitel jetzt in kapitel/, Einstellungen in .arbeit/einstellungen.md).` +
      (umzug.konflikte.length ? ` Doppelt vorhanden, bitte mit der Person klären: ${umzug.konflikte.slice(0, 5).join(', ')}.` : '') +
      ' Kurz erwähnen und /sync vorschlagen.');
  }

  if (kaputt.length) {
    zeilen.push(`WARNUNG: beschädigt: ${kaputt.join(', ')}. Diese Dateien nicht überschreiben und nichts neu einrichten. ` +
      'Zuerst der Person sagen und reparieren: node .claude/kit/werkzeuge/check.mjs --reparieren (Rückfrage per AskUserQuestion).');
  }

  if (!s.eingerichtet) {
    zeilen.push('Projekt noch nicht eingerichtet: begrüße die Person kurz und biete /start an (per AskUserQuestion).');
  } else {
    const lage = [`Phase ${s.phaseName} (${s.phaseIndex + 1}/8).`, `Nächster Schritt: ${s.naechster_schritt}`];
    if (s.abgabe.tage != null) lage.push(s.abgabe.tage >= 0 ? `Abgabe in ${s.abgabe.tage} Tagen.` : `Abgabe war vor ${-s.abgabe.tage} Tagen.`);
    const u = s.umfang || {};
    if (u.woerter) lage.push(`Umfang ca. ${u.seiten} S.${u.seiten_max ? ` von ${u.seiten_min === u.seiten_max ? u.seiten_max : `${u.seiten_min}-${u.seiten_max}`}` : ''} (${u.woerter} Wörter).`);
    const termin = (s.plan?.zeitleiste || []).find((t) => t.art === 'termin' && !t.erledigt && t.tage !== null && t.tage >= 0 && t.tage <= 7);
    if (termin) lage.push(`Termin ${termin.tage === 0 ? 'heute' : `in ${termin.tage} Tagen`}: ${termin.text}.`);
    if (s.quellen.zaehler.vorschlag) lage.push(`${s.quellen.zaehler.vorschlag} ${s.quellen.zaehler.vorschlag === 1 ? 'Quellenvorschlag' : 'Quellenvorschläge'} offen.`);
    if (s.quellen.eingang.length) lage.push(`${s.quellen.eingang.length} Dateien in quellen/eingang (/quellen).`);
    const umbenannt = (s.kapitel || []).filter((k) => k.datei_umbenannt || k.titel_abweichung).map((k) => k.nr);
    if (umbenannt.length) lage.push(`Kapitel ${umbenannt.join(', ')}: Datei umbenannt oder Titel geändert, Zustand nachziehen mit node .claude/kit/werkzeuge/zustand.mjs abgleichen.`);
    if (s.sync.erinnern) lage.push(s.sync.tage == null ? 'Noch nie mit /sync gesichert: daran erinnern.' : `Letzter /sync vor ${s.sync.tage} Tagen: daran erinnern.`);
    zeilen.push('Lage: ' + lage.join(' '));

    const a = pj.arbeit || {};
    const st = pj.stil || {};
    const seiten = a.seiten?.max ? (a.seiten.min === a.seiten.max ? `${a.seiten.max}` : `${a.seiten.min}-${a.seiten.max}`) : '';
    const kern = [
      ['typ', a.typ], ['fachprofil', a.fachprofil], ['sprache', a.sprache], ['seiten', seiten], ['schreibmodus', pj.schreibmodus],
      ['zitation', pj.zitation?.stil], ['ki_regeln', pj.ki_regeln?.status], ['abgabe', pj.abgabe?.datum],
      ['ich_form', st.ich_form ? 'ja' : 'nein'], ['gedankenstriche', st.gedankenstriche], ['semikolons', st.semikolons ? 'ja' : 'nein'],
    ].filter(([, v]) => v !== undefined && v !== null && String(v) !== '').map(([k, v]) => `${k}=${v}`);
    if (kern.length) zeilen.push('Projekt (.arbeit/einstellungen.md): ' + kern.join(', '));
  }

  if (url) zeilen.push(`Dashboard: ${url} Nenne der Person den Dashboard-Link einmal in deiner ersten Antwort.`);
  else zeilen.push('Dashboard startet gerade nicht rechtzeitig. Bei Bedarf /dashboard anbieten.');

  // „So arbeite ich“ zuletzt, damit es beim Kürzen zuerst wegfällt
  let text = zeilen.join('\n');
  const stil = stilZeilen(root);
  if (stil.length) {
    let block = '\nSo arbeite ich (.arbeit/stil.md):';
    for (const z of stil) {
      const neu = `${block}\n- ${z}`;
      if (text.length + neu.length > MAX_ZEICHEN) break;
      block = neu;
    }
    if (block.includes('\n- ')) text += block;
  }
  if (text.length > MAX_ZEICHEN) text = text.slice(0, MAX_ZEICHEN - 3) + '...';

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text },
  }));
}

main().catch(() => {}).finally(() => process.exit(0));
