#!/usr/bin/env node
// Aggregiert alle Projektdateien zu einem Lagebild. Liest nur, schreibt nie.
// Genutzt vom Dashboard, von den Hooks und von zustand.mjs (Abzeichen).
//
// Export: ladeStand(root) → Objekt (siehe unten), CLI: node kit/werkzeuge/stand.mjs [--kurz]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PHASEN, PHASEN_IDS, WOCHENTAGE, findeRoot, p, existiert, leseJson, leseText,
  heute, tageBis, parseDatum, zaehleWoerter, parseBib, kitVersion,
} from './lib.mjs';
import { ABZEICHEN } from './zustand.mjs';
import { gitLage } from './git-lage.mjs';

const WOERTER_PRO_SEITE = 280; // Fließtext mit Abbildungen und Tabellen, eher konservativ

function dateienIn(ordner, filter = () => true) {
  try {
    return fs.readdirSync(ordner, { withFileTypes: true })
      .filter((e) => e.isFile() && !e.name.startsWith('.') && filter(e.name))
      .map((e) => {
        const st = fs.statSync(path.join(ordner, e.name));
        return { name: e.name, groesse: st.size, geaendert: st.mtime.toISOString() };
      })
      .sort((a, b) => b.geaendert.localeCompare(a.geaendert));
  } catch { return []; }
}

