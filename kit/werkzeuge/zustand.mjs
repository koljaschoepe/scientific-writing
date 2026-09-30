#!/usr/bin/env node
// Einzige Schreibstelle für arbeit/zustand.json. Skills ändern den Zustand nur hierüber.
//
// CLI: node kit/werkzeuge/zustand.mjs <befehl> [argumente]
//   init                                 fehlende Nutzerdateien aus kit/vorlagen/arbeit anlegen
//   zeige                                Kurzüberblick (Phase, nächster Schritt, Kapitel)
//   phase <id>                           Phase aktiv setzen, vorige erledigt, spätere offen
//   kapitel <nr> <status> [--titel T] [--datei D] [--ziel N] [--note X] [--offen N]   legt fehlende Kapitel an
//   kapitel-setzen <datei.json|->        (auch kapitel-liste, kapitel-anlegen) Kapitelliste setzen (bestehende Status bleiben erhalten)
//                                        Format: [{ "nr": "2.1", "titel": "...", "woerter_ziel": 1200 }]
//   hauptkapitel <datei.json|->          Hauptkapitel-Titel setzen: [{ "nr": "2", "titel": "Grundlagen" }]
//   freigeben <nr>                       Kapitel final setzen und im Verlauf vermerken
//   naechster "<text>"                   nächsten Schritt setzen (steht im Dashboard und im Start-Hook)
//   verlauf "<text>"                     Eintrag in den Verlauf (letzte 50)
//   aktivitaet                           Tagesaktivität fortschreiben (vom Stop-Hook genutzt)
//   pruefe-abzeichen                     neue Abzeichen vergeben, gibt sie aus
//
// Exporte: ABZEICHEN, ladeZustand, speichereZustand, init, setzePhase, setzeKapitel,
//          setzeKapitelListe, setzeHauptkapitel, freigeben, setzeNaechster, verlauf,
//          aktivitaet, pruefeAbzeichen
// Der letzte /sync steht bewusst nicht hier (gerätelokal, siehe git-lage.mjs).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PHASEN, PHASEN_IDS, KAPITEL_STATUS, findeRoot, p, existiert, leseJson, schreibeJson,
  heute, jetztIso, slug,
} from './lib.mjs';
import { ladeStand } from './stand.mjs';

// Dezente Abzeichen. bedingung(stand) bekommt das Ergebnis von ladeStand().
export const ABZEICHEN = [
  { id: 'eingerichtet', name: 'Startklar', beschreibung: 'Projekt eingerichtet.',
    bedingung: (s) => s.eingerichtet },
  { id: 'forschungsfrage', name: 'Forschungsfrage steht', beschreibung: 'Thema und Forschungsfrage sind festgelegt.',
    bedingung: (s) => s.meilenstein('thema') === 'erledigt' },
  { id: 'erste-quelle', name: 'Erste Quelle', beschreibung: 'Die erste Quelle ist genommen.',
    bedingung: (s) => s.quellen.zaehler.genommen >= 1 },
  { id: 'zehn-quellen', name: 'Zehn Quellen', beschreibung: 'Zehn Quellen genommen.',
    bedingung: (s) => s.quellen.zaehler.genommen >= 10 },
  { id: 'erste-auswertung', name: 'Gelesen und verstanden', beschreibung: 'Erste Quelle mit Zitaten ausgewertet.',
    bedingung: (s) => s.quellen.ausgewertet >= 1 },
  { id: 'expose-fertig', name: 'Exposé steht', beschreibung: 'Exposé für die Betreuung freigegeben.',
    bedingung: (s) => s.meilenstein('expose') === 'erledigt' },
  { id: 'gliederung-steht', name: 'Gerüst steht', beschreibung: 'Gliederung ist festgelegt.',
    bedingung: (s) => s.meilenstein('gliederung') === 'erledigt' },
  { id: 'tausend-woerter', name: 'Tausend Wörter', beschreibung: 'Die ersten 1.000 Wörter geschrieben.',
    bedingung: (s) => s.woerter.gesamt >= 1000 },
  { id: 'erstes-kapitel', name: 'Erstes Kapitel', beschreibung: 'Ein Unterkapitel ist final.',
    bedingung: (s) => s.kapitel.some((k) => k.status === 'final') },
  { id: 'serie-5', name: 'Fünf am Stück', beschreibung: 'Fünf Arbeitstage in Folge drangeblieben.',
    bedingung: (s) => s.serie >= 5 },
  { id: 'halbzeit', name: 'Halbzeit', beschreibung: 'Die Hälfte des Wörterziels ist geschafft.',
    bedingung: (s) => s.woerter.ziel > 0 && s.woerter.gesamt >= s.woerter.ziel / 2 },
  { id: 'erstes-pdf', name: 'Schwarz auf weiß', beschreibung: 'Das erste PDF ist gebaut.',
    bedingung: (s) => s.pdf.vorhanden },
  { id: 'alles-geprueft', name: 'Auf Herz und Nieren', beschreibung: 'Die Prüfphase ist abgeschlossen.',
    bedingung: (s) => s.meilenstein('pruefen') === 'erledigt' },
  { id: 'abgegeben', name: 'Abgegeben', beschreibung: 'Die Arbeit ist fertig.',
    bedingung: (s) => s.meilenstein('abgabe') === 'erledigt' },
];

