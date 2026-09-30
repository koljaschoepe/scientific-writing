#!/usr/bin/env node
// Literaturdatenbank quellen/literatur.bib pflegen, ohne Abhängigkeiten.
//
//   node kit/werkzeuge/bib.mjs add <doi> [--key <bibkey>]   Eintrag per Crossref anlegen, gibt bibkey aus
//   node kit/werkzeuge/bib.mjs add-json <datei.json>          Eintrag aus JSON {typ,key,felder:{...}}
//   node kit/werkzeuge/bib.mjs check                          alle DOIs gegen Crossref prüfen
//   node kit/werkzeuge/bib.mjs list [--json]                  Einträge auflisten
//   node kit/werkzeuge/bib.mjs keys                           nur bibkeys
//
// Exit-Codes: 0 ok, 1 Fehler, 2 DOI nicht gefunden / Prüfung mit Befunden.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export function parseBib(text) {
  const eintraege = [];
  const re = /@(\w+)\s*\{\s*([^,\s]+)\s*,/g;
  let m;
  while ((m = re.exec(text))) {
    const typ = m[1].toLowerCase();
    if (typ === 'comment' || typ === 'string' || typ === 'preamble') continue;
    let i = re.lastIndex, tiefe = 1;
    while (i < text.length && tiefe > 0) {
      if (text[i] === '{') tiefe++;
      else if (text[i] === '}') tiefe--;
      i++;
    }
    const koerper = text.slice(re.lastIndex, i - 1);
    eintraege.push({ typ, key: m[2], felder: parseFelder(koerper) });
    re.lastIndex = i;
  }
  return eintraege;
}

function parseFelder(s) {
  const felder = {};
  let i = 0;
  while (i < s.length) {
    const m = /\s*,?\s*([A-Za-z_-]+)\s*=\s*/y;
    m.lastIndex = i;
    const r = m.exec(s);
    if (!r) break;
    const name = r[1].toLowerCase();
    i = m.lastIndex;
    let wert = '';
    if (s[i] === '{') {
      let tiefe = 0, start = i;
      do {
        if (s[i] === '{') tiefe++;
        else if (s[i] === '}') tiefe--;
        i++;
      } while (i < s.length && tiefe > 0);
      wert = s.slice(start + 1, i - 1);
    } else if (s[i] === '"') {
      const ende = s.indexOf('"', i + 1);
      wert = s.slice(i + 1, ende);
      i = ende + 1;
    } else {
      const r2 = /[^,\s]+/y; r2.lastIndex = i;
      const w = r2.exec(s); wert = w ? w[0] : ''; i = r2.lastIndex;
    }
    felder[name] = wert.replace(/\s+/g, ' ').trim();
  }
  return felder;
}

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

export function fuegeHinzu(eintrag) {
  const vorhanden = ladeBib();
  const doi = (eintrag.felder.doi || '').toLowerCase();
  const dublette = vorhanden.find((e) => e.key === eintrag.key || (doi && (e.felder.doi || '').toLowerCase() === doi));
  if (dublette) return { key: dublette.key, neu: false };
  const schluessel = new Set(vorhanden.map((e) => e.key));
  let key = eintrag.key, n = 0;
  while (schluessel.has(key)) key = eintrag.key + String.fromCharCode(97 + n++);
  const alt = fs.existsSync(BIB) ? fs.readFileSync(BIB, 'utf8') : '';
  const tmp = BIB + '.tmp';
  fs.writeFileSync(tmp, (alt.endsWith('\n') || alt === '' ? alt : alt + '\n') + '\n' + formatEintrag({ ...eintrag, key }));
  fs.renameSync(tmp, BIB);
  return { key, neu: true };
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
  const autoren = (w.author || []).map((a) => (a.family ? `${a.family}, ${a.given || ''}`.trim().replace(/,$/, '') : a.name)).filter(Boolean);
  const jahr = (w.issued?.['date-parts']?.[0]?.[0]) || (w.published?.['date-parts']?.[0]?.[0]) || '';
  const titel = ((w.title || [''])[0] || '').replace(/<[^>]+>/g, '');
  const typ = TYPEN[w.type] || 'misc';
  const container = (w['container-title'] || [''])[0];
  const felder = {
    author: autoren.map(esc).join(' and '),
    title: esc(titel),
    year: jahr,
    doi: w.DOI,
  };
  if (typ === 'article') Object.assign(felder, { journal: esc(container), volume: w.volume, number: w.issue, pages: w.page });
  else if (typ === 'inproceedings' || typ === 'incollection') Object.assign(felder, { booktitle: esc(container), pages: w.page, publisher: esc(w.publisher || '') });
  else if (typ === 'book') Object.assign(felder, { publisher: esc(w.publisher || ''), isbn: (w.ISBN || [])[0] });
  else Object.assign(felder, { url: w.URL, publisher: esc(w.publisher || '') });
  const nachname = (w.author?.[0]?.family) || (w.author?.[0]?.name) || '';
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
    const e = JSON.parse(fs.readFileSync(rest[0], 'utf8'));
    console.log(JSON.stringify(fuegeHinzu(e)));
  } else if (cmd === 'check') {
    const befunde = [];
    for (const e of ladeBib()) {
      if (!e.felder.doi) { befunde.push({ key: e.key, befund: 'keine DOI, manuell prüfen' }); continue; }
      try {
        const w = await crossref(e.felder.doi);
        if (!w) befunde.push({ key: e.key, befund: 'DOI existiert nicht' });
        else {
          const t1 = (w.title?.[0] || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
          const t2 = (e.felder.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
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
    else for (const e of alle) console.log(`${e.key.padEnd(28)} ${e.felder.year || '    '}  ${(e.felder.title || '').slice(0, 80)}`);
  } else if (cmd === 'keys') {
    console.log(ladeBib().map((e) => e.key).join('\n'));
  } else {
    console.log('Befehle: add <doi> [--key k] | add-json <datei> | check | list [--json] | keys');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error('Fehler: ' + e.message); process.exit(1); });
}
