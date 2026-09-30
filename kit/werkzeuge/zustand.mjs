#!/usr/bin/env node
// Einzige Schreibstelle für arbeit/zustand.json. Skills ändern den Zustand nur hierüber.
//
// CLI: node kit/werkzeuge/zustand.mjs <befehl> [argumente]
//   init                                 fehlende Nutzerdateien aus kit/vorlagen/arbeit anlegen
//   zeige                                Kurzüberblick (Phase, nächster Schritt, Kapitel)
//   phase <id>                           Phase aktiv setzen, vorige erledigt, spätere offen
//   kapitel <nr> <status> [--titel T] [--datei D] [--ziel N] [--note X] [--offen N]   legt fehlende Kapitel an
//   status <nr> <status>                 Status eines bestehenden Kapitels setzen (offen, geplant, entwurf, geprueft, final)
//   kapitel-setzen <datei.json|->        (auch kapitel-liste, kapitel-anlegen) Kapitelliste setzen (bestehende Status bleiben erhalten)
//                                        Format: [{ "nr": "2.1", "titel": "...", "woerter_ziel": 1200 }]
//   hauptkapitel <datei.json|->          Hauptkapitel-Titel setzen: [{ "nr": "2", "titel": "Grundlagen" }]
//   freigeben <nr>                       Kapitel von geprueft auf final setzen und im Verlauf vermerken
//   naechster "<text>"                   nächsten Schritt setzen (steht im Dashboard und im Start-Hook)
//   verlauf "<text>"                     Eintrag in den Verlauf (letzte 50)
//   aktivitaet                           heutige Aktivität dieses Geräts ausgeben (nur lesen)
//   pruefe-abzeichen                     erreichte Abzeichen ausgeben (werden abgeleitet, nie gespeichert)
//
// Exit-Codes: 0 ok, 1 Fehler, 5 eine JSON-Datei ist beschädigt (nichts wurde geschrieben).
//
// Exporte: ABZEICHEN, ladeZustand, speichereZustand, init, setzePhase, setzeKapitel, setzeKapitelStatus,
//          setzeKapitelListe, setzeHauptkapitel, freigeben, setzeNaechster, verlauf,
//          aktivitaet, pruefeAbzeichen
// Gerätelokal und deshalb nicht hier: letzter /sync (.lokal/sync.json), Tagesaktivität (.lokal/aktivitaet.json).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PHASEN, PHASEN_IDS, KAPITEL_STATUS, findeRoot, p, existiert, leseJson, schreibeJson,
  heute, jetztIso, slug, lokal, leseAktivitaet, beendeBeiKaputt,
} from './lib.mjs';
import { ladeStand, ABZEICHEN } from './stand.mjs';

export { ABZEICHEN };

const zustandsDatei = (root) => p(root, 'arbeit', 'zustand.json');
const vorlage = (root, name) => p(root, 'kit', 'vorlagen', 'arbeit', name);

// Fehlt zustand.json, gilt die Vorlage. Ist sie beschädigt, wirft leseJson JsonKaputt:
// dann wird nie etwas geschrieben (keine Vorlage über die echte Datei).
export function ladeZustand(root) {
  let z = leseJson(zustandsDatei(root), null);
  if (z === null) z = leseJson(vorlage(root, 'zustand.json'), null) || {};
  if (!z || typeof z !== 'object' || Array.isArray(z)) z = {};
  z.schema ??= 1;
  z.phase ??= 'einrichtung';
  if (!z.meilensteine || typeof z.meilensteine !== 'object') z.meilensteine = {};
  for (const id of PHASEN_IDS) if (!z.meilensteine[id] || typeof z.meilensteine[id] !== 'object') z.meilensteine[id] = { status: 'offen', datum: null };
  if (!Array.isArray(z.kapitel)) z.kapitel = [];
  delete z.sync; // früher hier, jetzt gerätelokal
  if (!Array.isArray(z.verlauf)) z.verlauf = [];
  return z;
}

// Migration v2.0 -> v2.1: Tagesaktivität und Stop-Hook-Zähler gehören nicht in eine synchronisierte Datei.
// Alte Tage werden einmalig nach .lokal/aktivitaet.json übernommen, danach verschwinden die Felder.
function migriere(root, z) {
  const tage = z.aktivitaet && typeof z.aktivitaet === 'object' ? z.aktivitaet.tage : null;
  if (tage && typeof tage === 'object' && Object.keys(tage).length) {
    const a = leseAktivitaet(root);
    let neu = 0;
    for (const [t, e] of Object.entries(tage)) {
      if (a.tage[t] || !e || typeof e !== 'object') continue;
      a.tage[t] = { woerter: Number(e.woerter) || 0, quellen: Number(e.quellen) || 0, aenderungen: Number(e.sessions) || 0 };
      neu++;
    }
    if (neu) { a.schema ??= 1; schreibeJson(lokal(root, 'aktivitaet.json'), a); }
  }
  delete z.aktivitaet;
  delete z.letzter_stop;
  delete z.letzte_gesamt;
  delete z.letzte_quellen;
  if (Array.isArray(z.abzeichen) && !z.abzeichen.length) delete z.abzeichen; // alte, nicht leere Liste bleibt als Beleg
}

