#!/usr/bin/env node
// Holt eine neue Kit-Version aus dem öffentlichen Template. Ausgelöst über /update.
//
// Grundlage ist .claude/kit/manifest.json: die Liste aller Kit-Dateien mit Prüfsumme. Zum Kit gehören
// .claude/** (außer settings.local.json) und wenige Dateien im Projektordner (AGENTS.md, README.md, .mcp.json,
// .gitattributes, .vscode/). .gitignore wird nur ergänzt.
// Ersetzt werden nur Dateien aus dem neuen Manifest. Entfernt werden nur Dateien, die im alten
// Manifest standen und im neuen fehlen. Alles andere gehört der Person (eigene Skills und Agents,
// kapitel/, quellen/, daten/, abbildungen/, .arbeit/, .lokal/) und wird nie angefasst.
// Lokal veränderte Kit-Dateien werden vor dem Ersetzen oder Entfernen nach .lokal/update-konflikte/ gesichert.
//
// Übergang von v2.x: Das Template hält kit/manifest.json, kit/VERSION und kit/CHANGELOG.md als Weiche bereit,
// damit das alte update.mjs (liest kit/manifest.json) die neuen Pfade holt. Dieses Skript liest ein altes
// kit/manifest.json als bisheriges Manifest und räumt die Weiche danach weg. Die Nutzerdaten zieht
// zustand.mjs init um (arbeit/ -> .arbeit/ und kapitel/).
//
// Aufruf:
//   node .claude/kit/werkzeuge/update.mjs --check    nur prüfen und Änderungen auflisten
//   node .claude/kit/werkzeuge/update.mjs            übernehmen und committen
//   node .claude/kit/werkzeuge/update.mjs manifest   .claude/kit/manifest.json aus den Kit-Dateien erzeugen (--mit-weiche: zusätzlich kit/ für v2.x-Projekte) (nur im Template, idempotent)
//   --json                                   maschinenlesbar
//   --von <url>                              anderes Template (Tests, Forks)
//
// Exit-Codes: 0 aktuell oder übernommen   2 Update verfügbar (nur --check)
//             1 Fehler   4 vorgemerkte Änderungen blockieren   8 fremdes Eltern-Repo

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const argv = process.argv.slice(2);
const ALS_JSON = argv.includes('--json');
const NUR_PRUEFEN = argv.includes('--check');
const vonIdx = argv.indexOf('--von');
const VORLAGE_URL = vonIdx >= 0 ? argv[vonIdx + 1] : (process.env.SW_VORLAGE_URL || 'https://github.com/koljaschoepe/scientific-writing.git');
const ZWEIG = process.env.SW_VORLAGE_ZWEIG || 'main';
const MANIFEST = '.claude/kit/manifest.json';
const WEICHE = 'kit/'; // Übergang v2.x -> v3, nur im Template
const ALT_MANIFEST = 'kit/manifest.json';

// Kit-Dateien (Ordner enden auf /). .gitignore wird nicht ersetzt, sondern ergänzt.
export const HERSTELLER = ['.claude/', '.vscode/', 'AGENTS.md', 'README.md', '.mcp.json', '.gitattributes'];
// Nie Kit, auch wenn ein Manifest es behauptet: gehört der Person oder dem Gerät.
const NIE = ['.claude/settings.local.json', 'kapitel/', 'quellen/', 'daten/', 'abbildungen/', '.arbeit/', '.lokal/', 'code/'];
// Ohne altes Manifest (Update von v2.0): in diesen Ordnern kann Eigenes liegen, dort wird nie gelöscht.
const PERSOENLICH_MOEGLICH = ['.claude/skills/', '.claude/agents/', '.claude/rules/', '.claude/output-styles/', '.claude/commands/'];
const MUELL = /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini|node_modules|__pycache__)(\/|$)|\.(bak|tmp|log)$|\.kaputt-[^/]*$|~$/;

const istNie = (rel) => NIE.some((n) => (n.endsWith('/') ? rel.startsWith(n) : rel === n));
const imKit = (rel) => rel !== MANIFEST && !MUELL.test(rel) && !istNie(rel) &&
  HERSTELLER.some((h) => (h.endsWith('/') ? rel.startsWith(h) : rel === h));

