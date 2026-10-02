// Wo wird welche Quelle zitiert, und passt das zu literatur.bib, Notizen und PDFs? Liest nur.
// Genutzt von stand.mjs (quellen.abgleich, quellen.liste[].zitiert) und dashboard/server/quellen.mjs.
//
// Exporte:
//   fundstellen(text)               Map(key → [{ zeile, seite }]) für [@a, S. 4; @b] und erzählendes @key
//   zitierStellen(root, nrFuer?)    Map(key → [{ datei, zeile, kapitel, seite }]) über alle kapitel/**/*.md (ohne .versionen)
//   normDoi(doi)                    "https://doi.org/10.1/X" -> "10.1/x", sonst ''
//   bibDateien(wert)                Pfade aus dem file-Feld (Zotero/Better BibTeX, JabRef, Mendeley)
//   bibPdf(root, eintrag)           { rel, abs } des ersten vorhandenen PDFs aus dem file-Feld oder null
//   QUERVERWEIS                     Präfixe, die Querverweise sind und keine Zitate (fig:, tbl:, eq:, sec:, lst:)

import fs from 'node:fs';
import path from 'node:path';

export const QUERVERWEIS = /^(fig|tbl|eq|sec|lst):/;

function alleKapitelDateien(root) {
  const erg = [];
  const lauf = (ordner) => {
    let e = [];
    try { e = fs.readdirSync(ordner, { withFileTypes: true }); } catch { return; }
    for (const x of e) {
      if (x.name.startsWith('.')) continue;
      const voll = path.join(ordner, x.name);
      if (x.isDirectory()) lauf(voll);
      else if (x.isFile() && x.name.toLowerCase().endsWith('.md')) erg.push(voll);
    }
  };
  lauf(path.join(root, 'kapitel'));
  return erg;
}

