// Texte lesen für die Leseansicht (/api/text, nur lesen), Zitat-Anzeige aus literatur.bib, Formeln für KaTeX markiert.

import fs from 'node:fs';
import path from 'node:path';
import * as lib from '../../werkzeuge/lib.mjs';
import { p, leseText, parseBib, zaehleWoerter } from '../../werkzeuge/lib.mjs';
import {
  absaetze, absatzHash, parseFrontmatter, sichererRel, liegtIn, ungueltig, nichtGefunden,
  leseJsonLocker, ort, absPfad, mtimeIso,
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
  const { wer, jahr } = autorTeile(felder, sprache);
  return `${wer} ${jahr}`;
}

function autorTeile(felder, sprache = 'de') {
  const autoren = String(felder.author || felder.editor || '').split(/\s+and\s+/i).map(nachname).filter(Boolean);
  const jahr = felder.year || String(felder.date || '').slice(0, 4) || 'o. J.';
  const und = sprache === 'en' ? 'and' : 'und';
  let wer;
  if (!autoren.length) wer = String(felder.title || '').split(/\s+/).slice(0, 3).join(' ') || '?';
  else if (autoren.length === 1) wer = autoren[0];
  else if (autoren.length === 2) wer = `${autoren[0]} ${und} ${autoren[1]}`;
  else wer = `${autoren[0]} et al.`;
  return { wer, jahr };
}

export function bibKarte(root) {
  const datei = ort(root, 'bib');
  let st = null;
  try { st = fs.statSync(datei); } catch {}
  if (!st) return new Map();
  if (st.mtimeMs === bibCache.mtime && st.size === bibCache.groesse) return bibCache.karte;
  let sprache = 'de';
  try { sprache = lib.leseEinstellungen(root)?.arbeit?.sprache || 'de'; } catch {}
  const karte = new Map();
  for (const e of parseBib(leseText(datei, ''))) {
    const { wer, jahr } = autorTeile(e.felder, sprache);
    karte.set(e.key, { anzeige: `${wer} ${jahr}`, wer, jahr, titel: e.felder.title || '' });
  }
  bibCache = { mtime: st.mtimeMs, groesse: st.size, karte };
  return karte;
}

