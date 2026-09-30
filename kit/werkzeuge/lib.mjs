// Gemeinsame Helfer für alle Kit-Werkzeuge. Nur Node-Built-ins, läuft auf Windows und macOS.
//
// Exporte:
//   PHASEN                      Liste der 8 Phasen [{ id, name, kurz, command, beschreibung }]
//   PHASEN_IDS                  nur die IDs in fester Reihenfolge
//   MARKIERUNGEN                festes Vokabular für Quellen-Markierungen
//   QUELLEN_STATUS              vorschlag, genommen, verworfen, spaeter
//   KAPITEL_STATUS              offen, geplant, entwurf, geprueft, final
//   findeRoot(start?)           Projektwurzel (CLAUDE_PROJECT_DIR, sonst aufwärts bis kit/VERSION)
//   p(root, ...teile)           path.join-Kurzform
//   existiert(datei)            true/false
//   leseText(datei, fallback)   Datei als UTF-8 oder fallback
//   JsonKaputt                  Fehlerklasse { datei, grund, konfliktmarker } für unlesbare JSON-Dateien
//   leseJson(datei, ersatz)     JSON lesen. ersatz NUR bei fehlender Datei, sonst wirft JsonKaputt
//   pruefeJsonText(text)        null wenn gültig, sonst { grund, konfliktmarker }
//   meldungKaputt(e, root?)     deutscher Satz „Datei X ist beschädigt …“
//   beendeBeiKaputt(e, root?)   für CLIs: bei JsonKaputt Meldung auf stderr und exit 5, sonst false
//   schreibeJson(datei, obj)    atomar schreiben, vorher <datei>.bak (nur wenn die alte Datei gültig ist)
//   schreibeText(datei, text)   atomar schreiben (tmp + rename, mit Wiederholung für Windows)
//   lokal(root, ...teile)       Pfad in .lokal/ (gerätelokal, gitignored), legt den Ordner an
//   notiereAktivitaet(root, {woerter, quellen, aenderungen})   addiert auf heute in .lokal/aktivitaet.json
//   leseAktivitaet(root)        { tage: {...} } aus .lokal/aktivitaet.json, nie werfend
//   journal(root, aktion, text) hängt { zeit, aktion, text } an .lokal/journal.jsonl an
//   absaetze(md)                { frontmatter, absaetze: [text...] } (Leerzeilen trennen, CRLF-fest, Codeblöcke bleiben ganz)
//   absatzHash(text)            erste 12 Hex-Zeichen von sha1(text)
//   heute(d?)                   lokales Datum YYYY-MM-DD
//   jetztIso()                  ISO-Zeitstempel
//   tageBis(datum, von?)        ganze Tage von heute bis datum (negativ = vorbei), null bei ungültig
//   parseDatum(text)            YYYY-MM-DD und TT.MM.JJJJ, Date (lokal 00:00) oder null, auch bei 2026-02-31
//   datumDe(iso)                TT.MM.JJJJ
//   WOCHENTAGE                  ['so','mo','di','mi','do','fr','sa'] (Index = Date.getDay())
//   zaehleWoerter(markdown)     Fließtextwörter ohne Code, Überschriften, Zitierschlüssel, Formeln
//   parseBib(text, {roh})       [{ key, typ, felder, start, ende }], roh: Feldwerte unverändert
//   kitVersion(root)            Inhalt von kit/VERSION
//   slug(text)                  kebab-case ohne Umlaute
//   gitToplevelIstRoot(root)    true, wenn root selbst die Wurzel eines Git-Repos ist

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const PHASEN = [
  { id: 'einrichtung', name: 'Einrichtung', kurz: 'Start', command: '/start',
    beschreibung: 'Projekt einrichten: du, deine Arbeit, Hochschule, Fristen, Format.' },
  { id: 'thema', name: 'Thema', kurz: 'Thema', command: '/weiter',
    beschreibung: 'Thema finden oder schärfen, Forschungsfrage, Abgrenzung.' },
  { id: 'recherche', name: 'Recherche', kurz: 'Recherche', command: '/recherche',
    beschreibung: 'Literatur suchen, Quellen entscheiden, auswerten.' },
  { id: 'expose', name: 'Exposé', kurz: 'Exposé', command: '/weiter',
    beschreibung: 'Exposé für die Betreuung: Frage, Stand der Forschung, Methodik, Plan.' },
  { id: 'gliederung', name: 'Gliederung', kurz: 'Gliederung', command: '/weiter',
    beschreibung: 'Kapitelstruktur, Seitenbudget, Fachbegriffe festlegen.' },
  { id: 'schreiben', name: 'Schreiben', kurz: 'Schreiben', command: '/schreiben',
    beschreibung: 'Kapitel für Kapitel planen und schreiben.' },
  { id: 'pruefen', name: 'Prüfen', kurz: 'Prüfen', command: '/pruefen',
    beschreibung: 'Sprache, Zitattreue, Argumentation, Umfang prüfen.' },
  { id: 'abgabe', name: 'Abgabe', kurz: 'Abgabe', command: '/pdf',
    beschreibung: 'PDF bauen, Verzeichnisse, Hilfsmittel, Endkontrolle.' },
];
export const PHASEN_IDS = PHASEN.map((x) => x.id);
export const MARKIERUNGEN = ['kernquelle', 'methodik', 'daten', 'review', 'kritisch', 'definition', 'gegenposition'];
export const QUELLEN_STATUS = ['vorschlag', 'genommen', 'verworfen', 'spaeter'];
export const KAPITEL_STATUS = ['offen', 'geplant', 'entwurf', 'geprueft', 'final'];
export const WOCHENTAGE = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];

