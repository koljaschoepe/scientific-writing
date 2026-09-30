#!/usr/bin/env node
// Aggregiert alle Projektdateien zu einem Lagebild. Liest nur, schreibt nie.
// Genutzt vom Dashboard, von den Hooks und von zustand.mjs (Abzeichen).
//
// Export: ladeStand(root) → Objekt (siehe unten), CLI: node kit/werkzeuge/stand.mjs [--kurz]

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  PHASEN, PHASEN_IDS, WOCHENTAGE, findeRoot, p, existiert, leseJson, leseText, JsonKaputt,
  heute, tageBis, parseDatum, zaehleWoerter, parseBib, kitVersion, leseAktivitaet, gitToplevelIstRoot,
} from './lib.mjs';
import { gitLage } from './git-lage.mjs';

// Dezente Abzeichen. bedingung(stand) bekommt das Ergebnis von ladeStand().
// Sie werden nicht gespeichert, sondern bei jedem Lesen abgeleitet (siehe abzeichenAbleiten).
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

const arr = (x) => (Array.isArray(x) ? x : []);
const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
const txt = (x) => (typeof x === 'string' ? x : x == null ? '' : String(x));
const isoTag = (x) => { const d = parseDatum(txt(x)); return d ? heute(d) : null; };
const mtimeTag = (datei) => { try { return heute(fs.statSync(datei).mtime); } catch { return null; } };

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
  const aktiv = (t) => istAktiv(tage[t]);
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

function istAktiv(e) {
  return !!e && ((e.woerter || 0) > 0 || (e.quellen || 0) > 0 || (e.aenderungen || 0) > 0 || (e.commits || 0) > 0 || !!e.kapitel || (e.sessions || 0) > 0);
}

// Erster Tag, an dem eine Serie von n Arbeitstagen erreicht war (für das Abzeichen serie-5).
function ersterSerienTag(tage, erlaubt, n) {
  const liste = Object.keys(tage).filter((t) => istAktiv(tage[t])).sort();
  if (!liste.length) return null;
  const d = parseDatum(liste[0]); const ende = new Date(); ende.setHours(0, 0, 0, 0);
  let serie = 0;
  for (let i = 0; d <= ende && i < 800; i++, d.setDate(d.getDate() + 1)) {
    const t = heute(d);
    if (istAktiv(tage[t])) { serie++; if (serie >= n) return t; }
    else if (erlaubt.has(WOCHENTAGE[d.getDay()])) serie = 0;
  }
  return null;
}

// Commit-Tage der Person aus git log (schnell, ohne Netz). Fehler werden toleriert.
function commitTage(root, tageZurueck = 400) {
  const tage = {};
  try {
    if (!gitToplevelIstRoot(root)) return tage;
    const opt = { cwd: root, encoding: 'utf8', timeout: 4000, stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true, maxBuffer: 16 * 1024 * 1024 };
    let mail = '';
    try { mail = execFileSync('git', ['config', '--get', 'user.email'], opt).trim().toLowerCase(); } catch {}
    const aus = execFileSync('git', ['log', `--since=${tageZurueck}.days`, '--format=%cs%x09%ae%x09%s'], opt);
    for (const zeile of aus.split('\n')) {
      const [tag, ae, betreff = ''] = zeile.split('\t');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tag || '')) continue;
      if (/^Kit-Update/.test(betreff)) continue; // nicht die Arbeit der Person
      if (mail && ae && ae.toLowerCase() !== mail) continue;
      tage[tag] = (tage[tag] || 0) + 1;
    }
  } catch {}
  return tage;
}