function git(args, opts = {}) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true, ...opts });
  return { ok: r.status === 0, roh: r.stdout || '', out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

function ende(code, e) {
  e.code = code;
  if (ALS_JSON) process.stdout.write(JSON.stringify(e, null, 2) + '\n');
  else {
    process.stdout.write(e.meldung + '\n');
    for (const [titel, liste] of [['Neu', e.neu], ['Geändert', e.geaendert], ['Entfernt', e.entfernt], ['Selbst angepasst, bleibt', e.behalten], ['Gesichert nach .lokal/update-konflikte/', e.konflikte]]) {
      if (liste?.length) process.stdout.write(`${titel} (${liste.length}):\n` + liste.map((d) => '  - ' + d).join('\n') + '\n');
    }
    if (e.changelog) process.stdout.write('\nWas ist neu:\n' + e.changelog + '\n');
    if (e.hinweis) process.stdout.write(e.hinweis + '\n');
  }
  process.exit(code);
}

// Prüfsumme unabhängig vom Zeilenende (Windows-Checkouts mit CRLF gelten als unverändert).
export function pruefsumme(buf) {
  const probe = buf.subarray(0, 8000);
  const binaer = probe.includes(0);
  const inhalt = binaer ? buf : Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  return crypto.createHash('sha256').update(inhalt).digest('hex').slice(0, 16);
}

function lokaleSumme(rel) {
  try { return pruefsumme(fs.readFileSync(path.join(ROOT, ...rel.split('/')))); } catch { return null; }
}

function istGitWurzel() {
  const r = git(['rev-parse', '--show-toplevel']);
  if (!r.ok) return false;
  const norm = (x) => { let y = path.resolve(x); try { y = fs.realpathSync.native(y); } catch {} return process.platform === 'linux' ? y : y.toLowerCase(); };
  return norm(r.out) === norm(ROOT);
}

function kitDateienAufPlatte() {
  let liste = [];
  if (istGitWurzel()) {
    const r = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']);
    if (r.ok) liste = r.roh.split('\0').filter(Boolean);
  }
  if (!liste.length) { // ohne Git: Ordner ablaufen
    const lauf = (rel) => {
      const abs = path.join(ROOT, ...rel.split('/').filter(Boolean));
      let st; try { st = fs.statSync(abs); } catch { return; }
      if (st.isFile()) { liste.push(rel.replace(/\/$/, '')); return; }
      if (!st.isDirectory()) return;
      for (const n of fs.readdirSync(abs)) lauf(`${rel.replace(/\/$/, '')}/${n}${fs.statSync(path.join(abs, n)).isDirectory() ? '/' : ''}`);
    };
    for (const h of HERSTELLER) lauf(h);
  }
  return [...new Set(liste)].filter((rel) => imKit(rel) && fs.existsSync(path.join(ROOT, ...rel.split('/')))).sort();
}

export function erzeugeManifest() {
  const dateien = {};
  for (const rel of kitDateienAufPlatte()) dateien[rel] = lokaleSumme(rel);
  let version = '0.0.0';
  try { version = fs.readFileSync(path.join(ROOT, '.claude', 'kit', 'VERSION'), 'utf8').trim(); } catch {}
  const m = { schema: 1, version, hinweis: 'Generiert mit: node .claude/kit/werkzeuge/update.mjs manifest. Nicht von Hand bearbeiten.', dateien };
  const text = JSON.stringify(m, null, 2) + '\n';
  const schreibeWennAnders = (rel, inhalt) => {
    const ziel = path.join(ROOT, ...rel.split('/'));
    let alt = null; try { alt = fs.readFileSync(ziel, 'utf8'); } catch {}
    if (alt === inhalt) return false;
    fs.mkdirSync(path.dirname(ziel), { recursive: true });
    fs.writeFileSync(ziel, inhalt, 'utf8');
    return true;
  };
  let geaendert = schreibeWennAnders(MANIFEST, text);
  // Weiche für Projekte mit v2.x (deren update.mjs liest kit/manifest.json, kit/VERSION, kit/CHANGELOG.md)
  const weiche = argv.includes('--mit-weiche'); // v3.0: keine v2.x-Projekte im Umlauf, Weiche nur auf Wunsch
  if (weiche) {
    geaendert = schreibeWennAnders(ALT_MANIFEST, text) || geaendert;
    geaendert = schreibeWennAnders('kit/VERSION', version + '\n') || geaendert;
    let cl = ''; try { cl = fs.readFileSync(path.join(ROOT, '.claude', 'kit', 'CHANGELOG.md'), 'utf8'); } catch {}
    geaendert = schreibeWennAnders('kit/CHANGELOG.md', cl) || geaendert;
  }
  return { anzahl: Object.keys(dateien).length, geaendert, version, weiche };
}

// ---------- Befehl: manifest ----------

if (argv[0] === 'manifest') {
  const r = erzeugeManifest();
  ende(0, { status: 'manifest', ...r, meldung: `.claude/kit/manifest.json: ${r.anzahl} Kit-Dateien${r.geaendert ? ' (aktualisiert)' : ' (unverändert)'}${r.weiche ? ', Weiche kit/ für v2.x-Projekte' : ''}.` });
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

// Pfad -> Blob-Hash für einen Baum (nur Herstellerdateien).
function baum(ref) {
  const r = git(['ls-tree', '-r', '-z', ref]);
  const m = new Map();
  for (const z of r.roh.split('\0').filter(Boolean)) {
    const [info, pfad] = z.split('\t');
    if (imKit(pfad)) m.set(pfad, info.split(' ')[2]);
  }
  return m;
}

function blobSumme(ref, rel) {
  const r = spawnSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, maxBuffer: 256 * 1024 * 1024, windowsHide: true });
  return r.status === 0 ? pruefsumme(r.stdout) : null;
}

