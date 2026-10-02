#!/usr/bin/env node
// Triage-Board .arbeit/kandidaten.json lesen und ändern, ohne die Datei von Hand zu bearbeiten.
// Schreibt atomar über lib.mjs (mit .bak). Eine beschädigte Datei wird nie überschrieben.
//
//   node .claude/kit/werkzeuge/kandidaten.mjs list [--status s] [--kurz]   Liste (JSON oder eine Zeile je Quelle)
//   node .claude/kit/werkzeuge/kandidaten.mjs add <datei.json|->           Vorschläge anlegen (Objekt oder Array)
//   node .claude/kit/werkzeuge/kandidaten.mjs set <id> feld=wert ...        z. B. status=genommen stern=2 bibkey=smith2020deep
//   node .claude/kit/werkzeuge/kandidaten.mjs neu [--quittieren] [--json]   Entscheidungen seit der letzten Verarbeitung
//
// set-Felder: status, stern (0-3), relevanz (1-5), markierungen=a,b (festes Vokabular), kapitel=2.1,2.2,
//             bibkey, pdf, notiz, kurz, warum, ausgewertet=true|false, zitate=n, open_access=true|false|null
// add: Claude legt nur "vorschlag" an. Ausnahme: herkunft "upload" oder "manuell" darf "genommen" starten.
//      Dubletten (gleiche id oder DOI) werden übersprungen und gemeldet.
// neu: Quellen, deren Status sich seit der letzten Verarbeitung geändert hat (Feld verarbeitet_status),
//      plus genommene Quellen ohne bib-Eintrag und Dateien in quellen/eingang/. --quittieren merkt sie als verarbeitet.
//
// Exit-Codes: 0 ok, 1 Fehler, 5 kandidaten.json ist beschädigt (nichts wurde geschrieben).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findeRoot, p, leseJson, leseText, schreibeJson, heute, parseBib,
  QUELLEN_STATUS, MARKIERUNGEN, beendeBeiKaputt,
} from './lib.mjs';

const datei = (root) => p(root, '.arbeit', 'kandidaten.json');

export function ladeKandidaten(root) {
  const k = leseJson(datei(root), null) || { schema: 1, quellen: [] };
  if (!k || typeof k !== 'object' || Array.isArray(k)) throw new Error('.arbeit/kandidaten.json hat nicht die erwartete Form { "schema": 1, "quellen": [] }.');
  if (!Array.isArray(k.quellen)) k.quellen = [];
  k.schema ??= 1;
  return k;
}

const normDoi = (d) => String(d || '').trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '').replace(/^doi:\s*/, '');