export function findeRoot(start) {
  const env = process.env.CLAUDE_PROJECT_DIR;
  if (!start && env && fs.existsSync(path.join(env, 'kit', 'VERSION'))) return env;
  let dir = path.resolve(start || process.cwd());
  for (let i = 0; i < 30; i++) {
    if (fs.existsSync(path.join(dir, 'kit', 'VERSION'))) return dir;
    const hoch = path.dirname(dir);
    if (hoch === dir) break;
    dir = hoch;
  }
  // Fallback: relativ zu dieser Datei (kit/werkzeuge/lib.mjs)
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
}

export const p = (root, ...teile) => path.join(root, ...teile);

export function existiert(datei) {
  try { fs.accessSync(datei); return true; } catch { return false; }
}

export function leseText(datei, fallback = '') {
  try { return fs.readFileSync(datei, 'utf8'); } catch { return fallback; }
}

export class JsonKaputt extends Error {
  constructor(datei, grund = '', konfliktmarker = false) {
    super(`Datei ${relativZuRoot(datei)} ist beschädigt${konfliktmarker ? ' (Konfliktmarker aus einem Sync)' : ''}.`);
    this.name = 'JsonKaputt';
    this.datei = datei;
    this.grund = grund;
    this.konfliktmarker = konfliktmarker;
  }
}

function relativZuRoot(datei, root) {
  try {
    const r = root || findeRoot(path.dirname(datei));
    const rel = path.relative(r, datei);
    if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return rel.split(path.sep).join('/');
  } catch {}
  return datei;
}

const KONFLIKT = /^(<{7}|={7}|>{7})(\s|$)/m;

export function pruefeJsonText(text) {
  const t = String(text).replace(/^\uFEFF/, '');
  const konflikt = KONFLIKT.test(t);
  try { JSON.parse(t); return null; } catch (e) {
    return { grund: konflikt ? 'Konfliktmarker (<<<<<<< / >>>>>>>) in der Datei' : e.message, konfliktmarker: konflikt };
  }
}

// ersatz kommt NUR bei fehlender Datei zurück. Unlesbares JSON wirft JsonKaputt,
// damit niemand still mit einer Vorlage weiterarbeitet und die echte Datei überschreibt.
export function leseJson(datei, ersatz = null) {
  let t;
  try { t = fs.readFileSync(datei, 'utf8'); } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return ersatz;
    throw e;
  }
  t = t.replace(/^\uFEFF/, '');
  try { return JSON.parse(t); } catch (e) {
    throw new JsonKaputt(datei, e.message, KONFLIKT.test(t));
  }
}

