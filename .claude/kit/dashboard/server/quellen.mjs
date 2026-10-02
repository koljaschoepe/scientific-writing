// Quellen-Detail für das Dashboard: Kurznotiz und Zitate aus quellen/notizen/<bibkey>.md,
// Fundstellen „wo zitiert“ aus [@key …] in kapitel/*.md, absolute Pfade für vscode://.

import fs from 'node:fs';
import path from 'node:path';
import { ORTE, ort, absPfad, mtimeIso } from './basis.mjs';
import { zitierStellen } from '../../werkzeuge/zitierstellen.mjs';

export { zitierStellen };

const MAX_TEXT = 1200;
const kurz = (s) => (s.length > MAX_TEXT ? s.slice(0, MAX_TEXT - 1).trimEnd() + '…' : s);
const ohneKlammern = (s) => String(s || '').trim().replace(/^\[(.*)\]$/, '$1').trim();
const ohneAnf = (s) => {
  let t = String(s || '').trim();
  if (/^".*"$/s.test(t) || /^„.*“$/s.test(t) || /^“.*”$/s.test(t)) t = t.slice(1, -1);
  return t.replace(/\\"/g, '"').trim();
};
const liste = (s) => ohneKlammern(s).split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);

// Erste n Sätze (grob: Satzende . ! ? gefolgt von Leerraum und Großbuchstabe/Ziffer)
function ersteSaetze(text, n = 3) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const teile = t.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9„"(])/);
  return kurz(teile.slice(0, n).join(' '));
}

// Notizdatei lesen: { kern, zeile_kern, zitate:[{id, seite, seite_pdf, typ, kapitel, original, paraphrase, zeile}] }
export function leseNotiz(text) {
  const zeilen = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  let abschnitt = null; let kernZeilen = []; let zeileKern = null;
  const zitate = []; let akt = null;
  let kommentar = false;
  zeilen.forEach((roh, i) => {
    let z = roh;
    if (kommentar) { const e = z.indexOf('-->'); if (e < 0) return; z = z.slice(e + 3); kommentar = false; }
    z = z.replace(/<!--[\s\S]*?-->/g, '');
    if (z.includes('<!--')) { z = z.slice(0, z.indexOf('<!--')); kommentar = true; }
    const h = z.match(/^##\s+(.+?)\s*$/);
    if (h) {
      const name = h[1].trim();
      const zm = name.match(/^(Z\d+)\b/i);
      if (zm) { akt = { id: zm[1].toUpperCase(), seite: '', seite_pdf: null, typ: '', kapitel: [], original: '', paraphrase: '', zeile: i + 1 }; zitate.push(akt); abschnitt = 'zitat'; }
      else if (/^kernaussage/i.test(name)) { abschnitt = 'kern'; akt = null; zeileKern = i + 1; }
      else { abschnitt = null; akt = null; }
      return;
    }
    if (/^#\s/.test(z)) { abschnitt = null; akt = null; return; }
    if (abschnitt === 'kern') { if (z.trim() && !/^\s*>/.test(z)) kernZeilen.push(z.trim()); return; }
    if (abschnitt === 'zitat' && akt) {
      const m = z.match(/^\s*[-*]\s+([a-z_]+)\s*:\s*(.*)$/i);
      if (!m) return;
      const k = m[1].toLowerCase(); const w = m[2].trim();
      if (k === 'seite') akt.seite = ohneKlammern(w);
      else if (k === 'seite_pdf') { const n = Number(ohneKlammern(w)); akt.seite_pdf = Number.isInteger(n) && n > 0 ? n : null; }
      else if (k === 'typ') akt.typ = ohneKlammern(w);
      else if (k === 'kapitel') akt.kapitel = liste(w);
      else if (k === 'original') akt.original = kurz(ohneAnf(w));
      else if (k === 'paraphrase') akt.paraphrase = kurz(ohneAnf(w));
    }
  });
  const kern = ersteSaetze(kernZeilen.join(' ').replace(/^\[.*\]$/, ''));
  return { kern, zeile_kern: zeileKern ? zeileKern + 1 : null, zitate };
}

// Cache je Datei über mtime+size
const notizCache = new Map();
export function notizFuer(root, bibkey) {
  if (!bibkey || !/^[\w:.-]+$/.test(bibkey)) return null;
  const voll = ort(root, 'notizen', `${bibkey}.md`);
  let st;
  try { st = fs.statSync(voll); } catch { return null; }
  if (!st.isFile()) return null;
  const sig = `${st.mtimeMs}:${st.size}`;
  const c = notizCache.get(voll);
  if (c && c.sig === sig) return c.wert;
  let wert = null;
  try { wert = leseNotiz(fs.readFileSync(voll, 'utf8')); } catch {}
  notizCache.set(voll, { sig, wert });
  return wert;
}

// ---------- Anreichern ----------

// Ergänzt stand.quellen.liste[] um eigene_notiz, notiz, zitiert, pfade, rel (siehe API.md v3)
export function reichereQuellenAn(root, stand) {
  const q = stand.quellen;
  if (!q || !Array.isArray(q.liste)) return;
  const nrJeDatei = new Map((stand.kapitel || []).filter((k) => k.datei).map((k) => [String(k.datei), String(k.nr)]));
  const stellen = zitierStellen(root, (rel) => nrJeDatei.get(rel) || null);
  for (const quelle of q.liste) {
    const key = typeof quelle.bibkey === 'string' ? quelle.bibkey : '';
    if (typeof quelle.notiz === 'string' || quelle.notiz == null) {
      quelle.eigene_notiz = typeof quelle.notiz === 'string' ? quelle.notiz : (quelle.eigene_notiz || '');
    }
    const notiz = notizFuer(root, key);
    quelle.notiz = notiz;
    if (notiz && !(Number(quelle.zitate) > 0)) quelle.zitate = notiz.zitate.length;
    quelle.zitiert = key ? (stellen.get(key) || []) : [];
    const relPdf = typeof quelle.pdf === 'string' && quelle.pdf && fs.existsSync(path.join(root, ...quelle.pdf.split('/'))) ? quelle.pdf : null;
    const relNotiz = notiz ? `${ORTE.notizen}/${key}.md` : null;
    quelle.rel = { pdf: relPdf, notiz: relNotiz };
    // PDF außerhalb des Projekts (file-Feld der bib, z. B. Zotero-Speicher): nur absolut, /datei/ liefert es nicht aus
    quelle.pfade = { pdf: relPdf ? absPfad(root, relPdf) : (quelle.pdf_abs || null), notiz: relNotiz ? absPfad(root, relNotiz) : null };
    if (relNotiz) quelle.notiz_geaendert = mtimeIso(path.join(root, ...relNotiz.split('/')));
  }
}
