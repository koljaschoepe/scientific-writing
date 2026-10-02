#!/usr/bin/env node
// Deterministische Stilprüfung eines Kapitels. Zählt, was ein Sprachmodell nicht zählen soll.
// Schalter und Schwellen aus .arbeit/einstellungen.md (Abschnitt Stil), freie Vorlieben aus .arbeit/stil.md,
// feste Begriffe aus .arbeit/begriffe.md. Regeln: .claude/kit/leitfaeden/schreiben/stilregeln.md
//
// Aufruf:
//   node .claude/kit/werkzeuge/stil.mjs <kapiteldatei|kapitelnummer> [weitere ...] [--json] [--alle]
//   --alle      alle Kapitel aus .arbeit/zustand.json, deren Datei existiert
//   --json      maschinenlesbar: { dateien: [{ datei, schalter, statistik, zaehler, funde: [...] }] }
//   --max N     höchstens N Funde je Datei ausgeben (Standard 200)
//
// Fund: { regel, schwere: hoch|mittel|niedrig, zeile, absatz, satz, wert, grenze, hinweis }
//   absatz = laufende Nummer ohne Überschriften (wie im Dashboard), zeile = 1-basiert in der Datei.
// Exit-Codes: 0 geprüft (auch mit Funden), 1 Fehler (Datei fehlt).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findeRoot, p, leseText, leseEinstellungen } from './lib.mjs';

// ---------- Wortlisten ----------

const ABKUERZUNGEN = ['z. B.', 'z.B.', 'd. h.', 'd.h.', 'u. a.', 'u.a.', 'o. Ä.', 'i. d. R.', 'i.d.R.', 's. o.', 's. u.', 'u. U.', 'z. T.',
  'bzw.', 'ca.', 'vgl.', 'ggf.', 'evtl.', 'etc.', 'usw.', 'inkl.', 'bspw.', 'sog.', 'Nr.', 'Abb.', 'Tab.', 'Kap.', 'Gl.', 'S.', 'Bd.',
  'Hrsg.', 'Aufl.', 'Jh.', 'Dr.', 'Prof.', 'Dipl.', 'et al.', 'e.g.', 'i.e.', 'Fig.', 'Eq.', 'Ref.', 'vs.', 'resp.', 'approx.', 'No.', 'pp.', 'p.',
  'min.', 'max.', 'Min.', 'Max.', 'gem.', 'lt.', 'zzgl.', 'ebd.', 'f.', 'ff.'];

// Floskeln und Muster aus verbotene-muster.md und stilregeln.md
const FLOSKELN_DE = [
  { re: /\b(echt|irgendwie|sozusagen|quasi|eigentlich|im Grunde genommen|die Sache ist die)\b/gi, regel: 'umgangssprache', schwere: 'mittel' },
  { re: /\b(enorm\w*|phänomenal\w*|gigantisch\w*|sensationell\w*|dramatisch\w*|revolutionär\w*|bahnbrechend\w*|einzigartig\w*|unglaublich\w*)\b/gi, regel: 'uebertreibung', schwere: 'mittel' },
  { re: /\b(zweifellos|offensichtlich|selbstverständlich|natürlich|bekanntlich|logischerweise)\b/gi, regel: 'absolutismus', schwere: 'mittel' },
  { re: /\b(sodann|alsdann|hernach|Gang der Untersuchung)\b/gi, regel: 'veraltet', schwere: 'niedrig' },
  { re: /\b(grundsätzlich|im Prinzip|an sich)\b/gi, regel: 'fuellwort', schwere: 'niedrig' },
  { re: /\b(es gibt|im Rahmen (von|des|der)|von zentraler Bedeutung|in Bezug auf|eine? \w+ (durchführen|vornehmen))\b/gi, regel: 'funktionsverb', schwere: 'niedrig' },
  { re: /\b(im (folgenden|nächsten|vorangegangenen|vorherigen) (Kapitel|Abschnitt)|wie (im|in) (vorangegangenen|vorherigen|letzten) (Kapitel|Abschnitt)|(Kapitel|Abschnitt) \d+(\.\d+)* (zeigt|stellt|beschreibt|erläutert))\b/gi, regel: 'kapitelverweis', schwere: 'niedrig' },
];
const FLOSKELN_EN = [
  { re: /\b(really|basically|kind of|sort of|actually|pretty much)\b/gi, regel: 'umgangssprache', schwere: 'mittel' },
  { re: /\b(huge|tremendous|phenomenal|revolutionary|groundbreaking|unprecedented|incredible)\b/gi, regel: 'uebertreibung', schwere: 'mittel' },
  { re: /\b(obviously|clearly|undoubtedly|of course|needless to say)\b/gi, regel: 'absolutismus', schwere: 'mittel' },
  { re: /\b(it is important to note that|in order to|due to the fact that|in terms of|there (is|are))\b/gi, regel: 'fuellwort', schwere: 'niedrig' },
  { re: /\b(in the (following|next|previous) (chapter|section)|as (discussed|described) (in|above))\b/gi, regel: 'kapitelverweis', schwere: 'niedrig' },
];