export function meldungKaputt(e, root) {
  const rel = relativZuRoot(e.datei, root);
  return `Datei ${rel} ist beschädigt${e.konfliktmarker ? ' (Konfliktmarker aus einem Sync)' : ''}. ` +
    'Nichts wurde geändert. Reparatur: node kit/werkzeuge/check.mjs --reparieren (oder Claude sagen: /hilfe reparieren).';
}

export function beendeBeiKaputt(e, root) {
  if (!(e instanceof JsonKaputt)) return false;
  process.stderr.write(meldungKaputt(e, root) + '\n');
  process.exit(5);
}

function schlafSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function schreibeText(datei, text) {
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  const tmp = `${datei}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, text, 'utf8');
  for (let versuch = 0; versuch < 5; versuch++) {
    try { fs.renameSync(tmp, datei); return; } catch (e) {
      // Windows: Virenscanner oder Watcher halten die Datei kurz fest
      if (versuch === 4) {
        try { fs.writeFileSync(datei, text, 'utf8'); } finally { try { fs.unlinkSync(tmp); } catch {} }
        return;
      }
      schlafSync(40 * (versuch + 1));
    }
  }
}

export function schreibeJson(datei, obj) {
  const text = JSON.stringify(obj, null, 2) + '\n';
  let alt = null;
  try { alt = fs.readFileSync(datei, 'utf8'); } catch {}
  if (alt === text) return false;
  // Sicherung nur von einer gültigen Fassung, sonst würde eine kaputte Datei die gute .bak ersetzen.
  if (alt !== null && !pruefeJsonText(alt)) {
    try { fs.writeFileSync(`${datei}.bak`, alt, 'utf8'); } catch {}
  }
  schreibeText(datei, text);
  return true;
}

// ---------- Gerätelokale Laufzeitdaten (.lokal/, gitignored) ----------

export function lokal(root, ...teile) {
  const basis = path.join(root, '.lokal');
  const ziel = path.join(basis, ...teile);
  try { fs.mkdirSync(teile.length ? path.dirname(ziel) : basis, { recursive: true }); } catch {}
  return ziel;
}

export function leseAktivitaet(root) {
  try {
    const a = leseJson(path.join(root, '.lokal', 'aktivitaet.json'), null);
    if (a && typeof a === 'object' && a.tage && typeof a.tage === 'object' && !Array.isArray(a.tage)) return a;
  } catch {}
  return { tage: {} };
}

export function notiereAktivitaet(root, { woerter = 0, quellen = 0, aenderungen = 0 } = {}) {
  const datei = lokal(root, 'aktivitaet.json');
  let a;
  try { a = leseJson(datei, null); } catch {
    // Gerätelokale Statistik: eine kaputte Datei beiseitelegen statt die Arbeit zu blockieren.
    try { fs.renameSync(datei, `${datei}.kaputt-${Date.now()}`); } catch {}
  }
  if (!a || typeof a !== 'object' || !a.tage || typeof a.tage !== 'object' || Array.isArray(a.tage)) a = { ...(a && typeof a === 'object' ? a : {}), tage: {} };
  const tag = heute();
  const e = (a.tage[tag] && typeof a.tage[tag] === 'object') ? a.tage[tag] : {};
  e.woerter = Math.max(0, (Number(e.woerter) || 0) + (Number(woerter) > 0 ? Number(woerter) : 0));
  e.quellen = (Number(e.quellen) || 0) + (Number(quellen) > 0 ? Number(quellen) : 0);
  e.aenderungen = (Number(e.aenderungen) || 0) + (Number(aenderungen) > 0 ? Number(aenderungen) : 0);
  a.tage[tag] = e;
  const tage = Object.keys(a.tage).sort();
  for (const t of tage.slice(0, Math.max(0, tage.length - 400))) delete a.tage[t];
  a.schema ??= 1;
  schreibeJson(datei, a);
  return { tag, ...e };
}

export function journal(root, aktion, text) {
  const zeile = JSON.stringify({ zeit: jetztIso(), aktion: String(aktion || ''), text: String(text || '') }) + '\n';
  fs.appendFileSync(lokal(root, 'journal.jsonl'), zeile, 'utf8');
}

// ---------- Absätze (Leseansicht, Absatz-Diff) ----------

export function absaetze(md) {
  let t = String(md || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  let frontmatter = null;
  const fm = /^---\n([\s\S]*?)\n---[ \t]*(\n|$)/.exec(t);
  if (fm) { frontmatter = fm[1]; t = t.slice(fm[0].length); }
  const liste = [];
  let akt = [];
  let zaun = null; // ``` oder ~~~ oder $$
  const abschliessen = () => {
    while (akt.length && !akt[akt.length - 1].trim()) akt.pop();
    if (akt.length) liste.push(akt.join('\n'));
    akt = [];
  };
  for (const zeile of t.split('\n')) {
    const z = zeile.trim();
    if (zaun) {
      akt.push(zeile);
      if (z.startsWith(zaun) || (zaun === '$$' && z.endsWith('$$'))) zaun = null;
      continue;
    }
    if (!z) { abschliessen(); continue; }
    const m = /^(```|~~~)/.exec(z);
    if (m) zaun = m[1];
    else if (z.startsWith('$$') && !(z.length > 2 && z.endsWith('$$'))) zaun = '$$';
    akt.push(zeile.replace(/[ \t]+$/, ''));
  }
  abschliessen();
  return { frontmatter, absaetze: liste };
}

export function absatzHash(text) {
  return crypto.createHash('sha1').update(String(text), 'utf8').digest('hex').slice(0, 12);
}

// ---------- Git ----------

export function gitToplevelIstRoot(root) {
  try {
    const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8', timeout: 5000, windowsHide: true });
    if (r.status !== 0) return false;
    const top = (r.stdout || '').trim();
    const norm = (x) => { let y = path.resolve(x); try { y = fs.realpathSync.native(y); } catch {} return process.platform === 'win32' || process.platform === 'darwin' ? y.toLowerCase() : y; };
    return norm(top) === norm(root);
  } catch { return false; }
}

const zwei = (n) => String(n).padStart(2, '0');

export function heute(d = new Date()) {
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

export function jetztIso() { return new Date().toISOString(); }

function gueltig(j, m, t) {
  const d = new Date(j, m - 1, t);
  return d.getFullYear() === j && d.getMonth() === m - 1 && d.getDate() === t ? d : null;
}

export function parseDatum(text) {
  if (!text || typeof text !== 'string') return null;
  let m = text.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return gueltig(+m[1], +m[2], +m[3]);
  m = text.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return gueltig(+m[3], +m[2], +m[1]);
  return null;
}

export function tageBis(datum, von = new Date()) {
  const d = datum instanceof Date ? datum : parseDatum(datum);
  if (!d || isNaN(d)) return null;
  const a = new Date(von.getFullYear(), von.getMonth(), von.getDate());
  return Math.round((d - a) / 86400000);
}

export function datumDe(iso) {
  const d = parseDatum(iso);
  if (!d) return iso || '';
  return `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function zaehleWoerter(md) {
  if (!md) return 0;
  let t = String(md).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  t = t.replace(/^---\n[\s\S]*?\n---[ \t]*(\n|$)/, '');           // Frontmatter
  t = t.replace(/```[\s\S]*?```/g, ' ');                 // Codeblöcke
  t = t.replace(/~~~[\s\S]*?~~~/g, ' ');
  t = t.replace(/<!--[\s\S]*?-->/g, ' ');                // Kommentare
  t = t.replace(/\$\$[\s\S]*?\$\$/g, ' ');               // Display-Formeln
  t = t.replace(/\$[^$\n]+\$/g, ' x ');                  // Inline-Formel zählt als ein Wort
  t = t.replace(/^\s{0,3}#{1,6}\s.*$/gm, ' ');           // Überschriften
  t = t.replace(/^\s*:\s.*\{#tbl:[^}]*\}\s*$/gm, ' ');   // Tabellenbeschriftung
  t = t.replace(/!\[([^\]]*)\]\([^)]*\)(\{[^}]*\})?/g, ' '); // Abbildungen
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');          // Links: Text behalten
  t = t.replace(/\[-?@[^\]]*\]/g, ' ');                  // [@key, S. 4]
  t = t.replace(/(^|\s)@[\w:.-]+/g, ' ');                // @key im Text
  t = t.replace(/`[^`]*`/g, ' ');                        // Inline-Code
  t = t.replace(/\\(ce|SI|si|qty|unit|num|chemfig)\{[^}]*\}(\{[^}]*\})?/g, ' x '); // Chemie/Einheit = 1 Wort
  t = t.replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?/g, ' '); // sonstige LaTeX-Befehle
  t = t.replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, ' ');        // Tabellentrenner
  t = t.replace(/[|*_>#~=]/g, ' ');
  const tokens = t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  return tokens.length;
}

// BibTeX-Parser. Kein vollständiger Parser, aber robust gegen verschachtelte Klammern.
// Auskommentierte Einträge (% @article{...}) und @comment/@preamble/@string werden übersprungen.
// roh: true lässt Feldwerte unverändert (nur getrimmt), sonst ohne Klammern und mit einfachem Leerraum.
// start/ende: Zeichenposition des Eintrags im Text (für wörtliches Kopieren).
export function parseBib(text, { roh = false } = {}) {
  const eintraege = [];
  if (!text) return eintraege;
  let i = 0;
  const n = text.length;
  const ueberspringeBlock = (j) => { // j steht hinter der öffnenden Klammer
    let tiefe = 1;
    for (; j < n && tiefe > 0; j++) {
      if (text[j] === '{' || text[j] === '(') tiefe++;
      else if (text[j] === '}' || text[j] === ')') tiefe--;
    }
    return j;
  };
  while (i < n) {
    const at = text.indexOf('@', i);
    if (at < 0) break;
    // Zeilen, die mit % beginnen, sind Kommentare
    const zeilenStart = Math.max(text.lastIndexOf('\n', at), text.lastIndexOf('\r', at)) + 1;
    if (/^[^\n]*%/.test(text.slice(zeilenStart, at))) { i = at + 1; continue; }
    const auf = text.slice(at).search(/[{(]/);
    if (auf < 0) break;
    const typ = text.slice(at + 1, at + auf).trim().toLowerCase();
    let j = at + auf + 1;
    if (!/^[a-z]+$/.test(typ)) { i = at + 1; continue; }
    if (['comment', 'preamble', 'string'].includes(typ)) { i = ueberspringeBlock(j); continue; }
    const komma = text.indexOf(',', j);
    if (komma < 0) break;
    const key = text.slice(j, komma).trim();
    if (!key || /[\s{}]/.test(key)) { i = at + 1; continue; }
    j = komma + 1;
    const felder = {};
    // Felder lesen bis zur schließenden Klammer des Eintrags
    while (j < n) {
      while (j < n && /[\s,]/.test(text[j])) j++;
      if (text[j] === '}' || text[j] === ')') { j++; break; }
      const m = text.slice(j, j + 200).match(/^([A-Za-z_][\w:.+-]*)\s*=\s*/);
      if (!m) { // unlesbar: bis zum nächsten Komma springen
        const k = text.indexOf(',', j); if (k < 0) { j = n; break; } j = k + 1; continue;
      }
      const name = m[1].toLowerCase();
      j += m[0].length;
      let wert = '';
      if (text[j] === '{') {
        let tiefe = 0; const s = j;
        for (; j < n; j++) {
          if (text[j] === '{') tiefe++;
          else if (text[j] === '}') { tiefe--; if (tiefe === 0) { j++; break; } }
        }
        wert = text.slice(s + 1, j - 1);
      } else if (text[j] === '"') {
        const s = ++j;
        let tiefe = 0;
        while (j < n && !(text[j] === '"' && tiefe === 0)) { if (text[j] === '{') tiefe++; else if (text[j] === '}') tiefe--; j++; }
        wert = text.slice(s, j); j++;
      } else {
        const s = j;
        while (j < n && !/[,})\r\n]/.test(text[j])) j++;
        wert = text.slice(s, j).trim();
      }
      felder[name] = roh ? wert.trim() : wert.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
    }
    eintraege.push({ key, typ, felder, start: at, ende: j });
    i = j;
  }
  return eintraege;
}

export function kitVersion(root) {
  return leseText(p(root, 'kit', 'VERSION'), '').trim() || '?';
}

export function slug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