// ---------- Vorbedingungen ----------

if (!git(['rev-parse', '--is-inside-work-tree']).ok) {
  ende(1, { status: 'kein-repo', meldung: 'Dieser Ordner ist kein Git-Repo. Update braucht Git.' });
}
if (!istGitWurzel()) {
  ende(8, { status: 'fremdes-repo', meldung: 'Dieser Projektordner liegt in einem anderen Git-Repo. Update bricht ab, damit nichts im falschen Repo landet.' });
}

// 1. Remote "vorlage" sicherstellen
const vorhanden = git(['remote', 'get-url', 'vorlage']);
if (!vorhanden.ok) git(['remote', 'add', 'vorlage', VORLAGE_URL]);
else if (vonIdx >= 0 && vorhanden.out !== VORLAGE_URL) git(['remote', 'set-url', 'vorlage', VORLAGE_URL]);

const f = git(['fetch', '--quiet', '--no-tags', 'vorlage', ZWEIG]);
if (!f.ok) ende(1, { status: 'fehler', meldung: 'Das Template ist nicht erreichbar (Internet?).', hinweis: f.err });

const REF = `vorlage/${ZWEIG}`;
const leseLokal = (...rels) => { for (const r of rels) { try { return fs.readFileSync(path.join(ROOT, ...r.split('/')), 'utf8'); } catch {} } return null; };
const lokalVersion = (leseLokal('.claude/kit/VERSION', 'kit/VERSION') || '0.0.0').trim();
const neuVersion = git(['show', `${REF}:.claude/kit/VERSION`]).out || '0.0.0';
const changelog = changelogSeit(git(['show', `${REF}:.claude/kit/CHANGELOG.md`]).out, lokalVersion);