const STOPP_DE = new Set(('aber alle allem allen aller alles also auch auf aus bei beim bereits beide beiden bis dabei damit dann das dass dem den denen der deren des deshalb dessen die dies diese diesem diesen dieser dieses doch dort durch eine einem einen einer eines einige einigen etwa euch für gegen hier hinter ihre ihrem ihren ihrer immer indem jedoch jede jedem jeden jeder jedes kann können könnte mehr mehrere nach nicht noch nur oder ohne sehr sein seine seinem seinen seiner sich sie sind sollen sollte sondern sowie über unter viele vom von vor wäre waren warum was weil wenn werden wird wurde wurden zwischen zum zur zwar welche welcher welches sowohl bzw während deren beziehungsweise zudem außerdem daher somit dadurch hierbei wobei dieser jedoch innerhalb anhand').split(' '));
const STOPP_EN = new Set(('about above after again against all also among because been before being below between both could does doing during each from further have having here into itself more most other over same should some such than that their theirs them then there these they this those through under until very were what when where which while whom with would your within without using based').split(' '));

// ---------- Text aufbereiten (Positionen bleiben erhalten, damit Zeilen stimmen) ----------

const leer = (m) => m.replace(/[^\n]/g, ' ');
const platzhalter = (m) => (m.includes('\n') ? 'X' + leer(m.slice(1)) : 'X' + ' '.repeat(Math.max(0, m.length - 1)));

function aufbereiten(md) {
  let t = String(md || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  t = t.replace(/^---\n[\s\S]*?\n---[ \t]*(\n|$)/, leer);
  t = t.replace(/<!--[\s\S]*?-->/g, leer);
  t = t.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, leer);
  t = t.replace(/\$\$[\s\S]*?\$\$(\s*\{#[^}]*\})?/g, leer);
  t = t.replace(/\\begin\{(equation|align|gather|multline|figure|table)\*?\}[\s\S]*?\\end\{\1\*?\}/g, leer);
  t = t.replace(/!\[[^\]]*\]\([^)]*\)(\{[^}]*\})?/g, leer);
  t = t.replace(/\[([^\]]+)\]\((?!@)[^)]*\)/g, (m, txt) => txt + ' '.repeat(m.length - txt.length));
  t = t.replace(/\$[^$\n]+\$/g, platzhalter);
  t = t.replace(/\\(ce|SI|si|qty|unit|num|chemfig)\{[^}]*\}(\{[^}]*\})?/g, platzhalter);
  t = t.replace(/\\(cref|Cref|ref|autoref|eqref)\{[^}]*\}/g, platzhalter);
  t = t.replace(/\[BELEG FEHLT\]/g, (m) => '\u0001' + ' '.repeat(m.length - 1)); // Markierung, Beleg wird separat gezählt
  t = t.replace(/\[-?@[^\]]*\]/g, leer);
  t = t.replace(/(^|\s)@[\w:.-]+/g, (m, a) => a + ' '.repeat(m.length - a.length));
  t = t.replace(/`[^`\n]*`/g, platzhalter);
  t = t.replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?/g, leer);
  t = t.replace(/[*_]{1,3}(?=\S)|(?<=\S)[*_]{1,3}/g, leer);
  return t;
}

function maskiereAbkuerzungen(t) {
  let s = t;
  for (const a of ABKUERZUNGEN) {
    const re = new RegExp(`(^|[\\s(„"])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    s = s.replace(re, (m) => m.replace(/\./g, '․'));
  }
  s = s.replace(/(\d)\.(\d)/g, '$1․$2');               // Dezimalzahlen
  s = s.replace(/\b(\d{1,2})\.(?=\s+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|Jh|Jahrhundert|Auflage|Kapitel))/g, '$1․');
  s = s.replace(/\b([A-ZÄÖÜ])\.(?=\s*[A-ZÄÖÜ]\.|\s+[A-ZÄÖÜ][a-zäöüß]+)/g, (m, b, off, all) => (/\s/.test(all[off - 1] || ' ') ? `${b}․` : m)); // Initialen
  return s;
}

