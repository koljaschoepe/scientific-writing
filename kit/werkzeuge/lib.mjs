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
//   leseJson(datei, fallback)   JSON lesen, bei Fehler fallback
//   schreibeJson(datei, obj)    atomar schreiben (tmp + rename, mit Wiederholung für Windows)
//   schreibeText(datei, text)   atomar schreiben
//   heute(d?)                   lokales Datum YYYY-MM-DD
//   jetztIso()                  ISO-Zeitstempel
//   tageBis(datum, von?)        ganze Tage von heute bis datum (negativ = vorbei), null bei ungültig
//   parseDatum(text)            akzeptiert YYYY-MM-DD und TT.MM.JJJJ, liefert Date (lokal 00:00) oder null
//   datumDe(iso)                TT.MM.JJJJ
//   WOCHENTAGE                  ['so','mo','di','mi','do','fr','sa'] (Index = Date.getDay())
//   zaehleWoerter(markdown)     Fließtextwörter ohne Code, Überschriften, Zitierschlüssel, Formeln
//   parseBib(text)              [{ key, typ, felder: { title, author, year, doi, ... } }]
//   kitVersion(root)            Inhalt von kit/VERSION
//   slug(text)                  kebab-case ohne Umlaute

import fs from 'node:fs';
import path from 'node:path';
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

export function leseJson(datei, fallback = null) {
  try {
    const t = fs.readFileSync(datei, 'utf8').replace(/^﻿/, '');
    return JSON.parse(t);
  } catch { return fallback; }
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
  schreibeText(datei, JSON.stringify(obj, null, 2) + '\n');
}

const zwei = (n) => String(n).padStart(2, '0');

export function heute(d = new Date()) {
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

export function jetztIso() { return new Date().toISOString(); }

export function parseDatum(text) {
  if (!text || typeof text !== 'string') return null;
  let m = text.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = text.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
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
  let t = md.replace(/^﻿/, '');
  t = t.replace(/^---\n[\s\S]*?\n---\n/, '');           // Frontmatter
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

// BibTeX-Parser für die Anzeige. Kein vollständiger Parser, aber robust gegen verschachtelte Klammern.
export function parseBib(text) {
  const eintraege = [];
  if (!text) return eintraege;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const at = text.indexOf('@', i);
    if (at < 0) break;
    // Zeilen, die mit % beginnen, sind Kommentare
    const zeilenStart = text.lastIndexOf('\n', at) + 1;
    if (/^\s*%/.test(text.slice(zeilenStart, at + 1))) { i = at + 1; continue; }
    const auf = text.slice(at).search(/[{(]/);
    if (auf < 0) break;
    const typ = text.slice(at + 1, at + auf).trim().toLowerCase();
    let j = at + auf + 1;
    if (['comment', 'preamble', 'string'].includes(typ) || !/^[a-z]+$/.test(typ)) { i = j; continue; }
    const komma = text.indexOf(',', j);
    if (komma < 0) break;
    const key = text.slice(j, komma).trim();
    j = komma + 1;
    const felder = {};
    // Felder lesen bis zur schließenden Klammer des Eintrags
    while (j < n) {
      while (j < n && /[\s,]/.test(text[j])) j++;
      if (text[j] === '}' || text[j] === ')') { j++; break; }
      const m = text.slice(j).match(/^([A-Za-z_][\w-]*)\s*=\s*/);
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
        while (j < n && text[j] !== '"') j++;
        wert = text.slice(s, j); j++;
      } else {
        const s = j;
        while (j < n && !/[,}\n]/.test(text[j])) j++;
        wert = text.slice(s, j).trim();
      }
      felder[name] = wert.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
    }
    eintraege.push({ key, typ, felder });
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
