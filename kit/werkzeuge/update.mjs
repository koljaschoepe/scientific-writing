#!/usr/bin/env node
// Holt eine neue Kit-Version aus dem öffentlichen Template. Ausgelöst über /update.
//
// Übernommen wird nur die Herstellerzone (siehe kit/SPEC.md, Eigentumszonen).
// Kapitel, Quellen, Einstellungen, Code und Daten der Person werden nie angefasst.
//
// Aufruf:
//   node kit/werkzeuge/update.mjs --check   nur prüfen und Änderungen auflisten
//   node kit/werkzeuge/update.mjs           übernehmen und committen
//   --json                                  maschinenlesbar
//   --von <url>                             anderes Template (Tests, Forks)
//
// Exit-Codes: 0 aktuell oder übernommen   2 Update verfügbar (nur --check)
//             1 Fehler   4 ungesicherte Änderungen in der Herstellerzone

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const ALS_JSON = argv.includes('--json');
const NUR_PRUEFEN = argv.includes('--check');
const vonIdx = argv.indexOf('--von');
const VORLAGE_URL = vonIdx >= 0 ? argv[vonIdx + 1] : (process.env.SW_VORLAGE_URL || 'https://github.com/koljaschoepe/scientific-writing.git');
const ZWEIG = process.env.SW_VORLAGE_ZWEIG || 'main';

// Herstellerzone. .gitignore wird nicht ersetzt, sondern um fehlende Zeilen ergänzt,
// weil die Person dort eigene Einträge haben kann.
const HERSTELLERZONE = [
  'kit',
  '.claude/skills',
  '.claude/agents',
  '.claude/rules',
  '.claude/hooks',
  '.claude/settings.json',
  'latex/vorlage',
  '.vscode',
  'install',
  'docs',
  'CLAUDE.md',
  '.mcp.json',
];