const zustandsDatei = (root) => p(root, 'arbeit', 'zustand.json');
const vorlage = (root, name) => p(root, 'kit', 'vorlagen', 'arbeit', name);

export function ladeZustand(root) {
  const z = leseJson(zustandsDatei(root)) || leseJson(vorlage(root, 'zustand.json')) || {};
  z.schema ??= 1;
  z.phase ??= 'einrichtung';
  z.meilensteine ??= {};
  for (const id of PHASEN_IDS) z.meilensteine[id] ??= { status: 'offen', datum: null };
  z.kapitel ??= [];
  z.aktivitaet ??= { tage: {} };
  z.aktivitaet.tage ??= {};
  z.abzeichen ??= [];
  delete z.sync; // früher hier, jetzt gerätelokal
  z.verlauf ??= [];
  return z;
}

export function speichereZustand(root, z) {
  schreibeJson(zustandsDatei(root), z);
}

export function init(root) {
  const angelegt = [];
  const kopien = [
    ['projekt.json', p(root, 'arbeit', 'projekt.json')],
    ['zustand.json', p(root, 'arbeit', 'zustand.json')],
    ['plan.json', p(root, 'arbeit', 'plan.json')],
    ['kandidaten.json', p(root, 'quellen', 'kandidaten.json')],
  ];
  for (const [name, ziel] of kopien) {
    if (!existiert(ziel) && existiert(vorlage(root, name))) {
      fs.mkdirSync(path.dirname(ziel), { recursive: true });
      fs.copyFileSync(vorlage(root, name), ziel);
      angelegt.push(path.relative(root, ziel));
    }
  }
  for (const d of ['arbeit/kapitel', 'arbeit/plaene', 'arbeit/pruefung', 'arbeit/betreuung',
    'arbeit/thema', 'arbeit/expose', 'arbeit/gliederung', 'quellen/zitate', 'quellen/pdfs',
    'quellen/eingang', 'abbildungen', 'daten/roh', 'daten/ergebnisse', 'code']) {
    const ziel = p(root, ...d.split('/'));
    if (!existiert(ziel)) { fs.mkdirSync(ziel, { recursive: true }); angelegt.push(d + '/'); }
  }
  const bib = p(root, 'quellen', 'literatur.bib');
  if (!existiert(bib)) {
    fs.writeFileSync(bib, '% Literaturdatenbank. Wird von /quellen gepflegt.\n', 'utf8');
    angelegt.push('quellen/literatur.bib');
  }
  return angelegt;
}

function eintragVerlauf(z, text) {
  z.verlauf.unshift({ datum: jetztIso(), was: String(text) });
  z.verlauf = z.verlauf.slice(0, 50);
}

export function setzePhase(root, id) {
  if (!PHASEN_IDS.includes(id)) throw new Error(`Unbekannte Phase "${id}". Erlaubt: ${PHASEN_IDS.join(', ')}`);
  const z = ladeZustand(root);
  const ziel = PHASEN_IDS.indexOf(id);
  PHASEN_IDS.forEach((pid, i) => {
    const m = z.meilensteine[pid];
    if (i < ziel) { if (m.status !== 'erledigt') { m.status = 'erledigt'; m.datum = heute(); } }
    else if (i === ziel) { m.status = 'aktiv'; m.datum = null; }
    else { m.status = 'offen'; m.datum = null; }
  });
  const alt = z.phase;
  z.phase = id;
  if (alt !== id) eintragVerlauf(z, `Neue Phase: ${PHASEN.find((x) => x.id === id).name}`);
  speichereZustand(root, z);
  return z;
}

// Letzte Phase abschließen (Abgabe erledigt), ohne eine neue zu aktivieren
export function schliesseAb(root) {
  const z = ladeZustand(root);
  for (const pid of PHASEN_IDS) {
    const m = z.meilensteine[pid];
    if (m.status !== 'erledigt') { m.status = 'erledigt'; m.datum = heute(); }
  }
  z.phase = 'abgabe';
  eintragVerlauf(z, 'Arbeit abgeschlossen');
  speichereZustand(root, z);
  return z;
}

function kapitelDatei(nr, titel) {
  return `arbeit/kapitel/${String(nr).replace(/\./g, '-')}${titel ? '-' + slug(titel) : ''}.md`;
}