// 2. Manifeste: neu aus dem Template, alt von hier. Fehlen sie, gilt der Git-Baum (ältere Versionen).
function leseManifestText(t) {
  try { const m = JSON.parse(t); return m && m.dateien && typeof m.dateien === 'object' ? m.dateien : null; } catch { return null; }
}
let neuM = leseManifestText(git(['show', `${REF}:${MANIFEST}`]).roh);
const remoteBaum = baum(REF);
if (!neuM) { neuM = {}; for (const rel of remoteBaum.keys()) neuM[rel] = blobSumme(REF, rel); }
let altM = null;
altM = leseManifestText(leseLokal(MANIFEST, ALT_MANIFEST) || '');
const ohneAltesManifest = !altM;
if (!altM) {
  // Update von v2.0: alles, was hier im Kit-Bereich committet ist, außer Ordnern mit möglichen eigenen Dateien.
  altM = {};
  for (const rel of baum('HEAD').keys()) if (!PERSOENLICH_MOEGLICH.some((o) => rel.startsWith(o)) || neuM[rel]) altM[rel] = null;
}

const neu = [], geaendert = [], entfernt = [], konflikte = [], behalten = [];
for (const rel of Object.keys(neuM)) if (istNie(rel) || rel.startsWith(WEICHE)) delete neuM[rel];
for (const rel of Object.keys(altM)) if (istNie(rel)) delete altM[rel];
for (const [rel, summe] of Object.entries(neuM)) {
  const hier = lokaleSumme(rel);
  if (hier === null) neu.push(rel);
  else if (hier !== summe) {
    // Selbst angepasst, und das Kit hat die Datei nicht geändert: Anpassung bleibt.
    if (altM[rel] && altM[rel] === summe) behalten.push(rel);
    else geaendert.push(rel);
  }
}
for (const rel of Object.keys(altM)) {
  if (neuM[rel] !== undefined) continue;
  if (fs.existsSync(path.join(ROOT, ...rel.split('/')))) entfernt.push(rel);
}

// Reste der Weiche (kit/manifest.json, kit/VERSION, kit/CHANGELOG.md) aus dem Übergang von v2.x
const weicheReste = ['kit/manifest.json', 'kit/VERSION', 'kit/CHANGELOG.md'].filter((rel) => fs.existsSync(path.join(ROOT, ...rel.split('/'))));
for (const rel of weicheReste) if (!entfernt.includes(rel)) entfernt.push(rel);

const basis = { lokal: lokalVersion, neu_version: neuVersion, neu, geaendert, entfernt, behalten, changelog, ohne_altes_manifest: ohneAltesManifest };

if (!neu.length && !geaendert.length && !entfernt.length) {
  // Manifest trotzdem auf den Stand des Templates bringen (z. B. erstes Update nach v2.1)
  if (ohneAltesManifest && !NUR_PRUEFEN) {
    const r = git(['checkout', REF, '--', MANIFEST]);
    if (r.ok) git(['commit', '-q', '-m', `Kit-Manifest ${neuVersion} übernommen`, '--', MANIFEST]);
  }
  ende(0, { ...basis, status: 'aktuell', meldung: `Das Kit ist aktuell (Version ${lokalVersion}).` });
}

if (NUR_PRUEFEN) {
  ende(2, {
    ...basis, status: 'verfuegbar',
    meldung: `Update verfügbar: ${lokalVersion} -> ${neuVersion}. ${neu.length + geaendert.length + entfernt.length} Kit-Dateien ändern sich, deine Arbeit und eigene Skills bleiben unberührt.`,
  });
}

// 3. Vorgemerkte Änderungen würden in den Update-Commit rutschen
if (!git(['diff', '--cached', '--quiet']).ok) {
  ende(4, { ...basis, status: 'ungesichert', meldung: 'Es sind Änderungen vorgemerkt (git add). Erst /sync, dann /update.' });
}

// 4. Übernehmen. Lokal veränderte Kit-Dateien vorher sichern.
const sicherung = path.join(ROOT, '.lokal', 'update-konflikte', `${neuVersion}-${Date.now()}`);
function sichere(rel) {
  const ziel = path.join(sicherung, ...rel.split('/'));
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  fs.copyFileSync(path.join(ROOT, ...rel.split('/')), ziel);
  konflikte.push(rel);
}

