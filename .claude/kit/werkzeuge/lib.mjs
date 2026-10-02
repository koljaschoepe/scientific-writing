// Gemeinsame Helfer für alle Kit-Werkzeuge. Nur Node-Built-ins, läuft auf Windows und macOS.
//
// Exporte:
//   PHASEN                      Liste der 8 Phasen [{ id, name, kurz, command, beschreibung }]
//   PHASEN_IDS                  nur die IDs in fester Reihenfolge
//   MARKIERUNGEN                festes Vokabular für Quellen-Markierungen
//   QUELLEN_STATUS              vorschlag, genommen, verworfen, spaeter
//   KAPITEL_STATUS              offen, geplant, entwurf, geprueft, final ("plan" gilt als "geplant")
//   normStatus(s)               Status normalisieren (plan -> geplant), null bei unbekannt
//   pruefeUebergang(nr, von, nach)  null wenn erlaubt, sonst deutscher Satz (rückwärts frei, vorwärts ein Schritt, final nur aus geprueft)
//   erlaubteZiele(von)          Liste der Status, die von "von" aus erlaubt sind (ohne von selbst)
//   findeRoot(start?)           Projektwurzel (CLAUDE_PROJECT_DIR, sonst aufwärts bis .claude/kit/VERSION)
//   p(root, ...teile)           path.join-Kurzform
//   kit(root, ...teile)         Pfad unter .claude/kit/
//   arbeit(root, ...teile)      Pfad unter .arbeit/
//   KAPITEL_ORDNER, NOTIZ_ORDNER  'kapitel', 'quellen/notizen' (relativ, mit /)
//   leseEinstellungen(root)     .arbeit/einstellungen.md als Objekt in der Form des alten projekt.json (+ zeilen, datei)
//   setzeEinstellung(root, pfad, wert)  genau eine Zeile in einstellungen.md ändern (Punktpfad, z. B. 'arbeit.seiten')
//   setzeEinstellungen(root, {pfad: wert})  mehrere auf einmal
//   lesePlan(root)              .arbeit/plan.md -> { meilensteine, termine, fehler, vorhanden }
//   schreibeTermin(root, t, {zeile}?)   Termin einsortiert anlegen, liefert den Termin (mit id, zeile)
//   entferneTermin(root, zeile|id)      Termin entfernen, liefert { termin, zeile } fürs Undo
//   setzeTerminErledigt(root, zeile|id, erledigt)  liefert { termin, vorher }
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
//   journal(root, aktion, text) hängt { zeit, aktion, text } an .lokal/journal.jsonl an
//   absaetze(md)                { frontmatter, absaetze: [text...] } (Leerzeilen trennen, CRLF-fest, Codeblöcke bleiben ganz)
//   absatzHash(text)            erste 12 Hex-Zeichen von sha1(text)
//   heute(d?)                   lokales Datum YYYY-MM-DD
//   jetztIso()                  ISO-Zeitstempel
//   tageBis(datum, von?)        ganze Tage von heute bis datum (negativ = vorbei), null bei ungültig
//   parseDatum(text)            YYYY-MM-DD und TT.MM.JJJJ, Date (lokal 00:00) oder null, auch bei 2026-02-31
//   datumDe(iso)                TT.MM.JJJJ
//   zaehleWoerter(markdown)     Fließtextwörter ohne Code, Überschriften, Zitierschlüssel, Formeln
//   parseBib(text, {roh})       [{ key, typ, felder, start, ende }], roh: Feldwerte unverändert
//   kitVersion(root)            Inhalt von .claude/kit/VERSION
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
export const KAPITEL_ORDNER = 'kapitel';
export const NOTIZ_ORDNER = 'quellen/notizen';

const STATUS_NAME = { offen: 'offen', geplant: 'geplant', entwurf: 'im Entwurf', geprueft: 'geprüft', final: 'freigegeben' };

export function normStatus(s) {
  const t = String(s ?? '').trim().toLowerCase().replace('ü', 'ue');
  if (t === 'plan') return 'geplant';
  return KAPITEL_STATUS.includes(t) ? t : null;
}