export function setzeKapitel(root, nr, status, extra = {}) {
  if (status && !KAPITEL_STATUS.includes(status)) {
    throw new Error(`Unbekannter Status "${status}". Erlaubt: ${KAPITEL_STATUS.join(', ')}`);
  }
  const z = ladeZustand(root);
  let k = z.kapitel.find((x) => String(x.nr) === String(nr));
  if (!k) {
    k = { nr: String(nr), titel: extra.titel || '', hauptkapitel: String(nr).split('.')[0],
      datei: '', status: 'offen', woerter_ziel: 0, note_schaetzung: null, offene_punkte: 0 };
    z.kapitel.push(k);
  }
  if (extra.titel !== undefined) k.titel = extra.titel;
  if (extra.datei !== undefined) k.datei = extra.datei;
  if (extra.woerter_ziel !== undefined) k.woerter_ziel = Number(extra.woerter_ziel) || 0;
  if (extra.note_schaetzung !== undefined) k.note_schaetzung = extra.note_schaetzung === '' ? null : extra.note_schaetzung;
  if (extra.offene_punkte !== undefined) k.offene_punkte = Number(extra.offene_punkte) || 0;
  if (!k.datei) k.datei = kapitelDatei(k.nr, k.titel);
  if (status && status !== k.status) {
    k.status = status;
    const wort = { offen: 'offen', geplant: 'geplant', entwurf: 'Entwurf fertig', geprueft: 'geprüft', final: 'freigegeben' }[status];
    eintragVerlauf(z, `Kapitel ${k.nr} ${k.titel ? '„' + k.titel + '“ ' : ''}${wort}`);
  }
  sortiereKapitel(z);
  speichereZustand(root, z);
  return k;
}

function nrSchluessel(nr) {
  return String(nr).split('.').map((x) => x.padStart(4, '0')).join('.');
}
function sortiereKapitel(z) {
  z.kapitel.sort((a, b) => nrSchluessel(a.nr).localeCompare(nrSchluessel(b.nr)));
}

export function setzeKapitelListe(root, liste) {
  const z = ladeZustand(root);
  const alt = new Map(z.kapitel.map((k) => [String(k.nr), k]));
  z.kapitel = liste.map((e) => {
    const a = alt.get(String(e.nr)) || {};
    const titel = e.titel ?? a.titel ?? '';
    return {
      nr: String(e.nr),
      titel,
      hauptkapitel: String(e.hauptkapitel ?? String(e.nr).split('.')[0]),
      datei: e.datei || a.datei || kapitelDatei(e.nr, titel),
      status: e.status || a.status || 'offen',
      woerter_ziel: Number(e.woerter_ziel ?? a.woerter_ziel ?? 0) || 0,
      note_schaetzung: e.note_schaetzung ?? a.note_schaetzung ?? null,
      offene_punkte: Number(e.offene_punkte ?? a.offene_punkte ?? 0) || 0,
    };
  });
  sortiereKapitel(z);
  eintragVerlauf(z, `Gliederung gesetzt: ${z.kapitel.length} Unterkapitel`);
  speichereZustand(root, z);
  return z.kapitel;
}

export function setzeHauptkapitel(root, liste) {
  const z = ladeZustand(root);
  z.hauptkapitel = liste.map((h) => ({ nr: String(h.nr), titel: String(h.titel || '') }));
  speichereZustand(root, z);
  return z.hauptkapitel;
}

export function freigeben(root, nr) {
  return setzeKapitel(root, nr, 'final');
}

export function setzeNaechster(root, text) {
  const z = ladeZustand(root);
  z.naechster_schritt = String(text);
  speichereZustand(root, z);
}

export function verlauf(root, text) {
  const z = ladeZustand(root);
  eintragVerlauf(z, text);
  speichereZustand(root, z);
}

// Tagesaktivität: Wörterzuwachs seit dem letzten Aufruf, neue Quellen, Sitzungen (Pause > 30 min = neue Sitzung)
export function aktivitaet(root) {
  const stand = ladeStand(root);
  const z = ladeZustand(root);
  const a = z.aktivitaet;
  const tag = heute();
  const eintrag = (a.tage[tag] ??= { woerter: 0, quellen: 0, sessions: 0 });
  const gesamt = stand.woerter.gesamt;
  const quellen = stand.quellen.zaehler.genommen;
  if (typeof a.letzte_gesamt === 'number') {
    const diff = gesamt - a.letzte_gesamt;
    if (diff > 0) eintrag.woerter += diff;
  }
  if (typeof a.letzte_quellen === 'number') {
    const diff = quellen - a.letzte_quellen;
    if (diff > 0) eintrag.quellen += diff;
  }
  const letzter = a.letzter_stop ? Date.parse(a.letzter_stop) : 0;
  if (!letzter || Date.now() - letzter > 30 * 60 * 1000 || heute(new Date(letzter)) !== tag) eintrag.sessions += 1;
  a.letzte_gesamt = gesamt;
  a.letzte_quellen = quellen;
  a.letzter_stop = jetztIso();
  // nur die letzten 400 Tage behalten
  const tage = Object.keys(a.tage).sort();
  for (const t of tage.slice(0, Math.max(0, tage.length - 400))) delete a.tage[t];
  speichereZustand(root, z);
  return { tag, ...eintrag };
}