function absaetzeMitZeilen(t) {
  const liste = [];
  const zeilen = t.split('\n');
  let akt = null;
  let offset = 0;
  zeilen.forEach((z, i) => {
    const leerZeile = !z.trim();
    if (leerZeile) { if (akt) { liste.push(akt); akt = null; } }
    else {
      if (!akt) akt = { start: i + 1, offset, text: '' };
      akt.text += (akt.text ? '\n' : '') + z;
    }
    offset += z.length + 1;
  });
  if (akt) liste.push(akt);
  return liste;
}

const istUeberschrift = (a) => /^\s{0,3}#{1,6}\s/.test(a.text);
const istTabelle = (a) => a.text.split('\n').every((z) => /^\s*\|/.test(z) || /^\s*:\s/.test(z) || /^\s*[-:| ]+\s*$/.test(z));

function saetze(absatz) {
  const t = maskiereAbkuerzungen(absatz.text);
  const aus = [];
  const re = /[.!?]+["“”»)]*(?=\s+["„»(]?[A-ZÄÖÜ0-9\u0001X]|\s*$)/g;
  let start = 0, m;
  while ((m = re.exec(t))) {
    const ende = m.index + m[0].length;
    const s = t.slice(start, ende);
    if (s.trim()) aus.push({ text: s, offset: start });
    start = ende;
  }
  if (t.slice(start).trim()) aus.push({ text: t.slice(start), offset: start });
  return aus.map((s) => {
    const vor = s.text.match(/^\s*/)[0].length;
    const zeile = absatz.start + (absatz.text.slice(0, s.offset + vor).match(/\n/g) || []).length;
    return { text: s.text.trim().replace(/․/g, '.').replace(/\s+/g, ' '), zeile };
  });
}

const woerterIn = (s) => s.split(/[\s/]+/).map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter((w) => /[\p{L}\p{N}]/u.test(w) && w !== '\u0001');
const kurz = (s, n = 80) => (s.length > n ? s.slice(0, n - 3) + '...' : s);
const stamm = (w) => { const x = w.toLowerCase(); return x.length >= 7 ? x.replace(/(ungen|en|er|es|e|n|s)$/, '') : x; };

// ---------- Projektdaten ----------