// ---------- Markdown → sicheres HTML (bewusst klein) ----------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Formeln vorab herausnehmen, damit Markdown-Regeln (*, _) sie nicht zerlegen: $$…$$, $…$, \ce{…}
function formelnSchuetzen(roh) {
  const formeln = [];
  const merke = (tex, block) => { formeln.push({ tex, block }); return `\u0000F${formeln.length - 1}\u0000`; };
  let t = String(roh);
  t = t.replace(/\$\$([\s\S]+?)\$\$(\s*\{#eq:[^}]*\})?/g, (_g, tex) => merke(tex.trim(), true));
  t = t.replace(/(^|[^\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g, (_g, vor, tex) => vor + merke(tex, false));
  // \ce{…} mit verschachtelten Klammern
  let aus = ''; let i = 0;
  while (i < t.length) {
    const j = t.indexOf('\\ce{', i);
    if (j < 0) { aus += t.slice(i); break; }
    let tiefe = 0; let k = j + 3;
    for (; k < t.length; k++) { if (t[k] === '{') tiefe++; else if (t[k] === '}') { tiefe--; if (tiefe === 0) break; } }
    if (k >= t.length) { aus += t.slice(i); break; }
    aus += t.slice(i, j) + merke(t.slice(j, k + 1), false);
    i = k + 1;
  }
  return { text: aus, formeln };
}
const formelHtml = (f) => (f.block
  ? `<div class="formel" data-tex="${esc(f.tex)}">${esc(f.tex)}</div>`
  : `<span class="formel-inline" data-tex="${esc(f.tex)}">${esc(f.tex)}</span>`);
const formelnEinsetzen = (html, formeln) => html.replace(/\u0000F(\d+)\u0000/g, (_g, n) => (formeln[Number(n)].bild ? bildHtml(formeln[Number(n)]) : formelHtml(formeln[Number(n)])));

// Abbildungen ![alt](pfad){#fig:x}: Pfad relativ zur Datei, nur aus Ordnern, die /datei/ ausliefert
const BILD_ORDNER = ['abbildungen/', 'daten/', 'quellen/', 'kapitel/'];
function bildPfad(basis, ziel) {
  const z = String(ziel || '').trim().replace(/^<|>$/g, '').split(/\s+/)[0];
  if (!z || /^[a-z]+:/i.test(z) || z.startsWith('/')) return null;
  // Konvention (rules/latex.md): Pfad relativ zum Projektroot. Fallback: relativ zur Datei.
  for (const r of [path.posix.normalize(z), path.posix.normalize(path.posix.join(basis || '.', z))]) {
    const sicher = sichererRel(r);
    if (sicher && BILD_ORDNER.some((o) => sicher.startsWith(o))) return sicher;
  }
  return null;
}
function bilderSchuetzen(text, basis, formeln) {
  return text.replace(/!\[([^\]]*)\]\(([^)\n]*)\)(\{[^}\n]*\})?/g, (_g, alt, ziel) => {
    formeln.push({ bild: true, alt, rel: bildPfad(basis, ziel) });
    return `\u0000F${formeln.length - 1}\u0000`;
  });
}
const bildHtml = (b) => (b.rel
  ? `<figure class="abbildung"><img src="/datei/${esc(encodeURI(b.rel))}" data-rel="${esc(b.rel)}" alt="${esc(b.alt)}" loading="lazy"><figcaption>${esc(b.alt)}</figcaption></figure>`
  : `<figure class="abbildung fehlt"><figcaption>${esc(b.alt || 'Abbildung')}</figcaption></figure>`);

function inlineHtml(roh, karte, fehlend, basis = '') {
  const { text: t0, formeln } = formelnSchuetzen(roh);
  const text = bilderSchuetzen(t0, basis, formeln);
  let inhalt = esc(text)
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
      else { fehlend.add(key); spans.push(`<span class="zit fehlt" data-key="${esc(key)}" title="Nicht im Literaturverzeichnis">(${esc(key)}${zusatz ? ', ' + zusatz : ''})</span>`); }
    }
    return spans.join(' ');
  });
  // Querverweise \cref{fig:x} und @fig:x: im PDF mit Nummer, hier nur die Art
  const ART = { fig: 'Abbildung', tbl: 'Tabelle', eq: 'Gleichung', sec: 'Abschnitt' };
  inhalt = inhalt.replace(/\\(?:[cC]ref|ref|autoref|eqref)\{(fig|tbl|eq|sec):[^}]*\}|(^|[^\w\\{])@(fig|tbl|eq|sec):[\w:.-]*[\w]/g,
    (_g, a1, vor, a2) => `${vor || ''}<span class="verweis">${ART[a1 || a2]}</span>`);
  // Erzählende Zitate: @key im Fließtext → „Autor (Jahr)“ (nicht in E-Mail-Adressen, davor kein Wortzeichen)
  inhalt = inhalt.replace(/(^|[\s(]|&quot;)@([A-Za-z0-9_][\w:.-]*[\w])/g, (_g, vor, key) => {
    const e = karte.get(key);
    if (e) return `${vor}<span class="zit erzaehlend" data-key="${esc(key)}" title="${esc(e.titel)}">${esc(e.wer)} (${esc(e.jahr)})</span>`;
    fehlend.add(key);
    return `${vor}<span class="zit fehlt" data-key="${esc(key)}" title="Nicht im Literaturverzeichnis">${esc(key)}</span>`;
  });
  return formelnEinsetzen(inhalt.replace(/\n/g, '<br>'), formeln);
}

