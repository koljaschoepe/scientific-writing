// Änderungserkennung für Markdown unter kapitel/ und .arbeit/. Die Ereignisse liefert beobachter.mjs
// (fs.watch bzw. Abfrage), hier wird nur verglichen: jede gemeldete Datei gegen den Schnappschuss in
// .lokal/schnappschuss/<rel>. Ergebnis: geänderte Absatzindizes und Wort-Delta in .lokal/aenderungen.json
// (neueste zuerst, max. 30).

import fs from 'node:fs';
import path from 'node:path';
import { p, zaehleWoerter } from '../../werkzeuge/lib.mjs';
import { absaetze, absatzHash, parseFrontmatter, lokal, leseJsonLocker, schreibeJson, ort, absPfad } from './basis.mjs';

// Beobachtete Orte (relativ, Schrägstrich-Form)
export const TEXT_ORTE = ['kapitel', '.arbeit'];
export const istTextDatei = (rel) => TEXT_ORTE.some((o) => rel.startsWith(o + '/')) && rel.toLowerCase().endsWith('.md')
  && !rel.split('/').slice(1).some((t) => t.startsWith('.'));

const MAX = 30;
const ZUSAMMENFASSEN_MS = 2 * 60 * 1000; // gleiche Datei innerhalb von 2 min → ein Eintrag
const TAG_MS = 24 * 60 * 60 * 1000;

const aenderungsDatei = (root) => lokal(root, 'aenderungen.json');
const schnappDatei = (root, rel) => lokal(root, 'schnappschuss', ...rel.split('/'));

export function leseAenderungen(root) {
  const d = leseJsonLocker(aenderungsDatei(root), []);
  return Array.isArray(d) ? d : Array.isArray(d?.aenderungen) ? d.aenderungen : [];
}

// Für stand.aenderungen: zusätzlich pfad_abs
export function aenderungenFuerStand(root) {
  return leseAenderungen(root).filter((a) => a && typeof a.datei === 'string').map((a) => ({ ...a, pfad_abs: absPfad(root, a.datei) }));
}

// Absatz-Indizes der letzten Änderung dieser Datei in den letzten 24 h
export function geaenderteAbsaetze(root, rel) {
  const e = leseAenderungen(root).find((x) => x.datei === rel);
  if (!e || Date.now() - Date.parse(e.zeit) > TAG_MS) return [];
  return e.absaetze || [];
}

function alleMarkdown(ordner, basis, erg = []) {
  let eintraege = [];
  try { eintraege = fs.readdirSync(ordner, { withFileTypes: true }); } catch { return erg; }
  for (const e of eintraege) {
    if (e.name.startsWith('.')) continue;
    const voll = path.join(ordner, e.name);
    if (e.isDirectory()) alleMarkdown(voll, basis, erg);
    else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) erg.push(path.relative(basis, voll).split(path.sep).join('/'));
  }
  return erg;
}

// Neue Absätze, die im alten Stand nicht an passender Stelle vorkamen (LCS über Absatz-Hashes)
export function geaenderteIndizes(alt, neu) {
  const a = alt.map(absatzHash); const b = neu.map(absatzHash);
  if (a.length * b.length > 400000) {
    return b.map((h, i) => (a[i] === h ? -1 : i)).filter((i) => i >= 0);
  }
  const n = a.length; const m = b.length;
  const t = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  }
  const behalten = new Set();
  let i = 0; let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { behalten.add(j); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) i++;
    else j++;
  }
  const erg = [];
  for (let k = 0; k < m; k++) if (!behalten.has(k)) erg.push(k);
  return erg;
}

function titelFuer(root, rel, md) {
  const { frontmatter, absaetze: liste } = absaetze(md);
  const fm = parseFrontmatter(frontmatter);
  if (fm.titel || fm.title) return String(fm.titel || fm.title);
  const z = leseJsonLocker(ort(root, 'zustand'), {}) || {};
  const k = (z.kapitel || []).find((x) => x.datei === rel);
  if (k) return `${k.nr} ${k.titel || ''}`.trim();
  const ue = liste.find((x) => /^#{1,6}\s/.test(x));
  return ue ? ue.split('\n')[0].replace(/^#{1,6}\s+/, '') : path.basename(rel, '.md');
}

// Liefert { melde(rel), stop() }. melde nimmt jede Datei an und ignoriert, was keine Textdatei ist.
export function starteAenderungserkennung(root, { beiAenderung, log = () => {} } = {}) {
  const offen = new Set();
  let timer = null;

  const verarbeite = (rel, { melden = true } = {}) => {
    const voll = p(root, ...rel.split('/'));
    const snap = schnappDatei(root, rel);
    let neu;
    try { neu = fs.readFileSync(voll, 'utf8'); } catch {
      try { fs.unlinkSync(snap); } catch {}
      return false;
    }
    let alt = null;
    try { alt = fs.readFileSync(snap, 'utf8'); } catch {}
    const schreibeSnap = () => { fs.mkdirSync(path.dirname(snap), { recursive: true }); fs.writeFileSync(snap, neu, 'utf8'); };
    if (!melden) { schreibeSnap(); return false; }
    if (alt === null) alt = ''; // neu angelegt, während der Server lief: zählt als Änderung
    if (alt === neu) return false;
    const idx = geaenderteIndizes(absaetze(alt).absaetze, absaetze(neu).absaetze);
    const delta = zaehleWoerter(neu) - zaehleWoerter(alt);
    schreibeSnap();
    if (!idx.length && !delta) return false;
    const liste = leseAenderungen(root);
    const jetzt = new Date();
    const oben = liste[0];
    if (oben && oben.datei === rel && jetzt - Date.parse(oben.zeit) < ZUSAMMENFASSEN_MS) {
      oben.zeit = jetzt.toISOString();
      oben.absaetze = [...new Set([...(oben.absaetze || []), ...idx])].sort((x, y) => x - y);
      oben.woerter_delta = (Number(oben.woerter_delta) || 0) + delta;
      oben.titel = titelFuer(root, rel, neu);
    } else {
      liste.unshift({ zeit: jetzt.toISOString(), datei: rel, titel: titelFuer(root, rel, neu), absaetze: idx, woerter_delta: delta });
    }
    try { schreibeJson(aenderungsDatei(root), liste.slice(0, MAX)); } catch (e) { log('aenderungen.json: ' + e.message); }
    return true;
  };

  const abarbeiten = () => {
    timer = null;
    let etwas = false;
    for (const rel of [...offen]) {
      offen.delete(rel);
      try { if (verarbeite(rel)) etwas = true; } catch (e) { log(`Änderung ${rel}: ${e.message}`); }
    }
    if (etwas && beiAenderung) beiAenderung();
  };

  const melde = (rel) => {
    if (!istTextDatei(rel)) return;
    offen.add(rel);
    clearTimeout(timer);
    timer = setTimeout(abarbeiten, 250);
  };

  // Start: fehlende Schnappschüsse still anlegen, abweichende (Änderung bei ausgeschaltetem Server) melden
  let startGemeldet = false;
  for (const o of TEXT_ORTE) {
    for (const r of alleMarkdown(p(root, o), root)) {
      if (!istTextDatei(r)) continue;
      try {
        if (!fs.existsSync(schnappDatei(root, r))) verarbeite(r, { melden: false });
        else if (verarbeite(r)) startGemeldet = true;
      } catch (e) { log(`Schnappschuss ${r}: ${e.message}`); }
    }
  }
  if (startGemeldet && beiAenderung) setImmediate(beiAenderung);

  return { melde, stop() { clearTimeout(timer); } };
}