function zaehleZitate(root, bibkey) {
  if (!bibkey) return 0;
  const t = leseText(p(root, 'quellen', 'zitate', `${bibkey}.md`), '');
  return (t.match(/^##\s+Z\d+/gm) || []).length;
}

function arbeitstageZwischen(von, bis, erlaubt) {
  // zählt Arbeitstage in [von, bis) (beide Date, lokal 00:00)
  let n = 0;
  const d = new Date(von);
  while (d < bis) {
    if (erlaubt.has(WOCHENTAGE[d.getDay()])) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

function berechneSerie(tage, erlaubt) {
  const aktiv = (t) => {
    const e = tage[t];
    return e && ((e.woerter || 0) > 0 || (e.quellen || 0) > 0 || (e.sessions || 0) > 0);
  };
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // heute zählt, wenn aktiv. Wenn heute noch nichts passiert ist, bricht die Serie noch nicht.
  if (!aktiv(heute(d))) d.setDate(d.getDate() - 1);
  let serie = 0;
  for (let i = 0; i < 400; i++) {
    const t = heute(d);
    if (aktiv(t)) serie++;
    else if (erlaubt.has(WOCHENTAGE[d.getDay()])) break; // freie Tage unterbrechen nicht
    d.setDate(d.getDate() - 1);
  }
  return serie;
}

export function ladeStand(root = findeRoot()) {
  const projekt = leseJson(p(root, 'arbeit', 'projekt.json'))
    || leseJson(p(root, 'kit', 'vorlagen', 'arbeit', 'projekt.json')) || {};
  const zustand = leseJson(p(root, 'arbeit', 'zustand.json'))
    || leseJson(p(root, 'kit', 'vorlagen', 'arbeit', 'zustand.json')) || {};
  const plan = leseJson(p(root, 'arbeit', 'plan.json')) || { termine: [], tagesziel: {} };
  const kandidaten = leseJson(p(root, 'quellen', 'kandidaten.json')) || { quellen: [] };
  const bib = parseBib(leseText(p(root, 'quellen', 'literatur.bib'), ''));
  const bibKeys = new Set(bib.map((b) => b.key));

  const arbeit = projekt.arbeit || {};
  const ms = zustand.meilensteine || {};
  const phaseId = PHASEN_IDS.includes(zustand.phase) ? zustand.phase : 'einrichtung';
  const phaseIndex = PHASEN_IDS.indexOf(phaseId);
  const phasen = PHASEN.map((ph, i) => ({
    ...ph,
    status: ms[ph.id]?.status || (i < phaseIndex ? 'erledigt' : i === phaseIndex ? 'aktiv' : 'offen'),
    datum: ms[ph.id]?.datum || null,
  }));

  // Kapitel mit gezählten Wörtern
  const hauptTitel = new Map((zustand.hauptkapitel || []).map((h) => [String(h.nr), h.titel]));
  const kapitel = (zustand.kapitel || []).map((k) => {
    const datei = k.datei ? p(root, ...k.datei.split('/')) : null;
    const vorhanden = datei ? existiert(datei) : false;
    const woerter = vorhanden ? zaehleWoerter(leseText(datei)) : 0;
    const ziel = Number(k.woerter_ziel) || 0;
    return {
      ...k,
      hauptkapitel: String(k.hauptkapitel ?? String(k.nr).split('.')[0]),
      hauptkapitel_titel: hauptTitel.get(String(k.hauptkapitel ?? String(k.nr).split('.')[0])) || '',
      vorhanden, woerter, woerter_ziel: ziel,
      prozent: ziel ? Math.round((woerter / ziel) * 100) : null,
      ueber_budget: ziel ? woerter > ziel * 1.1 : false,
      plan_vorhanden: existiert(p(root, 'arbeit', 'plaene', `plan-${k.nr}.md`)),
      pruefung_vorhanden: existiert(p(root, 'arbeit', 'pruefung', `pruefung-${k.nr}.md`)),
    };
  });
  // Kapiteldateien ohne Eintrag in zustand.json (z. B. selbst angelegt)
  const bekannt = new Set(kapitel.map((k) => (k.datei || '').split('/').pop()));
  // Sonderdateien 00-*.md (Abstract, Zusammenfassung) und 99-*.md (Hilfsmittel) sind keine Kapitel
  const istSonder = (n) => /^(00|99)-/.test(n);
  const kapitelDateien = dateienIn(p(root, 'arbeit', 'kapitel'), (n) => n.endsWith('.md'))
    .map((d) => ({ ...d, woerter: zaehleWoerter(leseText(p(root, 'arbeit', 'kapitel', d.name))) }));
  const kapitelOhneEintrag = kapitelDateien.filter((d) => !bekannt.has(d.name) && !istSonder(d.name));
  const sonderTexte = kapitelDateien.filter((d) => istSonder(d.name));

  const gesamt = kapitel.reduce((s, k) => s + k.woerter, 0) + kapitelOhneEintrag.reduce((s, k) => s + k.woerter, 0);
  const seitenMin = Number(arbeit.seiten?.min) || 0;
  const seitenMax = Number(arbeit.seiten?.max) || 0;
  let ziel = Number(arbeit.woerter_ziel) || 0;
  if (!ziel && (seitenMin || seitenMax)) ziel = Math.round(((seitenMin || seitenMax) + (seitenMax || seitenMin)) / 2 * WOERTER_PRO_SEITE);
  if (!ziel) ziel = kapitel.reduce((s, k) => s + (k.woerter_ziel || 0), 0);

  // Abgabe und Tagesziel
  const abgabeDatum = projekt.abgabe?.datum || '';
  const abgabeTage = tageBis(abgabeDatum);
  const erlaubt = new Set((plan.tagesziel?.arbeitstage?.length ? plan.tagesziel.arbeitstage : ['mo', 'di', 'mi', 'do', 'fr']));
  const tage = zustand.aktivitaet?.tage || {};
  const heuteT = heute();
  const heuteAkt = tage[heuteT] || { woerter: 0, quellen: 0, sessions: 0 };
  let tagesziel = null;
  const manuell = plan.tagesziel?.woerter_manuell;
  if (manuell) tagesziel = Number(manuell);
  else if (ziel && abgabeTage !== null && abgabeTage > 7) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const ende = parseDatum(abgabeDatum); ende.setDate(ende.getDate() - 7); // eine Woche Puffer
    // Wörter von heute zählen noch zum Rest, damit das Ziel über den Tag stabil bleibt
    const rest = Math.max(0, ziel - (gesamt - (heuteAkt.woerter || 0)));
    const at = arbeitstageZwischen(start, ende, erlaubt);
    tagesziel = at > 0 ? Math.ceil(rest / at / 10) * 10 : rest;
  }
  const serie = berechneSerie(tage, erlaubt);
  const letzte14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const t = heute(d);
    const e = tage[t] || {};
    letzte14.push({ tag: t, wochentag: WOCHENTAGE[d.getDay()], arbeitstag: erlaubt.has(WOCHENTAGE[d.getDay()]),
      woerter: e.woerter || 0, quellen: e.quellen || 0, sessions: e.sessions || 0 });
  }

  // Quellen
  const liste = (kandidaten.quellen || []).map((q) => {
    const pdfPfad = q.pdf || (q.bibkey ? `quellen/pdfs/${q.bibkey}.pdf` : null);
    const pdfDa = pdfPfad ? existiert(p(root, ...pdfPfad.split('/'))) : false;
    const zitate = zaehleZitate(root, q.bibkey) || Number(q.zitate) || 0;
    return { ...q, status: q.status || 'vorschlag', pdf: pdfDa ? pdfPfad : null, pdf_vorhanden: pdfDa,
      zitate, ausgewertet: !!q.ausgewertet || zitate > 0, in_bib: q.bibkey ? bibKeys.has(q.bibkey) : false };
  });
  const zaehler = { vorschlag: 0, genommen: 0, spaeter: 0, verworfen: 0 };
  for (const q of liste) zaehler[q.status] = (zaehler[q.status] || 0) + 1;
  // Bib-Einträge, die nicht im Board stehen (z. B. per Zotero importiert), zählen als genommen
  const boardKeys = new Set(liste.map((q) => q.bibkey).filter(Boolean));
  const nurBib = bib.filter((b) => !boardKeys.has(b.key)).map((b) => ({
    id: b.key, bibkey: b.key, titel: b.felder.title || b.key,
    autoren: (b.felder.author || '').split(/\s+and\s+/).filter(Boolean),
    jahr: Number(b.felder.year) || b.felder.year || '', venue: b.felder.journal || b.felder.booktitle || b.felder.publisher || '',
    doi: b.felder.doi || '', url: b.felder.url || '', status: 'genommen', herkunft: 'bib', stern: 0, markierungen: [],
    kapitel: [], relevanz: null, kurz: '', warum: '', notiz: '',
    zitate: zaehleZitate(root, b.key), pdf_vorhanden: existiert(p(root, 'quellen', 'pdfs', `${b.key}.pdf`)),
    in_bib: true,
  }));
  for (const q of nurBib) { q.ausgewertet = q.zitate > 0; zaehler.genommen++; }
  const alleQuellen = [...liste, ...nurBib];
  const eingang = dateienIn(p(root, 'quellen', 'eingang'));

  // Termine
  const termine = (plan.termine || []).map((t) => {
    const tb = tageBis(t.datum);
    return { ...t, tage: tb, ueberfaellig: !t.erledigt && tb !== null && tb < 0 };
  }).sort((a, b) => String(a.datum).localeCompare(String(b.datum)));

  // Sync
  // Letzter Sync ist gerätelokal (.git/scientific-writing-sync), siehe git-lage.mjs
  let git = { repo: false, remote: null, ungesichert: 0, letzterSync: null };
  try { git = gitLage(root); } catch {}
  const letzterSync = git.letzterSync || null;
  const syncTage = letzterSync ? Math.floor((Date.now() - Date.parse(letzterSync)) / 86400000) : null;
  const gitDa = git.repo;

  // Abzeichen
  const erreicht = new Map((zustand.abzeichen || []).map((a) => [a.id, a.datum]));
  const abzeichen = ABZEICHEN.map((a) => ({ id: a.id, name: a.name, beschreibung: a.beschreibung,
    datum: erreicht.get(a.id) || null, erreicht: erreicht.has(a.id) }));

  const pdfDatei = p(root, 'Arbeit.pdf');
  let pdf = { vorhanden: false, geaendert: null };
  try { pdf = { vorhanden: true, geaendert: fs.statSync(pdfDatei).mtime.toISOString() }; } catch {}

  const dok = (rel) => {
    const f = p(root, ...rel.split('/'));
    return existiert(f) ? { pfad: rel, woerter: zaehleWoerter(leseText(f)) } : null;
  };

  const stand = {
    schema: 1,
    erzeugt: new Date().toISOString(),
    heute: heuteT,
    root,
    version: kitVersion(root),
    projekt,
    eingerichtet: !!projekt.eingerichtet,
    titel: arbeit.titel || '',
    phase: phaseId,
    phaseIndex,
    phaseName: PHASEN[phaseIndex].name,
    phasen,
    naechster_schritt: zustand.naechster_schritt || (projekt.eingerichtet ? 'Weiter mit /weiter.' : 'Richte dein Projekt mit /start ein.'),
    naechster_command: projekt.eingerichtet ? '/weiter' : '/start',
    kapitel,
    hauptkapitel: zustand.hauptkapitel || [],
    kapitelOhneEintrag,
    sonderTexte,
    woerter: { gesamt, ziel, prozent: ziel ? Math.min(100, Math.round((gesamt / ziel) * 100)) : null, pro_seite: WOERTER_PRO_SEITE,
      seiten_geschaetzt: Math.round((gesamt / WOERTER_PRO_SEITE) * 10) / 10 },
    abgabe: { datum: abgabeDatum, tage: abgabeTage, beginn: projekt.abgabe?.beginn || '' },
    tagesziel: { woerter: tagesziel, heute: heuteAkt.woerter || 0, quellen_heute: heuteAkt.quellen || 0,
      erreicht: tagesziel ? (heuteAkt.woerter || 0) >= tagesziel : false, arbeitstage: [...erlaubt] },
    serie,
    letzte14,
    abzeichen,
    quellen: { liste: alleQuellen, zaehler, bib_anzahl: bib.length, eingang,
      ausgewertet: alleQuellen.filter((q) => q.ausgewertet).length },
    termine,
    plan: { tagesziel: plan.tagesziel || {} },
    sync: { letzter: letzterSync, tage: syncTage, git: gitDa, remote: git.remote, ungesichert: git.ungesichert,
      erinnern: gitDa && (syncTage === null || syncTage > 2) },
    verlauf: (zustand.verlauf || []).slice(0, 20),
    pdf,
    dokumente: {
      thema: dok('arbeit/thema/thema.md'),
      expose: dok('arbeit/expose/expose.md'),
      gliederung: dok('arbeit/gliederung/gliederung.md'),
      stil: dok('arbeit/stil.md'),
      tagebuch: dok('arbeit/tagebuch.md'),
      docs: dateienIn(p(root, 'docs'), (n) => n.endsWith('.md')).sort((a, b) => a.name.localeCompare(b.name)),
    },
    betreuung: dateienIn(p(root, 'arbeit', 'betreuung'), (n) => n.endsWith('.md')).slice(0, 10),
  };
  // Hilfsfunktion für Abzeichen-Bedingungen (nicht serialisiert)
  Object.defineProperty(stand, 'meilenstein', { enumerable: false, value: (id) => ms[id]?.status || 'offen' });
  return stand;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const s = ladeStand(findeRoot());
  if (process.argv.includes('--kurz')) {
    console.log(`${s.phaseName} (${s.phaseIndex + 1}/8) · ${s.woerter.gesamt} Wörter · ` +
      `${s.quellen.zaehler.genommen} Quellen · ${s.abgabe.tage == null ? 'Abgabedatum fehlt' : 'Abgabe in ' + s.abgabe.tage + ' Tagen'}`);
  } else console.log(JSON.stringify(s, null, 2));
}