// Pipe-Tabelle: Kopfzeile, Trennzeile |---|, Zeilen. Rest des Absatzes (z. B. Beschriftung) normal.
const TRENNZEILE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
function tabelleHtml(zeilen, karte, fehlend, basis) {
  const zellen = (z) => z.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => inlineHtml(c.trim(), karte, fehlend, basis));
  let ende = 2;
  while (ende < zeilen.length && zeilen[ende].includes('|')) ende++;
  const kopf = zellen(zeilen[0]).map((c) => `<th>${c}</th>`).join('');
  const rumpf = zeilen.slice(2, ende).map((z) => `<tr>${zellen(z).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  const rest = zeilen.slice(ende).join('\n');
  const titel = rest.match(/^\s*(?:Table|Tabelle)?\s*:\s*(.*?)\s*(\{#tbl:[^}]*\})?\s*$/);
  const nach = rest ? (titel ? `<p class="tabellen-titel">${inlineHtml(titel[1], karte, fehlend, basis)}</p>` : inlineHtml(rest, karte, fehlend, basis)) : '';
  return `<table class="tabelle"><thead><tr>${kopf}</tr></thead><tbody>${rumpf}</tbody></table>${nach}`;
}

export function absatzHtml(text, karte, fehlend = new Set(), basis = '') {
  const roh = String(text || '');
  const zaun = roh.match(/^(```|~~~)[^\n]*\n([\s\S]*?)\n?\1\s*$/);
  if (zaun) return `<pre><code>${esc(zaun[2])}</code></pre>`;
  const block = roh.trim().match(/^\$\$([\s\S]*)\$\$(\s*\{#eq:[^}]*\})?$/);
  if (block && !block[1].includes('$$')) return formelHtml({ tex: block[1].trim(), block: true });
  // Tabellenbeschriftung als eigener Absatz (Pandoc erlaubt eine Leerzeile zwischen Tabelle und „: Titel“)
  const tbl = roh.trim().match(/^(?:Table|Tabelle)?:\s+([^\n]*?)\s*(\{#tbl:[^}]*\})?$/);
  if (tbl) return `<p class="tabellen-titel">${inlineHtml(tbl[1], karte, fehlend, basis)}</p>`;
  const zeilen = roh.split('\n');
  if (zeilen.length >= 2 && zeilen[0].includes('|') && TRENNZEILE.test(zeilen[1])) return tabelleHtml(zeilen, karte, fehlend, basis);
  const ue = zeilen[0].match(/^(#{1,6})\s+(.*)$/);
  if (!ue) return inlineHtml(zeilen.join('\n'), karte, fehlend, basis);
  const n = ue[1].length;
  const rest = zeilen.slice(1).join('\n');
  return `<h${n}>${inlineHtml(ue[2], karte, fehlend, basis)}</h${n}>${rest ? inlineHtml(rest, karte, fehlend, basis) : ''}`;
}

// ---------- Dateizugriff ----------

const LESBAR = ['kapitel/', '.arbeit/', 'quellen/notizen/'];

export function pruefeTextDatei(root, datei) {
  const r = sichererRel(datei);
  const ordner = r ? LESBAR.find((o) => r.startsWith(o)) : null;
  if (!r || !ordner || !r.toLowerCase().endsWith('.md')) throw ungueltig('Nur Markdown-Dateien unter kapitel/, .arbeit/ und quellen/notizen/ lassen sich hier öffnen.');
  const voll = p(root, ...r.split('/'));
  if (!fs.existsSync(voll)) throw nichtGefunden(`Datei ${r} gibt es nicht.`);
  if (!liegtIn(p(root, ...ordner.slice(0, -1).split('/')), voll) || !fs.statSync(voll).isFile()) throw ungueltig('Diese Datei liegt nicht im Projekt.');
  return { rel: r, voll };
}

export function textVersion(voll) {
  const st = fs.statSync(voll);
  return `${st.mtimeMs}:${st.size}`;
}

function titelAus(root, rel, fm, liste) {
  if (fm.titel || fm.title) return String(fm.titel || fm.title);
  const z = leseJsonLocker(ort(root, 'zustand'), {}) || {};
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
  let nr = 0;
  const antwort = {
    datei: rel,
    pfad_abs: absPfad(root, rel),
    geaendert: mtimeIso(voll),
    titel: titelAus(root, rel, fm, liste),
    version,
    woerter: zaehleWoerter(md),
    absaetze: liste.map((text, i) => {
      // B22: reine Überschriften zählen nicht als Absatz
      const ueberschrift = /^#{1,6}\s/.test(text) && !text.includes('\n');
      return { i, nr: ueberschrift ? null : ++nr, ueberschrift, text, html: absatzHtml(text, karte, fehlend, path.posix.dirname(rel)),
        hash: absatzHash(text), zeile: zeileVon(i, text), geaendert: markiert.has(i) };
    }),
    frontmatter: fm,
  };
  antwort.zitate_fehlen = [...fehlend];
  return antwort;
}

// Findet die Absatzbereiche im Rohtext (nach Frontmatter), für die Zeilennummer je Absatz.
// Gleiche Regeln wie absaetze() in lib.mjs: Trennung an Leerzeilen, Code- und Formelblöcke bleiben ganz.
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
      if (z.startsWith(zaun) || (zaun === '$$' && /\$\$(\s*\{#[^}]*\})?$/.test(z))) zaun = null;
      continue;
    }
    if (!z) { abschliessen(); continue; }
    const f = /^(```|~~~)/.exec(z);
    if (f) zaun = f[1];
    else if (z.startsWith('$$') && !(z.length > 2 && /\$\$(\s*\{#[^}]*\})?$/.test(z.slice(2)))) zaun = '$$';
    const ohne = zeile.replace(/[ \t]+$/, '');
    akt.push({ von, bis: von + ohne.length, text: ohne });
  }
  abschliessen();
  return erg;
}