// Reihenfolge offen -> geplant -> entwurf -> geprueft -> final.
// Rückwärts jederzeit, vorwärts nur einen Schritt, final nur aus geprueft.
export function pruefeUebergang(nr, von, nach) {
  const a = KAPITEL_STATUS.indexOf(normStatus(von) || 'offen');
  const b = KAPITEL_STATUS.indexOf(normStatus(nach));
  if (b < 0) return `Unbekannter Status "${nach}". Erlaubt: ${KAPITEL_STATUS.join(', ')}.`;
  if (a === b || b < a) return null;
  if (b === a + 1 && (b !== 4 || a === 3)) return null;
  const k = nr ? `Kapitel ${nr}` : 'Das Kapitel';
  if (b === 4) return `${k} ist ${STATUS_NAME[KAPITEL_STATUS[a]]}. Freigeben geht erst nach der Prüfung. Sag Claude: /pruefen${nr ? ' ' + nr : ''}`;
  return `${k} ist ${STATUS_NAME[KAPITEL_STATUS[a]]}. Weiter geht es nur einen Schritt: ${STATUS_NAME[KAPITEL_STATUS[a + 1]]}.`;
}

export function erlaubteZiele(von) {
  return KAPITEL_STATUS.filter((s) => s !== (normStatus(von) || 'offen') && !pruefeUebergang(null, von, s));
}

const ANKER = ['.claude', 'kit', 'VERSION'];

export function findeRoot(start) {
  const env = process.env.CLAUDE_PROJECT_DIR;
  if (!start && env && fs.existsSync(path.join(env, ...ANKER))) return path.resolve(env);
  let dir = path.resolve(start || process.cwd());
  for (let i = 0; i < 30; i++) {
    if (fs.existsSync(path.join(dir, ...ANKER))) return dir;
    const hoch = path.dirname(dir);
    if (hoch === dir) break;
    dir = hoch;
  }
  // Fallback: relativ zu dieser Datei (<root>/.claude/kit/werkzeuge/lib.mjs)
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
}

export const p = (root, ...teile) => path.join(root, ...teile);
export const kit = (root, ...teile) => path.join(root, '.claude', 'kit', ...teile);
export const arbeit = (root, ...teile) => path.join(root, '.arbeit', ...teile);

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
    'Nichts wurde geändert. Reparatur: node .claude/kit/werkzeuge/check.mjs --reparieren (oder Claude sagen: /hilfe reparieren).';
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

export function journal(root, aktion, text) {
  const zeile = JSON.stringify({ zeit: jetztIso(), aktion: String(aktion || ''), text: String(text || '') }) + '\n';
  fs.appendFileSync(lokal(root, 'journal.jsonl'), zeile, 'utf8');
}

// ---------- Absätze (Leseansicht, Absatz-Diff) ----------

