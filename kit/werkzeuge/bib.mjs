#!/usr/bin/env node
// Literaturdatenbank quellen/literatur.bib pflegen, ohne Abhängigkeiten.
//
//   node kit/werkzeuge/bib.mjs add <doi> [--key <bibkey>]   Eintrag per Crossref anlegen, gibt bibkey aus
//   node kit/werkzeuge/bib.mjs add-json <datei.json>          Eintrag aus JSON {typ,key,felder:{...}}
//   node kit/werkzeuge/bib.mjs import <datei.bib> [--json]    Zotero/Better-BibTeX-Export einlesen, Dubletten per DOI überspringen
//   node kit/werkzeuge/bib.mjs check                          alle DOIs gegen Crossref prüfen
//   node kit/werkzeuge/bib.mjs list [--json]                  Einträge auflisten
//   node kit/werkzeuge/bib.mjs keys                           nur bibkeys
//
// Dubletten erkennt das Werkzeug nur an der DOI. Ist nur der bibkey schon vergeben, bekommt der
// neue Eintrag ein Suffix (smith2020deep, smith2020deepa, smith2020deepb ...).
// Exit-Codes: 0 ok, 1 Fehler, 2 DOI nicht gefunden / Prüfung mit Befunden.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBib as libParseBib, schreibeText } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIB = path.join(ROOT, 'quellen', 'literatur.bib');

function mailto() {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'arbeit', 'projekt.json'), 'utf8'));
    return p?.autor?.email || '';
  } catch { return ''; }
}

const UA = () => `ScientificWritingKit/2 (https://github.com/koljaschoepe/scientific-writing${mailto() ? '; mailto:' + mailto() : ''})`;

// ---------- Parser ----------

// Gemeinsamer Parser aus lib.mjs (überspringt auskommentierte % @article-Zeilen), Feldwerte roh.
export function parseBib(text) {
  return libParseBib(text, { roh: true });
}

