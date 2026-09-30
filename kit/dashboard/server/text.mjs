// Kapiteltexte lesen und absatzweise ändern (/api/text), Zitat-Anzeige aus literatur.bib.

import fs from 'node:fs';
import path from 'node:path';
import { p, leseText, parseBib, zaehleWoerter } from '../../werkzeuge/lib.mjs';
import {
  absaetze, absatzHash, parseFrontmatter, sichererRel, liegtIn, ungueltig, nichtGefunden, konflikt,
  leseJsonLocker, schreibeText, journal,
} from './basis.mjs';

// ---------- Literatur ----------

let bibCache = { mtime: -1, groesse: -1, karte: new Map() };

function nachname(autor) {
  const a = String(autor || '').replace(/[{}]/g, '').trim();
  if (!a) return '';
  if (a.includes(',')) return a.split(',')[0].trim();
  const w = a.split(/\s+/);
  // „van der Berg“ grob erhalten: kleingeschriebene Partikel vor dem letzten Wort mitnehmen
  let i = w.length - 1;
  while (i > 0 && /^(van|von|der|de|den|du|la|le|di|da|zu|ten|ter)$/i.test(w[i - 1])) i--;
  return w.slice(i).join(' ');
}

export function autorJahr(felder, sprache = 'de') {
  const autoren = String(felder.author || felder.editor || '').split(/\s+and\s+/i).map(nachname).filter(Boolean);
  const jahr = felder.year || String(felder.date || '').slice(0, 4) || 'o. J.';
  const und = sprache === 'en' ? 'and' : 'und';
  let wer;
  if (!autoren.length) wer = String(felder.title || '').split(/\s+/).slice(0, 3).join(' ') || '?';
  else if (autoren.length === 1) wer = autoren[0];
  else if (autoren.length === 2) wer = `${autoren[0]} ${und} ${autoren[1]}`;
  else wer = `${autoren[0]} et al.`;
  return `${wer} ${jahr}`;
}

export function bibKarte(root) {
  const datei = p(root, 'quellen', 'literatur.bib');
  let st = null;
  try { st = fs.statSync(datei); } catch {}
  if (!st) return new Map();
  if (st.mtimeMs === bibCache.mtime && st.size === bibCache.groesse) return bibCache.karte;
  const sprache = leseJsonLocker(p(root, 'arbeit', 'projekt.json'), {})?.arbeit?.sprache || 'de';
  const karte = new Map();
  for (const e of parseBib(leseText(datei, ''))) karte.set(e.key, { anzeige: autorJahr(e.felder, sprache), titel: e.felder.title || '' });
  bibCache = { mtime: st.mtimeMs, groesse: st.size, karte };
  return karte;
}