function stilListe(root) {
  const t = leseText(p(root, '.arbeit', 'stil.md'), '').replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '');
  const m = /^#{1,6}\s+Wörter, die ich nicht will\s*$/mi.exec(t);
  if (!m) return [];
  const rest = t.slice(m.index + m[0].length);
  const ende = rest.search(/^#{1,6}\s/m);
  return (ende >= 0 ? rest.slice(0, ende) : rest).split('\n')
    .map((z) => z.trim().replace(/^[-*]\s+/, '').replace(/[„“"]/g, '').trim()).filter((z) => z && z.length < 60);
}

function festeBegriffe(root) {
  const t = leseText(p(root, '.arbeit', 'begriffe.md'), '');
  const fest = new Set();
  for (const z of t.split(/\r?\n/)) {
    if (!/\bfest\b/i.test(z)) continue;
    const zellen = z.split('|').map((x) => x.trim()).filter(Boolean);
    const wort = zellen[0] || z.replace(/^[-*]\s+/, '').split(/[:(–-]/)[0];
    for (const w of woerterIn(wort)) fest.add(stamm(w));
  }
  return fest;
}

// ---------- Prüfung ----------

export function pruefeText(md, { schalter, sprache = 'de', unerwuenscht = [], fest = new Set(), max = 200 } = {}) {
  const sch = { ich_form: false, gedankenstriche: 'nein', semikolons: false, satz_max_woerter: 30, kommas_max: 3, ...(schalter || {}) };
  const en = sprache === 'en';
  const funde = [];
  const fund = (regel, schwere, zeile, absatz, satz, extra = {}) => funde.push({ regel, schwere, zeile, absatz, satz: kurz(satz), ...extra });
  const roh = String(md || '').replace(/\r\n?/g, '\n');
  const rohZeilen = roh.split('\n');

  // Markierungen, die im Rohtext stehen
  rohZeilen.forEach((z, i) => {
    for (const m of z.matchAll(/\[BELEG FEHLT\]/g)) fund('beleg_fehlt', 'hoch', i + 1, null, z.trim(), { hinweis: 'Quelle nachtragen oder Aussage streichen.' });
    if (/\b(TODO|FIXME|XXX)\b|\?\?\?/.test(z) && !/^\s*<!--/.test(z)) fund('todo', 'hoch', i + 1, null, z.trim(), { hinweis: 'Offene Stelle vor der Abgabe klären.' });
  });
  // Abbildungen und Tabellen ohne Verweis im Text
  for (const m of roh.matchAll(/\{#((fig|tbl|eq):[^}\s]+)/g)) {
    const label = m[1];
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`\\\\[cC]?ref\\{${esc}\\}|\\\\eqref\\{${esc}\\}|@${esc}\\b`).test(roh)) {
      const zeile = roh.slice(0, m.index).split('\n').length;
      fund('ohne_verweis', 'mittel', zeile, null, label, { hinweis: `Im Text mit \\cref{${label}} darauf verweisen.` });
    }
  }
  // @fig:x liest Pandoc als Zitat. Das PDF-Werkzeug repariert es, richtig ist \cref{fig:x}.
  rohZeilen.forEach((z, i) => {
    for (const m of z.matchAll(/(?<![\w\\{])@((fig|tbl|eq|sec):[\w:-]+(?:\.[\w-]+)*)/g)) fund('verweis_syntax', 'niedrig', i + 1, null, z.trim(), { wert: m[0], hinweis: `\\cref{${m[1]}} statt ${m[0]} schreiben.` });
  });

  const text = aufbereiten(roh);
  const absaetze = absaetzeMitZeilen(text).filter((a) => !istTabelle(a));
  const floskeln = en ? FLOSKELN_EN : FLOSKELN_DE;
  const stopp = en ? STOPP_EN : STOPP_DE;
  const nominal = en ? /^\p{L}{4,}(tion|tions|ment|ments|ness)$/u : /^\p{L}{3,}(ung|ungen|heit|heiten|keit|keiten)$/u;
  const ich = en ? /\b(I|me|my|mine|we|us|our|ours)\b/ : /\b([Ii]ch|mich|mir|mein\w*|[Ww]ir|uns|unser\w*)\b/;
  const statistik = { absaetze: 0, saetze: 0, woerter: 0, laengster_satz: 0 };
  let nr = 0;

  for (const a of absaetze) {
    if (istUeberschrift(a)) continue;
    nr++;
    statistik.absaetze++;
    const ss = saetze(a);
    let striche = 0, doppelpunkte = 0;
    const woerterAbsatz = new Map();
    let vorherAnfang = null, vorherWoerter = new Set();
    for (const s of ss) {
      const w = woerterIn(s.text);
      if (!w.length) continue;
      statistik.saetze++; statistik.woerter += w.length;
      statistik.laengster_satz = Math.max(statistik.laengster_satz, w.length);
      if (w.length > sch.satz_max_woerter) fund('satzlaenge', w.length > sch.satz_max_woerter * 1.4 ? 'hoch' : 'mittel', s.zeile, nr, s.text, { wert: w.length, grenze: sch.satz_max_woerter, hinweis: 'Satz teilen.' });
      const kommas = (s.text.replace(/\d,\d/g, '').match(/,/g) || []).length;
      if (kommas > sch.kommas_max) fund('kommas', 'mittel', s.zeile, nr, s.text, { wert: kommas, grenze: sch.kommas_max, hinweis: 'Satz teilen oder Einschübe auflösen.' });
      const nom = w.filter((x) => nominal.test(x));
      if (nom.length > 2) fund('nominalstil', 'mittel', s.zeile, nr, s.text, { wert: nom.length, grenze: 2, hinweis: `Verben statt ${nom.slice(0, 4).join(', ')}.` });
      if (!sch.semikolons && s.text.includes(';')) fund('semikolon', 'mittel', s.zeile, nr, s.text, { hinweis: 'Punkt statt Semikolon.' });
      const strichHier = (s.text.match(/\s[–—]\s|\s-\s|[–—]/g) || []).length;
      if (strichHier) {
        striche += strichHier;
        if (sch.gedankenstriche === 'nein') fund('gedankenstrich', 'mittel', s.zeile, nr, s.text, { wert: strichHier, hinweis: 'Komma, Klammer oder neuer Satz statt Gedankenstrich.' });
        else if (sch.gedankenstriche === 'sparsam' && strichHier >= 2) fund('gedankenstrich', 'niedrig', s.zeile, nr, s.text, { wert: strichHier, hinweis: 'Kein Einschub zwischen zwei Gedankenstrichen.' });
      }
      if (!sch.ich_form) {
        const m = ich.exec(s.text.replace(/„[^“]*“|"[^"]*"/g, ''));
        if (m) fund('ich_form', 'mittel', s.zeile, nr, s.text, { wert: m[0], hinweis: 'Unpersönlich formulieren (Ich-Form ist ausgeschaltet).' });
      }
      doppelpunkte += (s.text.match(/:(?!\d)/g) || []).length;
      for (const f of floskeln) {
        for (const m of s.text.matchAll(f.re)) fund(f.regel, f.schwere, s.zeile, nr, s.text, { wert: m[0] });
      }
      for (const u of unerwuenscht) {
        const re = new RegExp(`(^|[^\\p{L}])${u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}])`, 'iu');
        if (re.test(s.text)) fund('unerwuenscht', 'hoch', s.zeile, nr, s.text, { wert: u, hinweis: 'Steht in .arbeit/stil.md unter „Wörter, die ich nicht will“.' });
      }
      if (!en && /\b\p{L}+ (und|oder|sowie|bis) -\p{Ll}+/u.test(s.text)) fund('ergaenzungsstrich', 'niedrig', s.zeile, nr, s.text, { hinweis: 'Beide Wörter ausschreiben.' });
      // gleiche Satzanfänge
      const anfang = w[0].toLowerCase();
      if (vorherAnfang && anfang === vorherAnfang && !/^x$/i.test(anfang)) fund('satzanfang', 'niedrig', s.zeile, nr, s.text, { wert: w[0], hinweis: 'Zwei Sätze hintereinander mit demselben Anfang.' });
      vorherAnfang = anfang;
      // Wiederholungen
      const inhaltWoerter = w.filter((x) => x.length >= 6 && !stopp.has(x.toLowerCase()) && !/^\d/.test(x) && !fest.has(stamm(x)));
      const inhalt = new Map();
      for (const x of inhaltWoerter) {
        const st = stamm(x);
        if (!inhalt.has(st)) inhalt.set(st, x);
        const e = woerterAbsatz.get(st) || { n: 0, wort: x };
        e.n++; woerterAbsatz.set(st, e);
      }
      for (const [st, x] of inhalt) {
        if (vorherWoerter.has(st)) fund('wiederholung_nachbarsatz', 'niedrig', s.zeile, nr, s.text, { wert: x, hinweis: 'Wort aus dem vorigen Satz wiederholt.' });
      }
      vorherWoerter = new Set(inhalt.keys());
    }
    for (const [, e] of woerterAbsatz) if (e.n > 3) fund('wiederholung_absatz', 'mittel', a.start, nr, a.text.replace(/\s+/g, ' ').trim(), { wert: e.wort, grenze: 3, anzahl: e.n, hinweis: `„${e.wort}“ ${e.n}-mal im Absatz.` });
    if (sch.gedankenstriche === 'sparsam' && striche > 1) fund('gedankenstrich', 'niedrig', a.start, nr, a.text.replace(/\s+/g, ' ').trim(), { wert: striche, grenze: 1, hinweis: 'Höchstens ein Gedankenstrich je Absatz.' });
    if (doppelpunkte > 1) fund('doppelpunkt', 'niedrig', a.start, nr, a.text.replace(/\s+/g, ' ').trim(), { wert: doppelpunkte, grenze: 1, hinweis: 'Doppelpunkte selten verwenden.' });
  }

  funde.sort((x, y) => x.zeile - y.zeile);
  const zaehler = { hoch: 0, mittel: 0, niedrig: 0, je_regel: {} };
  for (const f of funde) { zaehler[f.schwere]++; zaehler.je_regel[f.regel] = (zaehler.je_regel[f.regel] || 0) + 1; }
  statistik.mittlere_satzlaenge = statistik.saetze ? Math.round((statistik.woerter / statistik.saetze) * 10) / 10 : 0;
  return { schalter: sch, statistik, zaehler, funde: funde.slice(0, max), weitere: Math.max(0, funde.length - max) };
}

function dateiZuNummer(root, arg) {
  if (fs.existsSync(path.resolve(arg))) return path.resolve(arg);
  if (fs.existsSync(p(root, arg))) return p(root, arg);
  try {
    const z = JSON.parse(leseText(p(root, '.arbeit', 'zustand.json'), '{}'));
    const k = (z.kapitel || []).find((x) => String(x.nr) === String(arg));
    if (k?.datei) return p(root, ...k.datei.split('/'));
  } catch {}
  return null;
}

export function pruefeDatei(root, datei, optionen = {}) {
  const e = leseEinstellungen(root);
  const r = pruefeText(leseText(datei, ''), {
    schalter: e.stil, sprache: e.arbeit.sprache, unerwuenscht: stilListe(root), fest: festeBegriffe(root), ...optionen,
  });
  return { datei: path.relative(root, datei).split(path.sep).join('/'), ...r };
}

const REGEL_NAME = {
  satzlaenge: 'Satz zu lang', kommas: 'zu viele Kommas', nominalstil: 'Nominalstil', semikolon: 'Semikolon', gedankenstrich: 'Gedankenstrich',
  ich_form: 'Ich-Form', umgangssprache: 'Umgangssprache', uebertreibung: 'Übertreibung', absolutismus: 'Absolutismus', veraltet: 'veraltet',
  fuellwort: 'Füllwort', funktionsverb: 'Funktionsverb', kapitelverweis: 'Kapitelverweis', unerwuenscht: 'unerwünschtes Wort',
  ergaenzungsstrich: 'Ergänzungsstrich', satzanfang: 'gleicher Satzanfang', wiederholung_nachbarsatz: 'Wiederholung (Nachbarsatz)',
  wiederholung_absatz: 'Wiederholung (Absatz)', doppelpunkt: 'Doppelpunkte', beleg_fehlt: '[BELEG FEHLT]', todo: 'TODO', ohne_verweis: 'ohne Verweis',
  verweis_syntax: 'Verweis-Schreibweise',
};

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const mi = args.indexOf('--max');
  const max = mi >= 0 ? Number(args[mi + 1]) || 200 : 200;
  const ziele = args.filter((a, i) => !a.startsWith('--') && !(mi >= 0 && i === mi + 1));
  const root = findeRoot();
  let dateien = [];
  if (args.includes('--alle')) {
    try {
      const z = JSON.parse(leseText(p(root, '.arbeit', 'zustand.json'), '{}'));
      dateien = (z.kapitel || []).map((k) => k.datei && p(root, ...k.datei.split('/'))).filter((f) => f && fs.existsSync(f));
    } catch {}
  }
  for (const a of ziele) {
    const f = dateiZuNummer(root, a);
    if (!f) { console.error(`Fehler: ${a} nicht gefunden (Datei oder Kapitelnummer aus .arbeit/zustand.json).`); process.exit(1); }
    dateien.push(f);
  }
  if (!dateien.length) {
    console.error('Aufruf: node .claude/kit/werkzeuge/stil.mjs <kapiteldatei|nummer> [--json] [--alle]');
    process.exit(1);
  }
  const ergebnisse = [...new Set(dateien)].map((f) => pruefeDatei(root, f, { max }));
  if (json) { process.stdout.write(JSON.stringify({ dateien: ergebnisse }, null, 2) + '\n'); return; }
  for (const r of ergebnisse) {
    const z = r.zaehler;
    console.log(`${r.datei}: ${r.statistik.saetze} Sätze, Mittel ${r.statistik.mittlere_satzlaenge} Wörter · Funde hoch ${z.hoch}, mittel ${z.mittel}, niedrig ${z.niedrig}`);
    for (const f of r.funde) {
      const wert = f.wert !== undefined ? ` (${f.wert}${f.grenze !== undefined ? ' > ' + f.grenze : ''})` : '';
      console.log(`  Z. ${String(f.zeile).padStart(3)}${f.absatz ? ` Abs. ${f.absatz}` : ''} · ${f.schwere} · ${REGEL_NAME[f.regel] || f.regel}${wert}: ${f.satz}`);
    }
    if (r.weitere) console.log(`  … ${r.weitere} weitere Funde (--max erhöhen)`);
  }
}

if (process.argv[1] && (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })()) {
  try { main(); } catch (e) { console.error(`Fehler: ${e.message}`); process.exit(1); }
}

