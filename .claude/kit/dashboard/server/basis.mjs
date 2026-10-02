// Gemeinsame Bausteine des Dashboard-Servers: Brücke zu .claude/kit/werkzeuge/lib.mjs, HTTP-Hilfen, Fehlerform.
//
// Die Exporte von lib.mjs (JsonKaputt, lokal, journal, absaetze, absatzHash, strenges leseJson) werden
// genutzt, sobald es sie gibt. Solange eine ältere lib.mjs liegt (etwa mitten in einem /update),
// springen gleichwertige lokale Helfer ein.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as lib from '../../werkzeuge/lib.mjs';

// ---------- Brücke zu lib.mjs ----------

class JsonKaputtLokal extends Error {
  constructor(datei, ursache) {
    super(`Datei ${datei} ist beschädigt.`);
    this.name = 'JsonKaputt';
    this.datei = datei;
    this.ursache = ursache;
  }
}
export const JsonKaputt = lib.JsonKaputt || JsonKaputtLokal;

export const istKaputt = (e) => !!e && (e instanceof JsonKaputt || e instanceof JsonKaputtLokal || e.name === 'JsonKaputt');

// Liest JSON streng: fehlende Datei → ersatz, unlesbare Datei → wirft JsonKaputt. Nie still ersetzen.
export function leseJsonStreng(datei, ersatz = null) {
  if (lib.JsonKaputt) return lib.leseJson(datei, ersatz);
  let t;
  try { t = fs.readFileSync(datei, 'utf8'); } catch (e) {
    if (e.code === 'ENOENT') return ersatz;
    throw e;
  }
  try { return JSON.parse(t.replace(/^﻿/, '')); } catch (e) { throw new JsonKaputtLokal(datei, e); }
}

// Liest JSON, gibt bei jedem Problem ersatz zurück (für Laufzeitdateien, die nie wichtig sind)
export function leseJsonLocker(datei, ersatz = null) {
  try { return leseJsonStreng(datei, ersatz) ?? ersatz; } catch { return ersatz; }
}

export const schreibeJson = lib.schreibeJson;
export const schreibeText = lib.schreibeText;

export function lokal(root, ...teile) {
  if (lib.lokal) return lib.lokal(root, ...teile);
  const ordner = path.join(root, '.lokal');
  fs.mkdirSync(ordner, { recursive: true });
  return path.join(ordner, ...teile);
}

export function journal(root, aktion, text) {
  try {
    if (lib.journal) return lib.journal(root, aktion, text);
    const zeile = JSON.stringify({ zeit: new Date().toISOString(), aktion, text }) + '\n';
    fs.appendFileSync(lokal(root, 'journal.jsonl'), zeile, 'utf8');
  } catch (e) { console.error('Journal:', e.message); }
}

export function absatzHash(text) {
  if (lib.absatzHash) return lib.absatzHash(text);
  return crypto.createHash('sha1').update(String(text), 'utf8').digest('hex').slice(0, 12);
}