// Ende einer abgesetzten Formel: $$ oder $$ {#eq:label}
const FORMEL_ENDE = /\$\$(\s*\{#[^}]*\})?$/;
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
      if (z.startsWith(zaun) || (zaun === '$$' && FORMEL_ENDE.test(z))) zaun = null;
      continue;
    }
    if (!z) { abschliessen(); continue; }
    const m = /^(```|~~~)/.exec(z);
    if (m) zaun = m[1];
    else if (z.startsWith('$$') && !(z.length > 2 && FORMEL_ENDE.test(z.slice(2)))) zaun = '$$';
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
  return leseText(kit(root, 'VERSION'), '').trim() || '?';
}

export function slug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

// ---------- Einstellungen (.arbeit/einstellungen.md) ----------
//
// Format: Abschnitte "## Name", darunter Zeilen "- schluessel: wert". HTML-Kommentare und alles andere
// ignoriert der Parser. Leere Werte gelten als nicht gesetzt (dann Default aus der Kit-Vorlage).
// Rückgabe in der Form des alten projekt.json, damit Konsumenten wenig ändern.

export const EINSTELLUNGEN_DATEI = '.arbeit/einstellungen.md';
const ABSCHNITT_NAME = { arbeit: 'Arbeit', person: 'Person', hochschule: 'Hochschule', zitieren: 'Zitieren', stil: 'Stil', layout: 'Layout', technik: 'Technik' };
export const VERZEICHNISSE = ['abbildungen', 'tabellen', 'abkuerzungen', 'formelzeichen', 'hilfsmittel', 'abstract', 'zusammenfassung', 'erklaerung', 'sperrvermerk', 'danksagung'];

// Letzte Rückfallebene, falls auch die Kit-Vorlage fehlt. Gleiche Werte wie die Vorlage.
const STANDARD = {
  arbeit: { typ: 'diplomarbeit', sprache: 'de', fachprofil: 'naturwissenschaft', eingerichtet: 'nein' },
  zitieren: { stil: 'chem-acs' },
  stil: { ich_form: 'nein', gedankenstriche: 'nein', semikolons: 'nein', satz_max_woerter: '30', kommas_max: '3', schreibmodus: 'claude-schreibt' },
  layout: { vorlage: 'koma', schriftgroesse: '11', zeilenabstand: '1.5', raender: '2.5/2.5/3/2.5', zweiseitig: 'nein',
    verzeichnisse: 'abbildungen, tabellen, abkuerzungen, hilfsmittel, abstract, zusammenfassung, erklaerung' },
  technik: { python: 'uv', zotero: 'nein', playwright: 'ja', abo: 'pro', dashboard_port: '4711', editor: 'automatisch' },
};

// Alte projekt.json-Pfade -> Punktpfad in einstellungen.md (für setzeEinstellung und die Migration)
const ALIAS = {
  'abgabe.datum': 'arbeit.abgabe', 'abgabe.beginn': 'arbeit.beginn',
  'autor.name': 'person.name', 'autor.matrikel': 'person.matrikel', 'autor.email': 'person.email',
  'betreuung.betreuer': 'hochschule.betreuer', 'betreuung.erstgutachter': 'hochschule.erstgutachter', 'betreuung.zweitgutachter': 'hochschule.zweitgutachter',
  'hochschule.bibliothek': 'hochschule.bibliothek', 'ki_regeln.status': 'hochschule.ki_regeln', 'ki_regeln': 'hochschule.ki_regeln', 'ki_regeln.quelle': 'hochschule.ki_quelle', 'ki_regeln.notiz': 'hochschule.ki_notiz',
  'zitation.stil': 'zitieren.stil', 'zitation.sprache_quellen': 'zitieren.sprache_quellen', 'schreibmodus': 'stil.schreibmodus',
  'latex.vorlage': 'layout.vorlage', 'latex.schrift': 'layout.schrift', 'latex.schriftgroesse': 'layout.schriftgroesse',
  'latex.zeilenabstand': 'layout.zeilenabstand', 'latex.raender_cm': 'layout.raender', 'latex.zweiseitig': 'layout.zweiseitig',
  'latex.logo': 'layout.logo', 'latex.verzeichnisse': 'layout.verzeichnisse',
  'werkzeuge.python': 'technik.python', 'werkzeuge.zotero': 'technik.zotero', 'werkzeuge.playwright': 'technik.playwright',
  'abo': 'technik.abo', 'dashboard.port': 'technik.dashboard_port', 'eingerichtet': 'arbeit.eingerichtet',
};

const ohneKommentare = (t) => String(t).replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
const schluesselNorm = (k) => slug(k).replace(/-/g, '_');

// { abschnitt: { schluessel: { wert, zeile } } }, zeile 1-basiert
function parseEinstellungenText(text) {
  const roh = {};
  const zeilen = ohneKommentare(String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n')).split('\n');
  let abschnitt = null;
  zeilen.forEach((z, i) => {
    const h = /^\s{0,3}##\s+(.+?)\s*#*\s*$/.exec(z);
    if (h) { abschnitt = schluesselNorm(h[1]); roh[abschnitt] ??= {}; return; }
    if (/^\s{0,3}#\s/.test(z)) { abschnitt = null; return; }
    if (!abschnitt) return;
    const m = /^\s*[-*]\s+([A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß .-]*?)\s*:\s?(.*)$/.exec(z);
    if (!m) return;
    roh[abschnitt][schluesselNorm(m[1])] = { wert: m[2].trim(), zeile: i + 1 };
  });
  return roh;
}

const istJa = (v) => /^(ja|j|yes|y|true|wahr|an|1)$/i.test(String(v).trim());
const zahl = (v, std) => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : std; };

export function parseSeiten(v) {
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*(?:(?:-|–|bis)\s*(\d+(?:[.,]\d+)?))?\s*$/.exec(String(v ?? ''));
  if (!m) return { min: 0, max: 0 };
  const a = zahl(m[1], 0), b = m[2] ? zahl(m[2], a) : a;
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

function formatiereWert(wert) {
  if (wert === null || wert === undefined) return '';
  if (typeof wert === 'boolean') return wert ? 'ja' : 'nein';
  if (Array.isArray(wert)) return wert.join(', ');
  if (typeof wert === 'object') {
    if ('min' in wert || 'max' in wert) {
      const a = Number(wert.min) || 0, b = Number(wert.max) || 0;
      return !a && !b ? '' : a === b || !b ? String(a || b) : `${a}-${b}`;
    }
    if ('oben' in wert || 'innen' in wert) return ['oben', 'unten', 'innen', 'aussen'].map((k) => String(wert[k] ?? '')).join('/');
    return Object.entries(wert).filter(([, v]) => v === true).map(([k]) => k).join(', ');
  }
  return String(wert).replace(/[\r\n]+/g, ' ').trim();
}

export function leseEinstellungen(root) {
  const datei = arbeit(root, 'einstellungen.md');
  const vorlage = parseEinstellungenText(leseText(kit(root, 'vorlagen', 'arbeit', 'einstellungen.md'), ''));
  const vorhanden = existiert(datei);
  const eigen = parseEinstellungenText(leseText(datei, ''));
  const zeilen = {};
  const w = (abschnitt, schluessel) => {
    const e = eigen[abschnitt]?.[schluessel];
    if (e) zeilen[`${abschnitt}.${schluessel}`] = e.zeile;
    if (e && e.wert !== '') return e.wert;
    const v = vorlage[abschnitt]?.[schluessel];
    if (v && v.wert !== '') return v.wert;
    return STANDARD[abschnitt]?.[schluessel] ?? '';
  };
  const ja = (a, k) => istJa(w(a, k));
  const raender = w('layout', 'raender').split(/[/;\s]+/).filter(Boolean).map((x) => zahl(x, null));
  const verz = w('layout', 'verzeichnisse').toLowerCase().split(/[,;]+/).map((x) => slug(x).replace(/-/g, '_')).filter(Boolean);
  const gedankenstriche = (w('stil', 'gedankenstriche') || 'nein').toLowerCase();
  const titel = w('arbeit', 'titel');
  const e = {
    schema: 1,
    eingerichtet: !!titel && ja('arbeit', 'eingerichtet'),
    arbeit: {
      titel, untertitel: w('arbeit', 'untertitel'), typ: w('arbeit', 'typ'), sprache: w('arbeit', 'sprache') || 'de',
      fachprofil: w('arbeit', 'fachprofil'), fachgebiet: w('arbeit', 'fachgebiet'), methodik: w('arbeit', 'methodik'),
      seiten: parseSeiten(w('arbeit', 'seiten')),
    },
    autor: { name: w('person', 'name'), matrikel: w('person', 'matrikel'), email: w('person', 'email') },
    hochschule: { name: w('hochschule', 'name'), fakultaet: w('hochschule', 'fakultaet'), institut: w('hochschule', 'institut'),
      studiengang: w('hochschule', 'studiengang'), ort: w('hochschule', 'ort'), bibliothek: w('hochschule', 'bibliothek') },
    betreuung: { betreuer: w('hochschule', 'betreuer'), erstgutachter: w('hochschule', 'erstgutachter'), zweitgutachter: w('hochschule', 'zweitgutachter') },
    abgabe: { beginn: w('arbeit', 'beginn'), datum: w('arbeit', 'abgabe') },
    ki_regeln: { status: w('hochschule', 'ki_regeln') || 'unbekannt', quelle: w('hochschule', 'ki_quelle'), notiz: w('hochschule', 'ki_notiz') },
    schreibmodus: w('stil', 'schreibmodus') || 'claude-schreibt',
    zitation: { stil: w('zitieren', 'stil'), sprache_quellen: w('zitieren', 'sprache_quellen') },
    stil: {
      ich_form: ja('stil', 'ich_form'),
      gedankenstriche: ['nein', 'sparsam', 'ja'].includes(gedankenstriche) ? gedankenstriche : (istJa(gedankenstriche) ? 'ja' : 'nein'),
      semikolons: ja('stil', 'semikolons'),
      satz_max_woerter: zahl(w('stil', 'satz_max_woerter'), 30),
      kommas_max: zahl(w('stil', 'kommas_max'), 3),
    },
    latex: {
      vorlage: w('layout', 'vorlage') || 'koma', schrift: w('layout', 'schrift'),
      schriftgroesse: zahl(w('layout', 'schriftgroesse'), 11), zeilenabstand: zahl(w('layout', 'zeilenabstand'), 1.5),
      raender_cm: { oben: raender[0] ?? 2.5, unten: raender[1] ?? 2.5, innen: raender[2] ?? 3, aussen: raender[3] ?? 2.5 },
      zweiseitig: ja('layout', 'zweiseitig'), logo: w('layout', 'logo'),
      verzeichnisse: Object.fromEntries(VERZEICHNISSE.map((k) => [k, verz.includes(k)])),
    },
    werkzeuge: { python: w('technik', 'python'), zotero: ja('technik', 'zotero'), playwright: ja('technik', 'playwright') },
    abo: w('technik', 'abo'),
    editor: w('technik', 'editor') || 'automatisch',
    dashboard: { port: zahl(w('technik', 'dashboard_port'), 4711) },
  };
  // Nicht im Objekt-JSON: Herkunft und Zeilennummern (für Sprünge nach VS Code)
  Object.defineProperty(e, 'datei', { enumerable: false, value: EINSTELLUNGEN_DATEI });
  Object.defineProperty(e, 'vorhanden', { enumerable: false, value: vorhanden });
  Object.defineProperty(e, 'zeilen', { enumerable: false, value: zeilen });
  Object.defineProperty(e, 'roh', { enumerable: false, value: eigen });
  return e;
}

function loesePfad(pfad) {
  const p0 = String(pfad || '').trim();
  const q = ALIAS[p0] || p0;
  const m = /^([a-z_]+)\.([a-z_]+)$/.exec(q);
  if (!m || !ABSCHNITT_NAME[m[1]]) {
    throw new Error(`Unbekannter Einstellungspfad "${pfad}". Form: abschnitt.schluessel, z. B. arbeit.seiten. Abschnitte: ${Object.keys(ABSCHNITT_NAME).join(', ')}`);
  }
  return { abschnitt: m[1], schluessel: m[2] };
}

function einstellungenGrundtext(root) {
  const v = leseText(kit(root, 'vorlagen', 'arbeit', 'einstellungen.md'), '');
  return v || '# Einstellungen\n';
}

// Ändert genau eine Zeile. Kommentare und alles andere bleiben. Fehlt der Schlüssel, wird er am Ende
// des Abschnitts ergänzt, fehlt der Abschnitt, wird er angehängt, fehlt die Datei, gilt die Kit-Vorlage.
export function setzeEinstellungen(root, werte) {
  const datei = arbeit(root, 'einstellungen.md');
  const alt = existiert(datei) ? leseText(datei, '') : einstellungenGrundtext(root);
  const crlf = /\r\n/.test(alt);
  const zeilen = alt.replace(/\r\n?/g, '\n').split('\n');
  const aenderungen = [];
  for (const [pfad, wert] of Object.entries(werte)) {
    const { abschnitt, schluessel } = loesePfad(pfad);
    const neuWert = formatiereWert(wert);
    const sauber = ohneKommentare(zeilen.join('\n')).split('\n');
    let inAbschnitt = false, abschnittZeile = -1, letzteZeile = -1, treffer = -1;
    for (let i = 0; i < sauber.length; i++) {
      const h = /^\s{0,3}(#{1,2})\s+(.+?)\s*#*\s*$/.exec(sauber[i]);
      if (h) {
        if (inAbschnitt) break;
        inAbschnitt = h[1] === '##' && schluesselNorm(h[2]) === abschnitt;
        if (inAbschnitt) { abschnittZeile = i; letzteZeile = i; }
        continue;
      }
      if (!inAbschnitt) continue;
      const m = /^\s*[-*]\s+([A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß .-]*?)\s*:/.exec(sauber[i]);
      if (m) { letzteZeile = i; if (schluesselNorm(m[1]) === schluessel) { treffer = i; break; } }
    }
    if (treffer >= 0) {
      const z = zeilen[treffer];
      const m = /^(\s*[-*]\s+[^:]*:)(.*?)(\s*<!--.*-->\s*)?$/.exec(z);
      const altWert = m ? m[2].trim() : '';
      if (altWert === neuWert) continue;
      zeilen[treffer] = `${m[1]}${neuWert ? ' ' + neuWert : ''}${m[3] ? m[3].replace(/\s+$/, '') : ''}`;
      aenderungen.push({ pfad: `${abschnitt}.${schluessel}`, alt: altWert, neu: neuWert, zeile: treffer + 1 });
    } else if (abschnittZeile >= 0) {
      zeilen.splice(letzteZeile + 1, 0, `- ${schluessel}: ${neuWert}`.trimEnd());
      aenderungen.push({ pfad: `${abschnitt}.${schluessel}`, alt: null, neu: neuWert, zeile: letzteZeile + 2 });
    } else {
      while (zeilen.length && zeilen[zeilen.length - 1].trim() === '') zeilen.pop();
      zeilen.push('', `## ${ABSCHNITT_NAME[abschnitt] || abschnitt}`, `- ${schluessel}: ${neuWert}`.trimEnd(), '');
      aenderungen.push({ pfad: `${abschnitt}.${schluessel}`, alt: null, neu: neuWert, zeile: zeilen.length - 1 });
    }
  }
  if (aenderungen.length || !existiert(datei)) {
    let text = zeilen.join('\n');
    if (!text.endsWith('\n')) text += '\n';
    schreibeText(datei, crlf ? text.replace(/\n/g, '\r\n') : text);
  }
  return { datei: EINSTELLUNGEN_DATEI, aenderungen };
}