export function speichereZustand(root, z) {
  migriere(root, z);
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
  if (status) pruefeStatus(status);
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
    eintragVerlauf(z, `Kapitel ${k.nr} ${k.titel ? '„' + k.titel + '“ ' : ''}${STATUS_WORT[status]}`);
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

function pruefeStatus(status) {
  if (!KAPITEL_STATUS.includes(status)) {
    throw new Error(`Unbekannter Status "${status}". Erlaubt: ${KAPITEL_STATUS.join(', ')}`);
  }
}

export function setzeKapitelListe(root, liste) {
  if (!Array.isArray(liste)) throw new Error('Kapitelliste muss ein JSON-Array sein: [{ "nr": "2.1", "titel": "..." }]');
  for (const e of liste) {
    if (!e || typeof e !== 'object' || e.nr === undefined || e.nr === null || String(e.nr).trim() === '') throw new Error('Jeder Eintrag der Kapitelliste braucht eine "nr".');
    if (e.status !== undefined && e.status !== null && e.status !== '') pruefeStatus(e.status);
  }
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

const STATUS_WORT = { offen: 'offen', geplant: 'geplant', entwurf: 'Entwurf fertig', geprueft: 'geprüft', final: 'freigegeben' };

// Status eines bestehenden Kapitels setzen. Liefert { kapitel, vorher } (vorher = alter Status, fürs Undo).
export function setzeKapitelStatus(root, nr, status) {
  pruefeStatus(status);
  const z = ladeZustand(root);
  const k = z.kapitel.find((x) => String(x.nr) === String(nr));
  if (!k) throw new Error(`Kapitel ${nr} gibt es nicht. Bekannt: ${z.kapitel.map((x) => x.nr).join(', ') || 'noch keine'}`);
  const vorher = k.status || 'offen';
  if (vorher !== status) {
    k.status = status;
    eintragVerlauf(z, `Kapitel ${k.nr} ${k.titel ? '„' + k.titel + '“ ' : ''}${STATUS_WORT[status]}`);
    speichereZustand(root, z);
  }
  return { kapitel: k, vorher };
}

// Freigeben geht nur aus "geprueft". Alles andere erst prüfen lassen (/pruefen).
export function freigeben(root, nr) {
  const z = ladeZustand(root);
  const k = z.kapitel.find((x) => String(x.nr) === String(nr));
  if (!k) throw new Error(`Kapitel ${nr} gibt es nicht.`);
  if (k.status === 'final') return k;
  if (k.status !== 'geprueft') {
    throw new Error(`Kapitel ${nr} ist im Status "${k.status || 'offen'}". Freigeben geht nur aus "geprueft". Erst /pruefen ${nr}, oder bewusst: zustand.mjs status ${nr} final.`);
  }
  return setzeKapitelStatus(root, nr, 'final').kapitel;
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

// Heutige Aktivität dieses Geräts (nur lesen). Geschrieben wird sie vom Dashboard-Server
// und von den Werkzeugen über notiereAktivitaet (lib.mjs), nicht mehr von einem Stop-Hook.
export function aktivitaet(root) {
  const tag = heute();
  const e = leseAktivitaet(root).tage[tag] || {};
  return { tag, woerter: Number(e.woerter) || 0, quellen: Number(e.quellen) || 0, aenderungen: Number(e.aenderungen) || 0 };
}

// Abzeichen werden abgeleitet (stand.mjs), nie gespeichert. Liefert die erreichten.
export function pruefeAbzeichen(root) {
  return ladeStand(root).abzeichen.filter((a) => a.erreicht);
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
      if (s.kaputt.length) aus(`ACHTUNG beschädigt: ${s.kaputt.join(', ')}. Reparatur: node kit/werkzeuge/check.mjs --reparieren`);
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
    case 'status': {
      if (!args[0] || !args[1]) throw new Error(`Aufruf: status <nr> <status>. Erlaubt: ${KAPITEL_STATUS.join(', ')}`);
      const r = setzeKapitelStatus(root, args[0], args[1]);
      aus(r.vorher === args[1] ? `Kapitel ${args[0]} war schon ${args[1]}.` : `Kapitel ${args[0]}: ${r.vorher} -> ${args[1]}.`);
      break;
    }
    case 'naechster': setzeNaechster(root, args.join(' ')); aus('Nächster Schritt gesetzt.'); break;
    case 'verlauf': verlauf(root, args.join(' ')); aus('Eingetragen.'); break;
    case 'aktivitaet': aus(aktivitaet(root)); break;
    case 'pruefe-abzeichen': {
      const erreicht = pruefeAbzeichen(root);
      aus(erreicht.length
        ? erreicht.map((a) => `Abzeichen: ${a.name} (${a.beschreibung})${a.datum ? ' seit ' + a.datum : ''}`).join('\n')
        : 'Noch keine Abzeichen erreicht.');
      break;
    }
    default:
      aus('Befehle: init, zeige, phase <id>, abschliessen, kapitel <nr> <status> [--titel --datei --ziel --note --offen], ' +
        'status <nr> <status>, kapitel-setzen <json|->, hauptkapitel <json|->, freigeben <nr>, naechster "<text>", verlauf "<text>", ' +
        'aktivitaet, pruefe-abzeichen');
      if (befehl) process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { beendeBeiKaputt(e); console.error(`Fehler: ${e.message}`); process.exit(1); });
}