function git(args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, roh: r.stdout || '', out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

function ende(code, e) {
  e.code = code;
  if (ALS_JSON) process.stdout.write(JSON.stringify(e, null, 2) + '\n');
  else {
    process.stdout.write(e.meldung + '\n');
    for (const [titel, liste] of [['Neu', e.neu], ['Geändert', e.geaendert], ['Entfernt', e.entfernt]]) {
      if (liste?.length) process.stdout.write(`${titel} (${liste.length}):\n` + liste.map((d) => '  - ' + d).join('\n') + '\n');
    }
    if (e.changelog) process.stdout.write('\nWas ist neu:\n' + e.changelog + '\n');
    if (e.hinweis) process.stdout.write(e.hinweis + '\n');
  }
  process.exit(code);
}

function vergleicheVersion(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

// Abschnitte "## x.y.z" aus dem Changelog, die neuer sind als die lokale Version.
function changelogSeit(text, lokal) {
  const teile = text.split(/^(?=## )/m).filter((t) => /^## \d/.test(t));
  return teile
    .filter((t) => vergleicheVersion(t.match(/^## ([\d.]+)/)[1], lokal) > 0)
    .map((t) => t.trim())
    .join('\n\n');
}

// Pfad -> Blob-Hash für einen Baum (remote) bzw. den Index (lokal).
function baum(ref) {
  const r = git(['ls-tree', '-r', '-z', ref, '--', ...HERSTELLERZONE]);
  const m = new Map();
  for (const z of r.roh.split('\0').filter(Boolean)) {
    const [info, pfad] = z.split('\t');
    m.set(pfad, info.split(' ')[2]);
  }
  return m;
}

if (!git(['rev-parse', '--is-inside-work-tree']).ok) {
  ende(1, { status: 'kein-repo', meldung: 'Dieser Ordner ist kein Git-Repo. Update braucht Git.' });
}

// 1. Remote "vorlage" sicherstellen
const vorhanden = git(['remote', 'get-url', 'vorlage']);
if (!vorhanden.ok) git(['remote', 'add', 'vorlage', VORLAGE_URL]);
else if (vonIdx >= 0 && vorhanden.out !== VORLAGE_URL) git(['remote', 'set-url', 'vorlage', VORLAGE_URL]);

const f = git(['fetch', '--quiet', '--no-tags', 'vorlage', ZWEIG]);
if (!f.ok) ende(1, { status: 'fehler', meldung: 'Das Template ist nicht erreichbar (Internet?).', hinweis: f.err });

const REF = `vorlage/${ZWEIG}`;
const lokal = existsSync(join(ROOT, 'kit', 'VERSION')) ? readFileSync(join(ROOT, 'kit', 'VERSION'), 'utf8').trim() : '0.0.0';
const neuVersion = git(['show', `${REF}:kit/VERSION`]).out || '0.0.0';
const changelog = changelogSeit(git(['show', `${REF}:kit/CHANGELOG.md`]).out, lokal);

// 2. Unterschiede in der Herstellerzone
const remote = baum(REF);
const hier = baum('HEAD');
const neu = [], geaendert = [], entfernt = [];
for (const [p, h] of remote) {
  if (!hier.has(p)) neu.push(p);
  else if (hier.get(p) !== h) geaendert.push(p);
}
for (const p of hier.keys()) if (!remote.has(p)) entfernt.push(p);

const basis = { lokal, neu_version: neuVersion, neu, geaendert, entfernt, changelog };

if (!neu.length && !geaendert.length && !entfernt.length) {
  ende(0, { ...basis, status: 'aktuell', meldung: `Das Kit ist aktuell (Version ${lokal}).` });
}

if (NUR_PRUEFEN) {
  ende(2, {
    ...basis, status: 'verfuegbar',
    meldung: `Update verfügbar: ${lokal} -> ${neuVersion}. ${neu.length + geaendert.length + entfernt.length} Kit-Dateien ändern sich, deine Arbeit bleibt unberührt.`,
  });
}

// 3. Vorbedingungen: keine ungesicherten Änderungen in der Zone, nichts vorgemerkt
const zoneDreckig = git(['status', '--porcelain', '--', ...HERSTELLERZONE]).out;
if (zoneDreckig) {
  ende(4, {
    ...basis, status: 'ungesichert',
    meldung: 'In Kit-Dateien gibt es ungesicherte Änderungen. Erst /sync, dann /update.',
    hinweis: zoneDreckig,
  });
}
if (!git(['diff', '--cached', '--quiet']).ok) {
  ende(4, { ...basis, status: 'ungesichert', meldung: 'Es sind Änderungen vorgemerkt. Erst /sync, dann /update.' });
}

// 4. Übernehmen
const zuHolen = [...neu, ...geaendert];
for (let i = 0; i < zuHolen.length; i += 200) {
  const r = git(['checkout', REF, '--', ...zuHolen.slice(i, i + 200)]);
  if (!r.ok) ende(1, { ...basis, status: 'fehler', meldung: 'Übernehmen fehlgeschlagen. Nichts wurde committet.', hinweis: r.err });
}
for (const p of entfernt) {
  const r = git(['rm', '-q', '--', p]);
  if (!r.ok) { try { unlinkSync(join(ROOT, p)); } catch { /* schon weg */ } }
}

// .gitignore: fehlende Zeilen aus dem Template anhängen, eigene Zeilen behalten
const giRemote = git(['show', `${REF}:.gitignore`]);
if (giRemote.ok) {
  const pfad = join(ROOT, '.gitignore');
  const eigen = existsSync(pfad) ? readFileSync(pfad, 'utf8') : '';
  const vorhandenZeilen = new Set(eigen.split(/\r?\n/).map((z) => z.trim()));
  const fehlend = giRemote.out.split(/\r?\n/).filter((z) => z.trim() && !z.startsWith('#') && !vorhandenZeilen.has(z.trim()));
  if (fehlend.length) {
    writeFileSync(pfad, eigen.replace(/\s*$/, '\n') + `\n# Ergänzt durch Kit-Update ${neuVersion}\n` + fehlend.join('\n') + '\n', 'utf8');
    git(['add', '.gitignore']);
  }
}

// fehlende Nutzerdateien aus kit/vorlagen/ anlegen, falls das Werkzeug existiert
if (existsSync(join(ROOT, 'kit', 'werkzeuge', 'zustand.mjs'))) {
  spawnSync(process.execPath, [join(ROOT, 'kit', 'werkzeuge', 'zustand.mjs'), 'init'], { cwd: ROOT, stdio: 'ignore' });
}

const c = git(['commit', '-q', '-m', `Kit-Update auf ${neuVersion}`]);
if (!c.ok) ende(1, { ...basis, status: 'fehler', meldung: 'Update übernommen, aber nicht committet.', hinweis: c.err });

ende(0, {
  ...basis, status: 'uebernommen',
  meldung: `Kit auf Version ${neuVersion} aktualisiert (vorher ${lokal}). Rückgängig machen: git revert HEAD.`,
  hinweis: 'Mit /sync landet das Update auch auf GitHub. Neue Befehle wirken nach einem Neustart von Claude.',
});