export function setzeEinstellung(root, pfad, wert) {
  const r = setzeEinstellungen(root, { [pfad]: wert });
  return { datei: r.datei, ...(r.aenderungen[0] || { pfad, geaendert: false }), geaendert: r.aenderungen.length > 0 };
}

// ---------- Plan (.arbeit/plan.md) ----------
//
// ## Meilensteine:  - 2026-11-15 · Methodik Entwurf · kapitel: 3 · status: entwurf
// ## Termine:       - 2026-10-20 14:00 · Betreuung Dr. Müller · erledigt
// id Termin: "t-" + 10 Hex aus sha1(datum|zeit|text), bei Duplikaten -2, -3. Meilenstein: "m-<n>".

export const PLAN_DATEI = '.arbeit/plan.md';
const PLAN_GRUNDTEXT = '# Plan\n\n## Meilensteine\n\n## Termine\n';
const TRENNER = /\s+·\s+|\s+\|\s+/;

function planText(root) {
  const datei = arbeit(root, 'plan.md');
  if (existiert(datei)) return leseText(datei, '');
  return leseText(kit(root, 'vorlagen', 'arbeit', 'plan.md'), '') || PLAN_GRUNDTEXT;
}

const nrNorm = (n) => String(n).trim().split('.').map((x) => (/^\d+$/.test(x) ? String(Number(x)) : x)).join('.');