export function fundstellen(text) {
  const erg = new Map();
  const merke = (key, eintrag) => {
    if (!key || QUERVERWEIS.test(key)) return;
    if (!erg.has(key)) erg.set(key, []);
    erg.get(key).push(eintrag);
  };
  const zeilen = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  let fm = zeilen[0] === '---'; let zaun = null; let kommentar = false;
  zeilen.forEach((z, i) => {
    if (fm) { if (i > 0 && /^(---|\.\.\.)\s*$/.test(z)) fm = false; return; }
    const t = z.trim();
    if (zaun) { if (t.startsWith(zaun)) zaun = null; return; }
    const f = /^(```|~~~)/.exec(t);
    if (f) { zaun = f[1]; return; }
    let zeile = z;
    if (kommentar) { const e = zeile.indexOf('-->'); if (e < 0) return; zeile = zeile.slice(e + 3); kommentar = false; }
    zeile = zeile.replace(/<!--[\s\S]*?-->/g, '');
    if (zeile.includes('<!--')) { zeile = zeile.slice(0, zeile.indexOf('<!--')); kommentar = true; }
    zeile = zeile.replace(/`[^`]*`/g, '');
    // [@a, S. 4; @b] Gruppen
    for (const g of zeile.matchAll(/\[([^\]\n]*@[^\]\n]*)\]/g)) {
      for (const teil of g[1].split(';')) {
        const m = teil.match(/-?@([A-Za-z0-9_][\w:.#$%&+?<>~/-]*)(.*)$/);
        if (!m) continue;
        merke(m[1].replace(/[.:]+$/, ''), { zeile: i + 1, seite: (m[2] || '').replace(/^\s*,\s*/, '').trim() });
      }
    }
    // Erzählende Zitate @key außerhalb von Klammern (nicht in E-Mail-Adressen)
    const ohneGruppen = zeile.replace(/\[[^\]\n]*@[^\]\n]*\]/g, ' ');
    for (const m of ohneGruppen.matchAll(/(^|[\s(])@([A-Za-z0-9_][\w:.#$%&+?<>~/-]*)/g)) {
      merke(m[2].replace(/[.:,;]+$/, ''), { zeile: i + 1, seite: '' });
    }
  });
  return erg;
}

const fundCache = new Map(); // voll → { sig, karte }
export function zitierStellen(root, nrFuer = () => null) {
  const erg = new Map();
  const gesehen = new Set();
  for (const voll of alleKapitelDateien(root)) {
    gesehen.add(voll);
    let st; try { st = fs.statSync(voll); } catch { continue; }
    const sig = `${st.mtimeMs}:${st.size}`;
    let c = fundCache.get(voll);
    if (!c || c.sig !== sig) {
      let t = ''; try { t = fs.readFileSync(voll, 'utf8'); } catch {}
      c = { sig, karte: fundstellen(t) };
      fundCache.set(voll, c);
    }
    const rel = path.relative(root, voll).split(path.sep).join('/');
    const nr = nrFuer(rel);
    for (const [key, stellen] of c.karte) {
      if (!erg.has(key)) erg.set(key, []);
      for (const s of stellen) erg.get(key).push({ datei: rel, zeile: s.zeile, kapitel: nr, seite: s.seite });
    }
  }
  for (const k of fundCache.keys()) if (!gesehen.has(k) && k.startsWith(path.join(root, 'kapitel'))) fundCache.delete(k);
  for (const l of erg.values()) l.sort((a, b) => a.datei.localeCompare(b.datei) || a.zeile - b.zeile);
  return erg;
}

export function normDoi(doi) {
  const t = String(doi || '').trim().toLowerCase().replace(/^(https?:\/\/)?(dx\.)?doi\.org\//, '').replace(/^doi:\s*/, '');
  return /^10\.\S+\/\S+/.test(t) ? t : '';
}

// file-Feld: "Beschreibung:Pfad:Typ" je Datei, mehrere mit ";" getrennt. Doppelpunkte und Backslashes im Pfad sind
// bei JabRef/Mendeley mit "\" maskiert ("C\:\\Users\\..."), Zotero/Better BibTeX schreibt sie roh.
export function bibDateien(wert) {
  const t = String(wert || '').trim();
  if (!t) return [];
  const teile = [];
  let akt = '';
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '\\' && i + 1 < t.length && /[:;\\]/.test(t[i + 1])) { akt += t[i + 1]; i++; continue; }
    if (c === ';') { teile.push(akt); akt = ''; continue; }
    akt += c;
  }
  teile.push(akt);
  const pfade = [];
  for (const roh of teile.map((x) => x.trim()).filter(Boolean)) {
    // Felder an ":" trennen, ein Windows-Laufwerk (C:/… bzw. C:\…) aber nicht
    const felder = [];
    let feld = '';
    for (let i = 0; i < roh.length; i++) {
      const c = roh[i];
      if (c === ':' && !(feld.length === 1 && /[a-zA-Z]/.test(feld) && /[\\/]/.test(roh[i + 1] || ''))) { felder.push(feld); feld = ''; continue; }
      feld += c;
    }
    felder.push(feld);
    let pfad;
    if (felder.length >= 3) pfad = felder.slice(1, -1).join(':');
    else if (felder.length === 2) pfad = /\.pdf$/i.test(felder[0]) ? felder[0] : felder[1];
    else pfad = felder[0];
    pfad = pfad.trim();
    if (pfad) pfade.push(pfad);
  }
  return pfade;
}

// Erstes vorhandenes PDF aus dem file-Feld. Relative Pfade gelten relativ zu quellen/ (Ort der .bib), dann zum Projekt.
export function bibPdf(root, eintrag) {
  const wert = eintrag?.felder?.file;
  if (!wert) return null;
  for (const pfad of bibDateien(wert)) {
    if (!/\.pdf$/i.test(pfad)) continue;
    const kandidaten = path.isAbsolute(pfad) || /^[a-zA-Z]:[\\/]/.test(pfad) ? [pfad] : [path.join(root, 'quellen', pfad), path.join(root, pfad)];
    for (const abs of kandidaten) {
      try {
        if (!fs.statSync(abs).isFile()) continue;
        const r = path.relative(root, abs);
        const innen = r && !r.startsWith('..') && !path.isAbsolute(r);
        return { rel: innen ? r.split(path.sep).join('/') : null, abs: path.resolve(abs) };
      } catch { /* nächster */ }
    }
  }
  return null;
}