function neuerEintrag(e) {
  const doi = normDoi(e.doi);
  const id = String(e.id || doi || `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
  const herkunft = e.herkunft || 'web';
  let status = e.status || 'vorschlag';
  if (!QUELLEN_STATUS.includes(status)) throw new Error(`Unbekannter Status "${status}" bei ${id}. Erlaubt: ${QUELLEN_STATUS.join(', ')}`);
  if (status !== 'vorschlag' && !(status === 'genommen' && ['upload', 'manuell', 'zotero'].includes(herkunft))) status = 'vorschlag';
  const markierungen = (Array.isArray(e.markierungen) ? e.markierungen : []).filter((m) => MARKIERUNGEN.includes(m));
  return {
    id, bibkey: e.bibkey || '', titel: e.titel || '', autoren: Array.isArray(e.autoren) ? e.autoren : [],
    jahr: e.jahr ?? null, venue: e.venue || '', doi, url: e.url || '',
    kurz: e.kurz || '', warum: e.warum || '',
    kapitel: (Array.isArray(e.kapitel) ? e.kapitel : e.kapitel ? [e.kapitel] : []).map(String),
    relevanz: e.relevanz == null ? null : Math.max(1, Math.min(5, Number(e.relevanz) || 1)),
    status, stern: 0, notiz: e.notiz || '', markierungen,
    pdf: e.pdf || null, open_access: e.open_access ?? null, ausgewertet: !!e.ausgewertet, zitate: Number(e.zitate) || 0,
    herkunft, hinzugefuegt: heute(), entschieden: status === 'vorschlag' ? null : heute(),
  };
}

export function fuegeHinzu(root, eintraege) {
  const k = ladeKandidaten(root);
  const ids = new Set(k.quellen.map((q) => String(q.id)));
  const dois = new Set(k.quellen.map((q) => normDoi(q.doi)).filter(Boolean));
  const neu = [], dubletten = [];
  let genommen = 0;
  for (const roh of eintraege) {
    if (!roh || typeof roh !== 'object') continue;
    const e = neuerEintrag(roh);
    if (ids.has(e.id) || (e.doi && dois.has(e.doi))) { dubletten.push(e.id); continue; }
    k.quellen.push(e); ids.add(e.id); if (e.doi) dois.add(e.doi);
    neu.push(e.id);
    if (e.status === 'genommen') genommen++;
  }
  if (neu.length) schreibeJson(datei(root), k);
  return { neu, dubletten };
}

function wert(feld, roh) {
  const zahl = (min, max) => { const n = Number(roh); if (!Number.isFinite(n)) throw new Error(`${feld} braucht eine Zahl.`); return Math.max(min, Math.min(max, Math.round(n))); };
  const bool = () => { if (roh === 'null') return null; if (/^(true|ja|1)$/i.test(roh)) return true; if (/^(false|nein|0)$/i.test(roh)) return false; throw new Error(`${feld} braucht true oder false.`); };
  const liste = () => roh.split(',').map((x) => x.trim()).filter(Boolean);
  switch (feld) {
    case 'status': if (!QUELLEN_STATUS.includes(roh)) throw new Error(`Unbekannter Status "${roh}". Erlaubt: ${QUELLEN_STATUS.join(', ')}`); return roh;
    case 'stern': return zahl(0, 3);
    case 'relevanz': return zahl(1, 5);
    case 'zitate': return zahl(0, 100000);
    case 'ausgewertet': return !!bool();
    case 'open_access': return bool();
    case 'markierungen': { const l = liste(); const falsch = l.filter((m) => !MARKIERUNGEN.includes(m)); if (falsch.length) throw new Error(`Unbekannte Markierung ${falsch.join(', ')}. Erlaubt: ${MARKIERUNGEN.join(', ')}`); return l; }
    case 'kapitel': return liste();
    case 'pdf': return roh === '' || roh === 'null' ? null : roh;
    case 'bibkey': case 'notiz': case 'kurz': case 'warum': case 'titel': case 'venue': case 'url': return roh;
    case 'doi': return normDoi(roh);
    case 'jahr': return Number(roh) || roh;
    default: throw new Error(`Feld "${feld}" lässt sich nicht setzen.`);
  }
}

export function setze(root, id, paare) {
  const k = ladeKandidaten(root);
  const q = k.quellen.find((x) => String(x.id) === String(id) || (x.bibkey && x.bibkey === id) || (normDoi(x.doi) && normDoi(x.doi) === normDoi(id)));
  if (!q) throw new Error(`Quelle "${id}" steht nicht im Board.`);
  const vorher = {};
  let genommen = 0;
  for (const paar of paare) {
    const i = paar.indexOf('=');
    if (i < 1) throw new Error(`"${paar}" ist kein feld=wert.`);
    const feld = paar.slice(0, i).trim();
    const w = wert(feld, paar.slice(i + 1));
    if (!(feld in vorher)) vorher[feld] = q[feld] === undefined ? null : q[feld];
    if (feld === 'status' && q.status !== w) {
      q.entschieden = w === 'vorschlag' ? null : heute();
      if (w === 'genommen') genommen++;
    }
    q[feld] = w;
  }
  schreibeJson(datei(root), k);
  return { quelle: q, vorher };
}

export function neueEntscheidungen(root, { quittieren = false } = {}) {
  const k = ladeKandidaten(root);
  const bibKeys = new Set(parseBib(leseText(p(root, 'quellen', 'literatur.bib'), '')).map((b) => b.key));
  const geaendert = k.quellen.filter((q) => q.status && q.status !== 'vorschlag' && q.verarbeitet_status !== q.status);
  const ohneBib = k.quellen.filter((q) => q.status === 'genommen' && !(q.bibkey && bibKeys.has(q.bibkey)));
  let eingang = [];
  try { eingang = fs.readdirSync(p(root, 'quellen', 'eingang')).filter((n) => !n.startsWith('.')); } catch {}
  if (quittieren && geaendert.length) {
    for (const q of geaendert) q.verarbeitet_status = q.status;
    schreibeJson(datei(root), k);
  }
  return { geaendert, ohneBib, eingang };
}

function zeileKurz(q) {
  const autor = String((Array.isArray(q.autoren) && q.autoren[0]) || '').split(',')[0];
  const teile = [
    q.id, q.status || 'vorschlag', q.stern ? '*'.repeat(q.stern) : '', q.bibkey || '', q.jahr || '',
    autor, String(q.titel || '').slice(0, 70),
    Array.isArray(q.kapitel) && q.kapitel.length ? 'Kap ' + q.kapitel.join(',') : '',
    Array.isArray(q.markierungen) && q.markierungen.length ? q.markierungen.join(',') : '',
    q.notiz ? `Notiz: ${String(q.notiz).replace(/\s+/g, ' ').slice(0, 60)}` : '',
  ];
  return teile.map((x) => String(x)).join(' | ').replace(/( \| )+$/, '');
}

function leseEingabe(arg) {
  const text = !arg || arg === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(arg, 'utf8');
  const j = JSON.parse(text.replace(/^﻿/, ''));
  return Array.isArray(j) ? j : Array.isArray(j?.quellen) ? j.quellen : [j];
}

function main() {
  const [befehl, ...args] = process.argv.slice(2);
  const root = findeRoot();
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  switch (befehl) {
    case 'list': {
      const status = opt('--status');
      if (status && !QUELLEN_STATUS.includes(status)) throw new Error(`Unbekannter Status "${status}". Erlaubt: ${QUELLEN_STATUS.join(', ')}`);
      const liste = ladeKandidaten(root).quellen.filter((q) => !status || (q.status || 'vorschlag') === status);
      if (args.includes('--kurz')) {
        console.log(liste.length ? liste.map(zeileKurz).join('\n') : 'Keine Quellen' + (status ? ` mit Status ${status}` : '') + '.');
      } else console.log(JSON.stringify(liste, null, 2));
      break;
    }
    case 'add': {
      const r = fuegeHinzu(root, leseEingabe(args[0]));
      console.log(`${r.neu.length} angelegt${r.dubletten.length ? `, ${r.dubletten.length} Dubletten übersprungen (${r.dubletten.join(', ')})` : ''}.`);
      break;
    }
    case 'set': {
      if (!args[0] || args.length < 2) throw new Error('Aufruf: set <id> feld=wert [feld=wert ...]');
      const r = setze(root, args[0], args.slice(1));
      console.log(zeileKurz(r.quelle));
      break;
    }
    case 'neu': {
      const r = neueEntscheidungen(root, { quittieren: args.includes('--quittieren') });
      if (args.includes('--json')) { console.log(JSON.stringify(r, null, 2)); break; }
      const z = [];
      for (const s of ['genommen', 'spaeter', 'verworfen']) {
        const l = r.geaendert.filter((q) => q.status === s);
        if (l.length) z.push(`${s} (${l.length}):`, ...l.map((q) => '  ' + zeileKurz(q)));
      }
      if (r.ohneBib.length) z.push(`genommen, noch ohne bib-Eintrag (${r.ohneBib.length}):`, ...r.ohneBib.map((q) => '  ' + zeileKurz(q)));
      if (r.eingang.length) z.push(`quellen/eingang (${r.eingang.length}): ${r.eingang.join(', ')}`);
      console.log(z.length ? z.join('\n') : 'Keine neuen Entscheidungen.');
      if (args.includes('--quittieren') && r.geaendert.length) console.log(`${r.geaendert.length} Entscheidungen als verarbeitet gemerkt.`);
      break;
    }
    default:
      console.log('Befehle: list [--status s] [--kurz] | add <datei.json|-> | set <id> feld=wert ... | neu [--quittieren] [--json]');
      if (befehl) process.exitCode = 1;
  }
}

if (process.argv[1] && (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })()) {
  try { main(); } catch (e) { beendeBeiKaputt(e); console.error(`Fehler: ${e.message}`); process.exit(1); }
}