function datumTeil(t) {
  const m = /^(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*Uhr)?)?\s*$/.exec(t.trim());
  if (!m) return null;
  const d = parseDatum(m[1]);
  if (!d) return null;
  return { datum: heute(d), zeit: m[2] ? `${m[2].padStart(2, '0')}:${m[3]}` : '' };
}

function terminId(datum, zeit, text) {
  return 't-' + crypto.createHash('sha1').update(`${datum}|${zeit || ''}|${text}`, 'utf8').digest('hex').slice(0, 10);
}

function parsePlanText(text) {
  const zeilen = ohneKommentare(String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n')).split('\n');
  const meilensteine = [], termine = [], fehler = [];
  const ids = new Map();
  let abschnitt = null, abschnitte = { meilensteine: null, termine: null };
  zeilen.forEach((z, i) => {
    const h = /^\s{0,3}##\s+(.+?)\s*#*\s*$/.exec(z);
    if (h) {
      const n = slug(h[1]);
      abschnitt = n.startsWith('meilenstein') ? 'meilensteine' : n.startsWith('termin') ? 'termine' : null;
      if (abschnitt) abschnitte[abschnitt] = i + 1;
      return;
    }
    if (!abschnitt) return;
    const m = /^\s*[-*]\s+(.+?)\s*$/.exec(z);
    if (!m) return;
    const teile = m[1].split(TRENNER).map((x) => x.trim()).filter(Boolean);
    const d = datumTeil(teile[0] || '');
    if (!d || !teile[1]) { fehler.push({ zeile: i + 1, text: m[1], grund: 'Erwartet: - JJJJ-MM-TT · Text' }); return; }
    const text = teile[1];
    const extra = {}; let erledigt = false;
    for (const t of teile.slice(2)) {
      const kv = /^([A-Za-zäöüß_]+)\s*:\s*(.*)$/.exec(t);
      if (kv) extra[schluesselNorm(kv[1])] = kv[2].trim();
      else if (/^(erledigt|erledigt\.|done|x)$/i.test(t)) erledigt = true;
      else extra.notiz = extra.notiz ? `${extra.notiz}, ${t}` : t;
    }
    if (abschnitt === 'meilensteine') {
      const kap = String(extra.kapitel ?? 'alle').trim();
      meilensteine.push({
        id: `m-${meilensteine.length + 1}`, datum: d.datum, zeit: d.zeit, text,
        kapitel: /^alle$/i.test(kap) || !kap ? ['alle'] : kap.split(/[,;\s]+/).filter(Boolean).map(nrNorm),
        status: normStatus(extra.status) || 'final', zeile: i + 1,
      });
    } else {
      let id = terminId(d.datum, d.zeit, text);
      const n = (ids.get(id) || 0) + 1; ids.set(id, n);
      if (n > 1) id = `${id}-${n}`;
      termine.push({ id, datum: d.datum, zeit: d.zeit, text, erledigt, ...(extra.ort ? { ort: extra.ort } : {}),
        ...(extra.notiz ? { notiz: extra.notiz } : {}), zeile: i + 1 });
    }
  });
  return { meilensteine, termine, fehler, abschnitte };
}

export function lesePlan(root) {
  const datei = arbeit(root, 'plan.md');
  const vorhanden = existiert(datei);
  const r = parsePlanText(vorhanden ? leseText(datei, '') : '');
  return { datei: PLAN_DATEI, vorhanden, meilensteine: r.meilensteine, termine: r.termine, fehler: r.fehler };
}

function sauberText(t) {
  return String(t ?? '').replace(/[\r\n]+/g, ' ').replace(/·/g, '-').replace(/\s+\|\s+/g, ' - ').replace(/\s+/g, ' ').trim().slice(0, 200);
}

function terminZeile(t) {
  const teile = [`${t.datum}${t.zeit ? ' ' + t.zeit : ''}`, sauberText(t.text)];
  if (t.ort) teile.push(`ort: ${sauberText(t.ort)}`);
  if (t.notiz) teile.push(`notiz: ${sauberText(t.notiz)}`);
  if (t.erledigt) teile.push('erledigt');
  return `- ${teile.join(' · ')}`;
}

function schreibePlanZeilen(root, zeilen, crlf) {
  let text = zeilen.join('\n');
  if (!text.endsWith('\n')) text += '\n';
  schreibeText(arbeit(root, 'plan.md'), crlf ? text.replace(/\n/g, '\r\n') : text);
}

function findeTermin(root, wer) {
  const roh = planText(root);
  const r = parsePlanText(roh);
  const istZeile = typeof wer === 'number' || /^\d+$/.test(String(wer));
  const t = r.termine.find((x) => (istZeile ? x.zeile === Number(wer) : x.id === String(wer)));
  if (!t) throw Object.assign(new Error(`Termin ${wer} gibt es in ${PLAN_DATEI} nicht.`), { code: 'ENOENT' });
  return { roh, r, t };
}

// t: { datum, zeit?, text, erledigt?, ort?, notiz? }. optionen.zeile: an diese Stelle (Undo), sonst nach Datum.
export function schreibeTermin(root, t, optionen = {}) {
  const text = sauberText(t?.text ?? t?.titel);
  const d = datumTeil(`${t?.datum ?? ''}${t?.zeit ? ' ' + t.zeit : ''}`);
  if (!d) throw new Error('Termin braucht ein gültiges Datum (JJJJ-MM-TT) und optional eine Zeit (HH:MM).');
  if (!text) throw new Error('Termin braucht einen Text.');
  const roh = planText(root);
  const crlf = /\r\n/.test(roh);
  const zeilen = roh.replace(/\r\n?/g, '\n').split('\n');
  const r = parsePlanText(roh);
  const neu = { datum: d.datum, zeit: d.zeit, text, erledigt: !!t.erledigt, ort: t.ort, notiz: t.notiz };
  let ziel;
  if (!r.abschnitte.termine) {
    while (zeilen.length && zeilen[zeilen.length - 1].trim() === '') zeilen.pop();
    zeilen.push('', '## Termine');
    ziel = zeilen.length;
  } else {
    const start = r.abschnitte.termine; // 1-basiert = Index der Zeile danach
    let ende = zeilen.length;
    for (let i = start; i < zeilen.length; i++) if (/^\s{0,3}#{1,2}\s/.test(zeilen[i])) { ende = i; break; }
    const imAbschnitt = r.termine.filter((x) => x.zeile > start && x.zeile <= ende);
    const wunsch = Number(optionen.zeile);
    if (wunsch && wunsch - 1 > start - 1 && wunsch - 1 <= ende) ziel = wunsch - 1;
    else {
      const spaeter = imAbschnitt.find((x) => `${x.datum} ${x.zeit || '99:99'}` > `${neu.datum} ${neu.zeit || '99:99'}`);
      if (spaeter) ziel = spaeter.zeile - 1;
      else if (imAbschnitt.length) ziel = imAbschnitt[imAbschnitt.length - 1].zeile;
      else {
        // leerer Abschnitt: hinter die letzte nicht leere Zeile (Überschrift oder Erklärkommentar)
        ziel = start;
        for (let i = start; i < ende; i++) if (zeilen[i].trim()) ziel = i + 1;
      }
    }
  }
  zeilen.splice(ziel, 0, terminZeile(neu));
  schreibePlanZeilen(root, zeilen, crlf);
  const nach = lesePlan(root).termine.find((x) => x.zeile === ziel + 1);
  return nach || { ...neu, id: terminId(neu.datum, neu.zeit, neu.text), zeile: ziel + 1 };
}

export function entferneTermin(root, wer) {
  const { roh, t } = findeTermin(root, wer);
  const crlf = /\r\n/.test(roh);
  const zeilen = roh.replace(/\r\n?/g, '\n').split('\n');
  zeilen.splice(t.zeile - 1, 1);
  schreibePlanZeilen(root, zeilen, crlf);
  return { termin: t, zeile: t.zeile };
}

export function setzeTerminErledigt(root, wer, erledigt = true) {
  const { roh, t } = findeTermin(root, wer);
  const vorher = { erledigt: t.erledigt };
  if (t.erledigt === !!erledigt) return { termin: t, vorher };
  const crlf = /\r\n/.test(roh);
  const zeilen = roh.replace(/\r\n?/g, '\n').split('\n');
  const alt = zeilen[t.zeile - 1];
  const kommentar = /(\s*<!--.*-->\s*)$/.exec(alt);
  let kern = kommentar ? alt.slice(0, kommentar.index) : alt;
  if (erledigt) kern = `${kern.replace(/\s+$/, '')} · erledigt`;
  else kern = kern.replace(/\s+(·|\|)\s+(erledigt\.?|done|x)(?=\s+(·|\|)\s+|\s*$)/i, '');
  zeilen[t.zeile - 1] = kern + (kommentar ? kommentar[1].replace(/\s+$/, '') : '');
  schreibePlanZeilen(root, zeilen, crlf);
  return { termin: { ...t, erledigt: !!erledigt }, vorher };
}