for (const rel of geaendert) {
  const alt = altM[rel];
  const hier = lokaleSumme(rel);
  // verändert = weicht vom alten Kit-Stand ab. Ohne Prüfsumme (v2.0): gegen den committeten Stand vergleichen.
  const veraendert = alt ? hier !== alt : hier !== blobSumme('HEAD', rel);
  if (veraendert) sichere(rel);
}
const zuHolen = [...neu, ...geaendert];
if (remoteBaum.has(MANIFEST) || git(['cat-file', '-e', `${REF}:${MANIFEST}`]).ok) zuHolen.push(MANIFEST);
for (let i = 0; i < zuHolen.length; i += 200) {
  const r = git(['checkout', REF, '--', ...zuHolen.slice(i, i + 200)]);
  if (!r.ok) ende(1, { ...basis, konflikte, status: 'fehler', meldung: 'Übernehmen fehlgeschlagen. Nichts wurde committet.', hinweis: r.err });
}
const entferntWirklich = [];
for (const rel of entfernt) {
  const alt = altM[rel];
  const hier = lokaleSumme(rel);
  const veraendert = weicheReste.includes(rel) ? false : alt ? hier !== alt : hier !== blobSumme('HEAD', rel);
  if (veraendert) sichere(rel);
  const r = git(['rm', '-q', '-f', '--', rel]);
  if (!r.ok) { try { fs.unlinkSync(path.join(ROOT, ...rel.split('/'))); } catch { /* schon weg */ } }
  entferntWirklich.push(rel);
}

// .gitignore: fehlende Zeilen aus dem Template anhängen, eigene Zeilen behalten
const giRemote = git(['show', `${REF}:.gitignore`]);
if (giRemote.ok) {
  const pfad = path.join(ROOT, '.gitignore');
  const eigen = fs.existsSync(pfad) ? fs.readFileSync(pfad, 'utf8') : '';
  const vorhandenZeilen = new Set(eigen.split(/\r?\n/).map((z) => z.trim()));
  const fehlend = giRemote.out.split(/\r?\n/).filter((z) => z.trim() && !z.startsWith('#') && !vorhandenZeilen.has(z.trim()));
  if (fehlend.length) {
    fs.writeFileSync(pfad, eigen.replace(/\s*$/, '\n') + `\n# Ergänzt durch Kit-Update ${neuVersion}\n` + fehlend.join('\n') + '\n', 'utf8');
    git(['add', '.gitignore']);
  }
}

// Fehlende Nutzerdateien aus .claude/kit/vorlagen/arbeit anlegen und ältere Ordnerstrukturen umziehen.
// Der Umzug ist nicht Teil des Update-Commits (nur vorgemerkte Kit-Dateien werden committet), /sync sichert ihn.
let umzug = null;
const zustandMjs = path.join(ROOT, '.claude', 'kit', 'werkzeuge', 'zustand.mjs');
if (fs.existsSync(zustandMjs)) {
  const r = spawnSync(process.execPath, [zustandMjs, 'init'], { cwd: ROOT, encoding: 'utf8', windowsHide: true, env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT } });
  umzug = (r.stdout || '').trim() || null;
}

// Nur die vorgemerkten Kit-Dateien committen, nie andere offene Arbeit der Person.
const c = git(['commit', '-q', '-m', `Kit-Update auf ${neuVersion}`]);
if (!c.ok && !/nothing to commit|nichts zu committen/i.test(c.out + c.err)) {
  ende(1, { ...basis, konflikte, status: 'fehler', meldung: 'Update übernommen, aber nicht committet.', hinweis: c.err });
}

ende(0, {
  ...basis, entfernt: entferntWirklich, konflikte, status: 'uebernommen',
  meldung: `Kit auf Version ${neuVersion} aktualisiert (vorher ${lokalVersion}). Rückgängig machen: git revert HEAD.`,
  hinweis: (konflikte.length ? `Du hattest ${konflikte.length} Kit-Dateien selbst verändert. Deine Fassungen liegen in ${path.relative(ROOT, sicherung).split(path.sep).join('/')}/. ` : '') +
    (umzug && umzug !== 'Alles vorhanden.' ? `Projektdateien: ${umzug.split('\n')[0]} ` : '') +
    'Mit /sync landet das Update auch auf GitHub. Neue Befehle wirken nach einem Neustart von Claude.',
});