export function pruefeAbzeichen(root) {
  const stand = ladeStand(root);
  const z = ladeZustand(root);
  const vorhanden = new Set(z.abzeichen.map((x) => x.id));
  const neu = [];
  for (const a of ABZEICHEN) {
    let erfuellt = false;
    try { erfuellt = !!a.bedingung(stand); } catch { erfuellt = false; }
    if (erfuellt && !vorhanden.has(a.id)) {
      z.abzeichen.push({ id: a.id, datum: heute() });
      neu.push(a);
    }
  }
  if (neu.length) {
    for (const a of neu) eintragVerlauf(z, `Abzeichen: ${a.name}`);
    speichereZustand(root, z);
  }
  return neu;
}

function leseEingabeJson(arg) {
  const text = arg === '-' || !arg ? fs.readFileSync(0, 'utf8') : fs.readFileSync(arg, 'utf8');
  return JSON.parse(text.replace(/^﻿/, ''));
}

function optionen(args) {
  const o = {}; const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) { o[args[i].slice(2)] = args[i + 1]; i++; } else rest.push(args[i]);
  }
  return { o, rest };
}

async function main() {
  const [befehl, ...args] = process.argv.slice(2);
  const root = findeRoot();
  const aus = (x) => console.log(typeof x === 'string' ? x : JSON.stringify(x, null, 2));
  switch (befehl) {
    case 'init': { const a = init(root); aus(a.length ? `Angelegt: ${a.join(', ')}` : 'Alles vorhanden.'); break; }
    case 'zeige': {
      const s = ladeStand(root);
      aus(`Phase: ${s.phaseName} (${s.phaseIndex + 1}/8)\nNächster Schritt: ${s.naechster_schritt}\n` +
        `Wörter: ${s.woerter.gesamt}${s.woerter.ziel ? ' von ' + s.woerter.ziel : ''}\n` +
        `Kapitel: ${s.kapitel.map((k) => `${k.nr} ${k.status}`).join(', ') || 'noch keine'}\n` +
        `Quellen: ${s.quellen.zaehler.genommen} genommen, ${s.quellen.zaehler.vorschlag} Vorschläge offen`);
      break;
    }
    case 'phase': setzePhase(root, args[0]); aus(`Phase ${args[0]} aktiv.`); break;
    case 'abschliessen': schliesseAb(root); aus('Alle Phasen erledigt.'); break;
    case 'kapitel': {
      const { o, rest } = optionen(args);
      const k = setzeKapitel(root, rest[0], rest[1], {
        titel: o.titel, datei: o.datei, woerter_ziel: o.ziel, note_schaetzung: o.note, offene_punkte: o.punkte ?? o.offen,
      });
      aus(k); break;
    }
    case 'kapitel-liste': case 'kapitel-setzen': case 'kapitel-anlegen': aus(setzeKapitelListe(root, leseEingabeJson(args[0]))); break;
    case 'hauptkapitel': aus(setzeHauptkapitel(root, leseEingabeJson(args[0]))); break;
    case 'freigeben': freigeben(root, args[0]); aus(`Kapitel ${args[0]} freigegeben.`); break;
    case 'naechster': setzeNaechster(root, args.join(' ')); aus('Nächster Schritt gesetzt.'); break;
    case 'verlauf': verlauf(root, args.join(' ')); aus('Eingetragen.'); break;
    case 'aktivitaet': aus(aktivitaet(root)); break;
    case 'pruefe-abzeichen': {
      const neu = pruefeAbzeichen(root);
      aus(neu.length ? neu.map((a) => `Neues Abzeichen: ${a.name} (${a.beschreibung})`).join('\n') : 'Keine neuen Abzeichen.');
      break;
    }
    default:
      aus('Befehle: init, zeige, phase <id>, abschliessen, kapitel <nr> <status> [--titel --datei --ziel --note --offen], ' +
        'kapitel-setzen <json|->, hauptkapitel <json|->, freigeben <nr>, naechster "<text>", verlauf "<text>", ' +
        'aktivitaet, pruefe-abzeichen');
      if (befehl) process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`Fehler: ${e.message}`); process.exit(1); });
}