// Trennt Frontmatter und Absätze (an Leerzeilen, CRLF-fest, Code-/Formelblöcke bleiben ganz).
// Gleiche Regeln wie absaetze() in lib.mjs v2.1, nur Rückfall für ältere lib.mjs.
function absaetzeLokal(md) {
  let t = String(md || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  let frontmatter = null;
  const fm = /^---\n([\s\S]*?)\n---[ \t]*(\n|$)/.exec(t);
  if (fm) { frontmatter = fm[1]; t = t.slice(fm[0].length); }
  const liste = []; let akt = []; let zaun = null;
  const abschliessen = () => {
    while (akt.length && !akt[akt.length - 1].trim()) akt.pop();
    if (akt.length) liste.push(akt.join('\n'));
    akt = [];
  };
  for (const zeile of t.split('\n')) {
    const z = zeile.trim();
    if (zaun) {
      akt.push(zeile);
      if (z.startsWith(zaun) || (zaun === '$$' && /\$\$(\s*\{#[^}]*\})?$/.test(z))) zaun = null;
      continue;
    }
    if (!z) { abschliessen(); continue; }
    const m = /^(```|~~~)/.exec(z);
    if (m) zaun = m[1];
    else if (z.startsWith('$$') && !(z.length > 2 && /\$\$(\s*\{#[^}]*\})?$/.test(z.slice(2)))) zaun = '$$';
    akt.push(zeile.replace(/[ \t]+$/, ''));
  }
  abschliessen();
  return { frontmatter, absaetze: liste };
}
export function absaetze(md) {
  const r = lib.absaetze ? lib.absaetze(md) : absaetzeLokal(md);
  return { frontmatter: r.frontmatter ?? '', absaetze: (r.absaetze || []).map((x) => (typeof x === 'string' ? x : String(x?.text ?? ''))) };
}

// Frontmatter als Objekt (einfaches YAML: key: wert, gefaltete Blöcke mit > oder |, Listen [a, b])
export function parseFrontmatter(fm) {
  if (fm && typeof fm === 'object') return fm;
  const erg = {};
  const zeilen = String(fm || '').replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < zeilen.length; i++) {
    const m = zeilen[i].match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    let wert = m[2].trim();
    if (/^[>|][-+]?$/.test(wert)) {
      const teile = [];
      while (i + 1 < zeilen.length && (/^\s+\S/.test(zeilen[i + 1]) || zeilen[i + 1].trim() === '')) teile.push(zeilen[++i].trim());
      wert = wert.startsWith('>') ? teile.filter(Boolean).join(' ') : teile.join('\n').trim();
    } else if (/^\[.*\]$/.test(wert)) {
      wert = wert.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      wert = wert.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
      if (wert === 'true') wert = true; else if (wert === 'false') wert = false;
    }
    erg[m[1]] = wert;
  }
  return erg;
}

export function liesFrontmatterDatei(text) {
  const m = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').match(/^---\n([\s\S]*?)\n---/);
  return { daten: parseFrontmatter(m ? m[1] : ''), rumpf: m ? String(text).replace(/\r\n?/g, '\n').slice(m[0].length).replace(/^\n/, '') : String(text || '') };
}

// ---------- Pfade ----------

const FALT = process.platform === 'win32' || process.platform === 'darwin';
export function echterPfad(p) {
  let r;
  try { r = fs.realpathSync.native(p); } catch { r = path.resolve(p || ''); }
  r = r.normalize('NFC');
  return FALT ? r.toLowerCase() : r;
}

// Liegt ziel (nach Auflösen aller Symlinks) innerhalb von ordner? Beide müssen existieren.
export function liegtIn(ordner, ziel) {
  try {
    const a = fs.realpathSync.native(ordner).normalize('NFC');
    const b = fs.realpathSync.native(ziel).normalize('NFC');
    const rel = path.relative(FALT ? a.toLowerCase() : a, FALT ? b.toLowerCase() : b);
    return rel === '' || (!!rel && !rel.startsWith('..') && !path.isAbsolute(rel));
  } catch { return false; }
}

// Relativer Pfad in Schrägstrich-Form prüfen (kein .., nicht absolut, keine Steuerzeichen)
export function sichererRel(rel) {
  const r = String(rel || '').replace(/\\/g, '/');
  if (!r || r.startsWith('/') || /^[a-zA-Z]:/.test(r) || /[\u0000-\u001f]/.test(r)) return null;
  const teile = r.split('/');
  if (teile.some((t) => t === '..' || t === '')) return null;
  return teile.join('/');
}

// ---------- HTTP ----------

export class HttpFehler extends Error {
  constructor(status, code, fehler, extra = {}) {
    super(fehler);
    this.status = status; this.code = code; this.extra = extra;
  }
}
export const ungueltig = (text) => new HttpFehler(400, 'ungueltig', text);
export const nichtGefunden = (text = 'Nicht gefunden.') => new HttpFehler(404, 'nicht_gefunden', text);
export const konflikt = (text, extra) => new HttpFehler(409, 'konflikt', text, extra);

export function kaputtFehler(root, e) {
  const rel = e?.datei ? path.relative(root, e.datei).split(path.sep).join('/') : 'eine Datei';
  return new HttpFehler(409, 'kaputt', `Datei ${rel} ist beschädigt. Sag Claude: /hilfe reparieren`, { datei: rel });
}

export function sende(res, code, body, typ = 'application/json; charset=utf-8', kopf = {}) {
  if (res.headersSent) { try { res.end(); } catch {} return; }
  const daten = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': typ, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...kopf });
  res.end(daten);
}

export function sendeFehler(res, root, e) {
  if (istKaputt(e)) e = kaputtFehler(root, e);
  if (e instanceof HttpFehler) return sende(res, e.status, { fehler: e.message, code: e.code, ...e.extra });
  console.error('Interner Fehler:', e?.stack || e);
  return sende(res, 500, { fehler: `Interner Fehler: ${e?.message || e}`, code: 'intern' });
}

export function leseKoerper(req, max = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const teile = []; let groesse = 0; let fertig = false;
    req.on('data', (c) => {
      if (fertig) return;
      groesse += c.length;
      if (groesse > max) { fertig = true; reject(new HttpFehler(413, 'zu_gross', 'Anfrage ist zu groß.')); req.resume(); return; }
      teile.push(c);
    });
    req.on('end', () => { if (!fertig) { fertig = true; resolve(Buffer.concat(teile)); } });
    req.on('error', (e) => { if (!fertig) { fertig = true; reject(e); } });
  });
}

export async function leseJsonKoerper(req) {
  const b = await leseKoerper(req);
  const t = b.toString('utf8').trim();
  if (!t) return {};
  let obj;
  try { obj = JSON.parse(t); } catch { throw ungueltig('Anfrage ist kein gültiges JSON.'); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw ungueltig('Anfrage muss ein JSON-Objekt sein.');
  return obj;
}

export const TYPEN = {
  '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.gif': 'image/gif', '.webp': 'image/webp', '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm', '.bcmap': 'application/octet-stream', '.ftl': 'text/plain; charset=utf-8',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.pfb': 'application/octet-stream',
  '.bib': 'text/plain; charset=utf-8', '.csv': 'text/plain; charset=utf-8', '.html': 'text/plain; charset=utf-8',
};

export function sendeDatei(res, voll) {
  const typ = TYPEN[path.extname(voll).toLowerCase()] || 'application/octet-stream';
  const st = fs.statSync(voll);
  const kopf = { 'Content-Type': typ, 'Content-Length': st.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  // SVG aus Nutzerordnern darf kein Skript ausführen (PDF bleibt ohne sandbox, sonst streikt der Browser-Viewer)
  if (/\.(svg|html?)$/i.test(voll)) kopf['Content-Security-Policy'] = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox";
  res.writeHead(200, kopf);
  const s = fs.createReadStream(voll);
  s.on('error', () => { try { res.destroy(); } catch {} });
  s.pipe(res);
}

export const rel = (root, voll) => path.relative(root, voll).split(path.sep).join('/');

// Absoluter Pfad in der Form für vscode://file<abs>:<zeile> (immer /, immer mit führendem /, auch unter Windows)
export function absPfad(root, relPfad = '') {
  const voll = relPfad ? path.join(root, ...String(relPfad).split('/')) : root;
  const s = path.resolve(voll).split(path.sep).join('/');
  return s.startsWith('/') ? s : '/' + s;
}

// Orte der v3-Struktur (relativ zum Projekt, Schrägstrich-Form)
export const ORTE = {
  kapitel: 'kapitel',
  arbeit: '.arbeit',
  notizen: 'quellen/notizen',
  pdfs: 'quellen/pdfs',
  eingang: 'quellen/eingang',
  bib: 'quellen/literatur.bib',
  kandidaten: '.arbeit/kandidaten.json',
  zustand: '.arbeit/zustand.json',
  einstellungen: '.arbeit/einstellungen.md',
  plan: '.arbeit/plan.md',
  build: '.lokal/build',
  kit: '.claude/kit',
  docs: '.claude/kit/docs',
  pdf: 'Arbeit.pdf',
};
export const ort = (root, name, ...weiter) => path.join(root, ...ORTE[name].split('/'), ...weiter);

// mtime als ISO oder null
export function mtimeIso(voll) {
  try { return fs.statSync(voll).mtime.toISOString(); } catch { return null; }
}