// ---------- Markdown → sicheres HTML (bewusst klein) ----------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function inlineHtml(roh, karte, fehlend) {
  let inhalt = esc(roh)
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>');
  // Zitate: [@a], [@a, S. 4], [@a; @b], [-@a]
  inhalt = inhalt.replace(/\[((?:[^\]\n]*?)@[^\]\n]*)\]/g, (ganz, innen) => {
    const teile = innen.split(';').map((t) => t.trim()).filter(Boolean);
    const spans = [];
    for (const t of teile) {
      const m = t.match(/^(.*?)-?@([\w:.#$%&+?<>~/-]+)(.*)$/);
      if (!m) return ganz;
      const key = m[2].replace(/[.:]+$/, '');
      const zusatz = (m[3] || '').replace(/^\s*,\s*/, '').trim();
      const e = karte.get(key);
      if (e) spans.push(`<span class="zit" data-key="${esc(key)}" title="${esc(e.titel)}">(${esc(e.anzeige)}${zusatz ? ', ' + zusatz : ''})</span>`);
      else { fehlend.add(key); spans.push(`<span class="zit fehlt" data-key="${esc(key)}" title="Nicht in literatur.bib">(${esc(key)}${zusatz ? ', ' + zusatz : ''})</span>`); }
    }
    return spans.join(' ');
  });
  return inhalt.replace(/\n/g, '<br>');
}

export function absatzHtml(text, karte, fehlend = new Set()) {
  const roh = String(text || '');
  const zaun = roh.match(/^(```|~~~)[^\n]*\n([\s\S]*?)\n?\1\s*$/);
  if (zaun) return `<pre><code>${esc(zaun[2])}</code></pre>`;
  if (/^\$\$[\s\S]*\$\$$/.test(roh.trim())) return `<pre class="formel">${esc(roh.trim())}</pre>`;
  const zeilen = roh.split('\n');
  const ue = zeilen[0].match(/^(#{1,6})\s+(.*)$/);
  if (!ue) return inlineHtml(zeilen.join('\n'), karte, fehlend);
  const n = ue[1].length;
  const rest = zeilen.slice(1).join('\n');
  return `<h${n}>${inlineHtml(ue[2], karte, fehlend)}</h${n}>${rest ? inlineHtml(rest, karte, fehlend) : ''}`;
}

// ---------- Dateizugriff ----------

export function pruefeTextDatei(root, datei) {
  const r = sichererRel(datei);
  if (!r || !r.startsWith('arbeit/') || !r.toLowerCase().endsWith('.md')) throw ungueltig('Nur Markdown-Dateien unter arbeit/ lassen sich hier öffnen.');
  const voll = p(root, ...r.split('/'));
  if (!fs.existsSync(voll)) throw nichtGefunden(`Datei ${r} gibt es nicht.`);
  if (!liegtIn(p(root, 'arbeit'), voll) || !fs.statSync(voll).isFile()) throw ungueltig('Diese Datei liegt nicht im Projekt.');
  return { rel: r, voll };
}

export function textVersion(voll) {
  const st = fs.statSync(voll);
  return `${st.mtimeMs}:${st.size}`;
}

function titelAus(root, rel, fm, liste) {
  if (fm.titel || fm.title) return String(fm.titel || fm.title);
  const z = leseJsonLocker(p(root, 'arbeit', 'zustand.json'), {}) || {};
  const k = (z.kapitel || []).find((x) => x.datei === rel);
  if (k?.titel) return `${k.nr} ${k.titel}`;
  const ue = liste.find((a) => /^#{1,6}\s/.test(a));
  return ue ? ue.split('\n')[0].replace(/^#{1,6}\s+/, '') : path.basename(rel, '.md');
}

export function leseTextAntwort(root, datei, geaendertVon) {
  const { rel, voll } = pruefeTextDatei(root, datei);
  const md = fs.readFileSync(voll, 'utf8');
  const version = textVersion(voll);
  const { frontmatter, absaetze: liste } = absaetze(md);
  const fm = parseFrontmatter(frontmatter);
  const karte = bibKarte(root);
  const markiert = new Set(geaendertVon ? geaendertVon(rel) : []);
  const fehlend = new Set();
  const t = md.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const ber = bereiche(t);
  const zeileVon = (i, text) => {
    const b = ber[i] && ber[i].text === text ? ber[i] : ber.find((x) => x.text === text);
    return b ? t.slice(0, b.von).split('\n').length : null;
  };
  const antwort = {
    datei: rel,
    titel: titelAus(root, rel, fm, liste),
    version,
    woerter: zaehleWoerter(md),
    absaetze: liste.map((text, i) => ({ i, text, html: absatzHtml(text, karte, fehlend), hash: absatzHash(text), zeile: zeileVon(i, text), geaendert: markiert.has(i) })),
    frontmatter: fm,
  };
  antwort.zitate_fehlen = [...fehlend];
  return antwort;
}

// Findet die Absatzbereiche im Rohtext (nach Frontmatter), damit ein Absatz ersetzt werden kann,
// ohne Leerzeilen, Frontmatter oder Zeilenenden des Rests anzufassen. Gleiche Regeln wie absaetze()
// in lib.mjs: Trennung an Leerzeilen, Code- und Formelblöcke (```, ~~~, $$) bleiben ganz.
function bereiche(t) {
  const m = t.match(/^---\n[\s\S]*?\n---[ \t]*(\n|$)/);
  let pos = m ? m[0].length : 0;
  const erg = [];
  let akt = []; // { von, bis, text }
  let zaun = null;
  const abschliessen = () => {
    while (akt.length && !akt[akt.length - 1].text.trim()) akt.pop();
    if (akt.length) erg.push({ von: akt[0].von, bis: akt[akt.length - 1].bis, text: akt.map((x) => x.text).join('\n') });
    akt = [];
  };
  const zeilen = t.slice(pos).split('\n');
  for (const zeile of zeilen) {
    const von = pos; const bis = pos + zeile.length;
    pos = bis + 1;
    const z = zeile.trim();
    if (zaun) {
      akt.push({ von, bis, text: zeile });
      if (z.startsWith(zaun) || (zaun === '$$' && z.endsWith('$$'))) zaun = null;
      continue;
    }
    if (!z) { abschliessen(); continue; }
    const f = /^(```|~~~)/.exec(z);
    if (f) zaun = f[1];
    else if (z.startsWith('$$') && !(z.length > 2 && z.endsWith('$$'))) zaun = '$$';
    const ohne = zeile.replace(/[ \t]+$/, '');
    akt.push({ von, bis: von + ohne.length, text: ohne });
  }
  abschliessen();
  return erg;
}

export function ersetzeAbsatz(root, b) {
  const { rel, voll } = pruefeTextDatei(root, b.datei);
  const i = Number(b.i);
  if (!Number.isInteger(i) || i < 0) throw ungueltig('Absatznummer fehlt oder ist ungültig.');
  if (typeof b.hash !== 'string' || !b.hash) throw ungueltig('Hash des Absatzes fehlt.');
  if (typeof b.text !== 'string') throw ungueltig('Text fehlt.');
  if (b.text.length > 100000) throw ungueltig('Der Absatz ist zu lang.');
  const roh = fs.readFileSync(voll, 'utf8');
  const crlf = /\r\n/.test(roh);
  const bom = roh.startsWith('﻿');
  const t = roh.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const { absaetze: liste } = absaetze(roh);
  const version = textVersion(voll);
  if (i >= liste.length || absatzHash(liste[i]) !== b.hash) {
    throw konflikt('Der Absatz wurde inzwischen geändert. Lade den Text neu und versuche es noch einmal.', { version });
  }
  const neu = b.text.replace(/\r\n?/g, '\n').replace(/^(?:[ \t]*\n)+/, '').replace(/\s+$/, '');
  const ber = bereiche(t);
  let ziel = ber[i] && ber[i].text === liste[i] ? ber[i] : null;
  if (!ziel) { const gleich = ber.filter((x) => x.text === liste[i]); if (gleich.length === 1) [ziel] = gleich; }
  let ergebnis;
  if (ziel) {
    if (neu) ergebnis = t.slice(0, ziel.von) + neu + t.slice(ziel.bis);
    else {
      // Absatz löschen: samt folgendem Trenner
      const vor = t.slice(0, ziel.von);
      const nach = t.slice(ziel.bis).replace(/^\s+/, '');
      ergebnis = nach ? vor + nach : vor.replace(/\s*$/, '\n');
    }
  } else {
    // Rückfall: aus den Absätzen neu zusammensetzen
    const m = t.match(/^---\n[\s\S]*?\n---[ \t]*(\n|$)/);
    const kopie = [...liste];
    if (neu) kopie[i] = neu; else kopie.splice(i, 1);
    ergebnis = (m ? m[0].replace(/\n?$/, '\n') + '\n' : '') + kopie.join('\n\n') + '\n';
  }
  if (crlf) ergebnis = ergebnis.replace(/\n/g, '\r\n');
  if (bom) ergebnis = '﻿' + ergebnis;
  schreibeText(voll, ergebnis);
  journal(root, 'text', neu ? `Absatz ${i + 1} in ${rel} im Dashboard korrigiert` : `Absatz ${i + 1} in ${rel} im Dashboard gelöscht`);
  return { rel, i, vorher: { text: liste[i], hash: b.hash } };
}