export const normDoi = (d) => String(d || '').trim().toLowerCase()
  .replace(/^https?:\/\/(dx\.)?doi\.org\//, '').replace(/^doi:\s*/, '').replace(/[{}]/g, '');

// HTML-Entities aus Crossref (&amp; &lt; &gt; &quot; &#39; &#x2013; ...) in Zeichen verwandeln.
export function entitiesDekodieren(t) {
  const benannt = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—' };
  return String(t ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (x, n) => {
    if (n[0] === '#') {
      const c = n[1] === 'x' || n[1] === 'X' ? parseInt(n.slice(2), 16) : parseInt(n.slice(1), 10);
      try { return Number.isFinite(c) && c > 0 ? String.fromCodePoint(c) : x; } catch { return x; }
    }
    return benannt[n.toLowerCase()] ?? x;
  });
}

const ohneTags = (t) => entitiesDekodieren(String(t ?? '').replace(/<[^>]+>/g, '')).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export function ladeBib() {
  if (!fs.existsSync(BIB)) return [];
  return parseBib(fs.readFileSync(BIB, 'utf8'));
}

// ---------- Schreiben ----------

function esc(v) { return String(v).replace(/([&%#_])/g, (x) => (x === '&' ? '\\&' : '\\' + x)); }

export function formatEintrag({ typ, key, felder }) {
  const zeilen = Object.entries(felder)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `  ${k.padEnd(9)} = {${v}}`);
  return `@${typ}{${key},\n${zeilen.join(',\n')}\n}\n`;
}

function freierKey(basis, vergeben) {
  if (!vergeben.has(basis)) return basis;
  for (let n = 0; n < 26 * 27; n++) {
    const suffix = n < 26 ? String.fromCharCode(97 + n) : String.fromCharCode(96 + Math.floor(n / 26)) + String.fromCharCode(97 + (n % 26));
    if (!vergeben.has(basis + suffix)) return basis + suffix;
  }
  return `${basis}${Date.now()}`;
}

function schreibeBib(neuerText) {
  if (fs.existsSync(BIB)) { try { fs.copyFileSync(BIB, BIB + '.bak'); } catch { /* nur Komfort */ } }
  schreibeText(BIB, neuerText);
}

function anhaengen(alt, bloecke) {
  const basis = alt === '' || alt.endsWith('\n') ? alt : alt + '\n';
  return basis + bloecke.map((b) => '\n' + b.replace(/\s*$/, '\n')).join('');
}

export function fuegeHinzu(eintrag) {
  const vorhanden = ladeBib();
  const doi = normDoi(eintrag.felder.doi);
  const dublette = doi ? vorhanden.find((e) => normDoi(e.felder.doi) === doi) : null;
  if (dublette) return { key: dublette.key, neu: false, dublette: true };
  const key = freierKey(eintrag.key, new Set(vorhanden.map((e) => e.key)));
  const alt = fs.existsSync(BIB) ? fs.readFileSync(BIB, 'utf8') : '';
  schreibeBib(anhaengen(alt, [formatEintrag({ ...eintrag, key })]));
  return { key, neu: true, umbenannt: key !== eintrag.key ? eintrag.key : undefined };
}

// Zotero- bzw. Better-BibTeX-Export übernehmen. Einträge werden wörtlich kopiert,
// nur der bibkey wird bei Kollision mit einem Suffix versehen.
export function importiere(text) {
  const vorhanden = ladeBib();
  const dois = new Map(vorhanden.filter((e) => normDoi(e.felder.doi)).map((e) => [normDoi(e.felder.doi), e.key]));
  const keys = new Set(vorhanden.map((e) => e.key));
  const titelVon = new Map(vorhanden.map((e) => [e.key, ohneTags(e.felder.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')]));
  const bericht = { importiert: [], dubletten: [], umbenannt: [] };
  const bloecke = [];
  for (const e of parseBib(text)) {
    const doi = normDoi(e.felder.doi);
    if (doi && dois.has(doi)) { bericht.dubletten.push({ key: e.key, doi, vorhanden: dois.get(doi) }); continue; }
    const titel = ohneTags(e.felder.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    // Ohne DOI: gleicher Key und gleicher Titel ist derselbe Eintrag (erneuter Export).
    if (!doi && keys.has(e.key) && titel && titelVon.get(e.key) === titel) { bericht.dubletten.push({ key: e.key, doi: null, vorhanden: e.key }); continue; }
    let roh = text.slice(e.start, e.ende).replace(/\r\n?/g, '\n');
    const key = freierKey(e.key, keys);
    if (key !== e.key) {
      roh = roh.replace(/^(@\w+\s*[{(]\s*)[^,\s]+/, `$1${key}`);
      bericht.umbenannt.push({ von: e.key, nach: key });
    }
    keys.add(key); titelVon.set(key, titel);
    if (doi) dois.set(doi, key);
    bloecke.push(roh);
    bericht.importiert.push(key);
  }
  if (bloecke.length) {
    const alt = fs.existsSync(BIB) ? fs.readFileSync(BIB, 'utf8') : '';
    schreibeBib(anhaengen(alt, bloecke));
  }
  return bericht;
}

// ---------- Crossref ----------

const TYPEN = {
  'journal-article': 'article', 'proceedings-article': 'inproceedings', 'book-chapter': 'incollection',
  book: 'book', 'edited-book': 'book', monograph: 'book', 'posted-content': 'online', dissertation: 'thesis',
  report: 'report', dataset: 'dataset',
};

export function bibkeyVorschlag(nachname, jahr, titel) {
  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').toLowerCase().replace(/[^a-z0-9]/g, '');
  const stopp = new Set(['a', 'an', 'the', 'of', 'on', 'in', 'for', 'and', 'der', 'die', 'das', 'ein', 'eine', 'zur', 'zum', 'von', 'und', 'mit']);
  const wort = (titel || '').split(/\s+/).map(norm).find((w) => w.length > 2 && !stopp.has(w)) || 'quelle';
  return `${norm(nachname) || 'anonym'}${jahr || 'oj'}${wort}`;
}

export async function crossref(doi) {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, ''))}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA() } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Crossref antwortet mit ${res.status}`);
  return (await res.json()).message;
}

export function ausCrossref(w, key) {
  const autoren = (w.author || []).map((a) => (a.family ? `${ohneTags(a.family)}, ${ohneTags(a.given || '')}`.trim().replace(/,$/, '') : ohneTags(a.name || ''))).filter(Boolean);
  const jahr = (w.issued?.['date-parts']?.[0]?.[0]) || (w.published?.['date-parts']?.[0]?.[0]) || '';
  const titel = ohneTags((w.title || [''])[0] || '');
  const typ = TYPEN[w.type] || 'misc';
  const container = ohneTags((w['container-title'] || [''])[0] || '');
  const felder = {
    author: autoren.map(esc).join(' and '),
    title: esc(titel),
    year: jahr,
    doi: w.DOI,
  };
  if (typ === 'article') Object.assign(felder, { journal: esc(container), volume: w.volume, number: w.issue, pages: w.page });
  else if (typ === 'inproceedings' || typ === 'incollection') Object.assign(felder, { booktitle: esc(container), pages: w.page, publisher: esc(ohneTags(w.publisher || '')) });
  else if (typ === 'book') Object.assign(felder, { publisher: esc(ohneTags(w.publisher || '')), isbn: (w.ISBN || [])[0] });
  else Object.assign(felder, { url: w.URL, publisher: esc(ohneTags(w.publisher || '')) });
  const nachname = ohneTags((w.author?.[0]?.family) || (w.author?.[0]?.name) || '');
  return { typ, key: key || bibkeyVorschlag(nachname, jahr, titel), felder };
}

// ---------- CLI ----------

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const opt = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : undefined; };
  if (cmd === 'add') {
    const doi = rest[0];
    if (!doi) throw new Error('DOI fehlt');
    const w = await crossref(doi);
    if (!w) { console.error(`DOI ${doi} bei Crossref nicht gefunden. Nicht eintragen, Quelle prüfen.`); process.exit(2); }
    const r = fuegeHinzu(ausCrossref(w, opt('--key')));
    console.log(JSON.stringify({ ...r, titel: (w.title || [''])[0] }));
  } else if (cmd === 'add-json') {
    const e = JSON.parse(fs.readFileSync(rest[0], 'utf8').replace(/^\uFEFF/, ''));
    console.log(JSON.stringify(fuegeHinzu(e)));
  } else if (cmd === 'import') {
    if (!rest[0] || !fs.existsSync(rest[0])) throw new Error('Aufruf: import <datei.bib> (Export aus Zotero oder Better BibTeX)');
    const r = importiere(fs.readFileSync(rest[0], 'utf8'));
    if (rest.includes('--json')) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`${r.importiert.length} Einträge übernommen, ${r.dubletten.length} Dubletten übersprungen (gleiche DOI).`);
      for (const u of r.umbenannt) console.log(`  umbenannt: ${u.von} -> ${u.nach} (Schlüssel war schon vergeben)`);
      for (const d of r.dubletten) console.log(`  übersprungen: ${d.key}${d.doi ? ` (DOI ${d.doi} steht schon als ${d.vorhanden} drin)` : ' (steht schon drin)'}`);
    }
  } else if (cmd === 'check') {
    const befunde = [];
    for (const e of ladeBib()) {
      if (!e.felder.doi) { befunde.push({ key: e.key, befund: 'keine DOI, manuell prüfen' }); continue; }
      try {
        const w = await crossref(normDoi(e.felder.doi));
        if (!w) befunde.push({ key: e.key, befund: 'DOI existiert nicht' });
        else {
          const t1 = (w.title?.[0] || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
          const t2 = ohneTags(e.felder.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
          if (t1 && t2 && !t1.startsWith(t2.slice(0, 20)) && !t2.startsWith(t1.slice(0, 20))) befunde.push({ key: e.key, befund: `Titel weicht ab: Crossref „${w.title?.[0]}“` });
        }
      } catch (err) { befunde.push({ key: e.key, befund: 'Prüfung fehlgeschlagen: ' + err.message }); }
      await new Promise((r) => setTimeout(r, 150));
    }
    console.log(JSON.stringify({ geprueft: ladeBib().length, befunde }, null, 2));
    process.exit(befunde.length ? 2 : 0);
  } else if (cmd === 'list') {
    const alle = ladeBib();
    if (rest.includes('--json')) console.log(JSON.stringify(alle, null, 2));
    else for (const e of alle) console.log(`${e.key.padEnd(28)} ${e.felder.year || '    '}  ${(e.felder.title || '').replace(/[{}]/g, '').slice(0, 80)}`);
  } else if (cmd === 'keys') {
    console.log(ladeBib().map((e) => e.key).join('\n'));
  } else {
    console.log('Befehle: add <doi> [--key k] | add-json <datei> | import <datei.bib> [--json] | check | list [--json] | keys');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error('Fehler: ' + e.message); process.exit(1); });
}