// Datum = frühestes belegbares Datum, sonst null. Liest nur.
function abzeichenAbleiten(root, stand, belege) {
  const { zustand, ms, quellenListe, tage, erlaubt } = belege;
  const frueh = (...werte) => werte.flat().map(isoTag).filter(Boolean).sort()[0] || null;
  // Alte, früher gespeicherte Abzeichen (zustand.json bis v2.0) gelten weiter als Beleg.
  const alt = new Map(arr(zustand.abzeichen).filter((a) => a && a.id).map((a) => [a.id, a.datum]));
  const verlauf = arr(zustand.verlauf).filter((v) => v && typeof v.was === 'string');
  const ausVerlauf = (re) => verlauf.filter((v) => re.test(v.was)).map((v) => v.datum);
  const genommen = quellenListe.filter((q) => q.status === 'genommen')
    .map((q) => isoTag(q.entschieden) || isoTag(q.hinzugefuegt)).filter(Boolean).sort();
  let zitateTag = null;
  try {
    const ordner = p(root, 'quellen', 'zitate');
    zitateTag = fs.readdirSync(ordner).filter((n) => n.endsWith('.md'))
      .map((n) => mtimeTag(path.join(ordner, n))).filter(Boolean).sort()[0] || null;
  } catch {}
  const ms_ = (id) => obj(ms[id]).datum;
  const belegFuer = {
    'eingerichtet': [ms_('einrichtung'), ausVerlauf(/^Projekt eingerichtet/)],
    'forschungsfrage': [ms_('thema')],
    'erste-quelle': [genommen[0]],
    'zehn-quellen': [genommen.length >= 10 ? genommen[9] : null],
    'erste-auswertung': [zitateTag],
    'expose-fertig': [ms_('expose')],
    'gliederung-steht': [ms_('gliederung')],
    'erstes-kapitel': [ausVerlauf(/^Kapitel .*freigegeben/)],
    'serie-5': [ersterSerienTag(tage, erlaubt, 5)],
    'erstes-pdf': [stand.pdf.geaendert],
    'alles-geprueft': [ms_('pruefen')],
    'abgegeben': [ms_('abgabe')],
  };
  return ABZEICHEN.map((a) => {
    let erfuellt = false;
    try { erfuellt = !!a.bedingung(stand); } catch { erfuellt = false; }
    const erreicht = erfuellt || alt.has(a.id);
    const datum = erreicht ? frueh(alt.get(a.id), ausVerlauf(new RegExp(`^Abzeichen: ${a.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)), belegFuer[a.id] || []) : null;
    return { id: a.id, name: a.name, beschreibung: a.beschreibung, datum, erreicht };
  });
}

export function ladeStand(root = findeRoot()) {
  // Unlesbare JSON-Dateien: nie werfen und nie eine Vorlage unterschieben, sondern melden.
  const kaputt = [];
  const lies = (rel, vorlage, ersatz) => {
    try {
      const v = leseJson(p(root, ...rel.split('/')), undefined);
      if (v !== undefined) return obj(v);
      if (vorlage) { try { const w = leseJson(p(root, 'kit', 'vorlagen', 'arbeit', vorlage), undefined); if (w !== undefined) return obj(w); } catch {} }
      return ersatz;
    } catch (e) {
      kaputt.push(rel);
      return ersatz;
    }
  };
  const projekt = lies('arbeit/projekt.json', 'projekt.json', {});
  const zustand = lies('arbeit/zustand.json', 'zustand.json', {});
  const plan = lies('arbeit/plan.json', null, {});
  const kandidaten = lies('quellen/kandidaten.json', null, {});
  const bib = parseBib(leseText(p(root, 'quellen', 'literatur.bib'), ''));
  const bibKeys = new Set(bib.map((b) => b.key));

  const arbeit = obj(projekt.arbeit);
  const ms = obj(zustand.meilensteine);
  const phaseId = PHASEN_IDS.includes(zustand.phase) ? zustand.phase : 'einrichtung';
  const phaseIndex = PHASEN_IDS.indexOf(phaseId);
  const phasen = PHASEN.map((ph, i) => ({
    ...ph,
    status: obj(ms[ph.id]).status || (i < phaseIndex ? 'erledigt' : i === phaseIndex ? 'aktiv' : 'offen'),
    datum: obj(ms[ph.id]).datum || null,
  }));

  // Kapitel mit gezählten Wörtern
  const hauptTitel = new Map(arr(zustand.hauptkapitel).filter((h) => h && h.nr != null).map((h) => [String(h.nr), txt(h.titel)]));
  const kapitel = arr(zustand.kapitel).filter((k) => k && typeof k === 'object' && k.nr != null).map((k) => {
    const datei = typeof k.datei === 'string' && k.datei ? p(root, ...k.datei.split('/')) : null;
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
  const bekannt = new Set(kapitel.map((k) => txt(k.datei).split('/').pop()));
  // Sonderdateien 00-*.md (Abstract, Zusammenfassung) und 99-*.md (Hilfsmittel) sind keine Kapitel
  const istSonder = (n) => /^(00|99)-/.test(n);
  const kapitelDateien = dateienIn(p(root, 'arbeit', 'kapitel'), (n) => n.endsWith('.md'))
    .map((d) => ({ ...d, woerter: zaehleWoerter(leseText(p(root, 'arbeit', 'kapitel', d.name))) }));
  const kapitelOhneEintrag = kapitelDateien.filter((d) => !bekannt.has(d.name) && !istSonder(d.name));
  const sonderTexte = kapitelDateien.filter((d) => istSonder(d.name));

  const gesamt = kapitel.reduce((s, k) => s + k.woerter, 0) + kapitelOhneEintrag.reduce((s, k) => s + k.woerter, 0);
  const seitenMin = Number(obj(arbeit.seiten).min) || 0;
  const seitenMax = Number(obj(arbeit.seiten).max) || 0;
  let ziel = Number(arbeit.woerter_ziel) || 0;
  if (!ziel && (seitenMin || seitenMax)) ziel = Math.round(((seitenMin || seitenMax) + (seitenMax || seitenMin)) / 2 * WOERTER_PRO_SEITE);
  if (!ziel) ziel = kapitel.reduce((s, k) => s + (k.woerter_ziel || 0), 0);

  // Abgabe und Tagesziel
  const abgabeDatum = txt(obj(projekt.abgabe).datum);
  const abgabeTage = tageBis(abgabeDatum);
  const tz = obj(plan.tagesziel);
  const arbeitstage = arr(tz.arbeitstage).filter((t) => WOCHENTAGE.includes(t));
  const erlaubt = new Set(arbeitstage.length ? arbeitstage : ['mo', 'di', 'mi', 'do', 'fr']);

  // Aktivität: gerätelokal (.lokal/aktivitaet.json) + Commit-Tage + Änderungszeit der Kapitel.
  // Alte Tagesaktivität aus zustand.json (bis v2.0) zählt mit, bis sie migriert ist.
  const tage = {};
  const tag = (t) => (tage[t] ??= { woerter: 0, quellen: 0, aenderungen: 0, commits: 0, kapitel: false });
  for (const [t, e] of Object.entries(obj(obj(zustand.aktivitaet).tage))) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) continue;
    const x = tag(t); const y = obj(e);
    x.woerter += Number(y.woerter) || 0; x.quellen += Number(y.quellen) || 0; x.aenderungen += Number(y.sessions) || 0;
  }
  for (const [t, e] of Object.entries(obj(leseAktivitaet(root).tage))) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) continue;
    const x = tag(t); const y = obj(e);
    x.woerter += Number(y.woerter) || 0; x.quellen += Number(y.quellen) || 0; x.aenderungen += Number(y.aenderungen) || 0;
  }
  for (const [t, n] of Object.entries(commitTage(root))) tag(t).commits += n;
  for (const d of kapitelDateien) { const t = d.geaendert ? heute(new Date(d.geaendert)) : null; if (t) tag(t).kapitel = true; }
  const heuteT = heute();
  const heuteAkt = tage[heuteT] || { woerter: 0, quellen: 0, aenderungen: 0, commits: 0 };
  let tagesziel = null;
  const manuell = tz.woerter_manuell;
  if (manuell && Number(manuell) > 0) tagesziel = Number(manuell);
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
    // sessions bleibt aus Kompatibilität: Zahl der Aktivitätsbelege (Änderungen, Commits, Kapitel geändert)
    letzte14.push({ tag: t, wochentag: WOCHENTAGE[d.getDay()], arbeitstag: erlaubt.has(WOCHENTAGE[d.getDay()]),
      woerter: e.woerter || 0, quellen: e.quellen || 0, aenderungen: e.aenderungen || 0, commits: e.commits || 0,
      sessions: (e.aenderungen || 0) + (e.commits || 0) + (e.kapitel ? 1 : 0) });
  }

  // Quellen
  const liste = arr(kandidaten.quellen).filter((q) => q && typeof q === 'object').map((q) => {
    const bibkey = typeof q.bibkey === 'string' ? q.bibkey : '';
    const pdfPfad = (typeof q.pdf === 'string' && q.pdf) || (bibkey ? `quellen/pdfs/${bibkey}.pdf` : null);
    const pdfDa = pdfPfad ? existiert(p(root, ...pdfPfad.split('/'))) : false;
    const zitate = zaehleZitate(root, bibkey) || Number(q.zitate) || 0;
    return { ...q, status: typeof q.status === 'string' && q.status ? q.status : 'vorschlag',
      autoren: arr(q.autoren), kapitel: arr(q.kapitel), markierungen: arr(q.markierungen),
      pdf: pdfDa ? pdfPfad : null, pdf_vorhanden: pdfDa,
      zitate, ausgewertet: !!q.ausgewertet || zitate > 0, in_bib: bibkey ? bibKeys.has(bibkey) : false };
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
  const termine = arr(plan.termine).filter((t) => t && typeof t === 'object').map((t) => {
    const tb = tageBis(t.datum);
    return { ...t, tage: tb, ueberfaellig: !t.erledigt && tb !== null && tb < 0 };
  }).sort((a, b) => String(a.datum).localeCompare(String(b.datum)));

  // Sync
  // Letzter Sync ist gerätelokal (.lokal/sync.json), siehe git-lage.mjs
  let git = { repo: false, remote: null, ungesichert: 0, letzterSync: null };
  try { git = gitLage(root); } catch {}
  const letzterSync = git.letzterSync || null;
  const syncTage = letzterSync ? Math.floor((Date.now() - Date.parse(letzterSync)) / 86400000) : null;
  const gitDa = git.repo;

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
    naechster_schritt: (projekt.eingerichtet && /\/start ein\.?$/.test(txt(zustand.naechster_schritt)) ? '' : txt(zustand.naechster_schritt)) || (projekt.eingerichtet ? 'Weiter mit /weiter.' : 'Richte dein Projekt mit /start ein.'),
    naechster_command: projekt.eingerichtet ? '/weiter' : '/start',
    kapitel,
    hauptkapitel: arr(zustand.hauptkapitel),
    kapitelOhneEintrag,
    sonderTexte,
    woerter: { gesamt, ziel, prozent: ziel ? Math.min(100, Math.round((gesamt / ziel) * 100)) : null, pro_seite: WOERTER_PRO_SEITE,
      seiten_geschaetzt: Math.round((gesamt / WOERTER_PRO_SEITE) * 10) / 10 },
    abgabe: { datum: abgabeDatum, tage: abgabeTage, beginn: txt(obj(projekt.abgabe).beginn) },
    tagesziel: { woerter: tagesziel, heute: heuteAkt.woerter || 0, quellen_heute: heuteAkt.quellen || 0,
      erreicht: tagesziel ? (heuteAkt.woerter || 0) >= tagesziel : false, arbeitstage: [...erlaubt] },
    serie,
    letzte14,
    abzeichen: [],
    kaputt,
    quellen: { liste: alleQuellen, zaehler, bib_anzahl: bib.length, eingang,
      ausgewertet: alleQuellen.filter((q) => q.ausgewertet).length },
    termine,
    plan: { tagesziel: tz },
    sync: { letzter: letzterSync, tage: syncTage, git: gitDa, remote: git.remote, ungesichert: git.ungesichert,
      erinnern: gitDa && (syncTage === null || syncTage > 2) },
    verlauf: arr(zustand.verlauf).slice(0, 20),
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
  Object.defineProperty(stand, 'meilenstein', { enumerable: false, value: (id) => obj(ms[id]).status || 'offen' });
  stand.abzeichen = abzeichenAbleiten(root, stand, { zustand, ms, quellenListe: alleQuellen, tage, erlaubt });
  return stand;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const s = ladeStand(findeRoot());
  if (process.argv.includes('--kurz')) {
    console.log(`${s.phaseName} (${s.phaseIndex + 1}/8) · ${s.woerter.gesamt} Wörter · ` +
      `${s.quellen.zaehler.genommen} Quellen · ${s.abgabe.tage == null ? 'Abgabedatum fehlt' : 'Abgabe in ' + s.abgabe.tage + ' Tagen'}`);
    if (s.kaputt.length) console.log(`Beschädigt: ${s.kaputt.join(', ')}`);
  } else console.log(JSON.stringify(s, null, 2));
}
