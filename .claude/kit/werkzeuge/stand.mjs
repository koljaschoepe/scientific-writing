#!/usr/bin/env node
// Aggregiert alle Projektdateien zu einem Lagebild. Liest nur, schreibt nie.
// Genutzt vom Dashboard, von den Hooks und von zustand.mjs (zeige).
//
// Export: ladeStand(root) -> Objekt (siehe unten und .claude/kit/dashboard/API.md), seitenJeKapitel (aus seiten.mjs),
//         zaehlePdfSeiten(datei)
// CLI: node .claude/kit/werkzeuge/stand.mjs [--kurz]

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  PHASEN, PHASEN_IDS, findeRoot, p, kit, existiert, leseJson, leseText, normStatus, erlaubteZiele, KAPITEL_STATUS,
  heute, tageBis, parseDatum, zaehleWoerter, parseBib, kitVersion, leseEinstellungen, lesePlan,
  EINSTELLUNGEN_DATEI, PLAN_DATEI, KAPITEL_ORDNER, NOTIZ_ORDNER,
} from './lib.mjs';
import { gitLageGecached } from './git-lage.mjs';
import { seitenJeKapitel, leseLetztenBau, WOERTER_PRO_SEITE } from './seiten.mjs';
import { nummerAusDateiname, nrTeile, nrTiefe, vergleicheNr } from './gliederung.mjs';
import { zitierStellen, normDoi, bibPdf } from './zitierstellen.mjs';
import { editorLage } from './editor.mjs';

export { seitenJeKapitel };

const arr = (x) => (Array.isArray(x) ? x : []);
const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
const txt = (x) => (typeof x === 'string' ? x : x == null ? '' : String(x));
const zahlDe = (n) => Number(n).toLocaleString('de-DE');

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
  const t = leseText(p(root, ...NOTIZ_ORDNER.split('/'), `${bibkey}.md`), '');
  return (t.match(/^##\s+Z\d+/gm) || []).length;
}

// Meilenstein erreicht = jedes genannte Kapitel (Nummer oder Hauptkapitel, "alle" = alle) hat mindestens den Status.
// Eine Nummer trifft die Einheit selbst und alle darunter (3.2 → 3.2, 3.2.1 …). Gibt es keine, gilt die Einheit,
// die sie enthält (Meilenstein 3.2, aber Kapitel 3 ist eine einzige Datei → Kapitel 3).
function meilensteinErreicht(m, kapitel) {
  const rang = (s) => KAPITEL_STATUS.indexOf(normStatus(s) || 'offen');
  const ziel = rang(m.status);
  let betroffen;
  if (m.kapitel.includes('alle')) betroffen = kapitel;
  else {
    const set = new Set();
    for (const n of m.kapitel) {
      let treffer = kapitel.filter((k) => k.nr === n || k.hauptkapitel === n || k.nr.startsWith(n + '.'));
      if (!treffer.length) {
        const eltern = kapitel.filter((k) => n.startsWith(k.nr + '.')).sort((a, b) => nrTiefe(b.nr) - nrTiefe(a.nr));
        treffer = eltern.slice(0, 1);
      }
      for (const k of treffer) set.add(k);
    }
    betroffen = [...set];
  }
  return betroffen.length > 0 && betroffen.every((k) => rang(k.status) >= ziel);
}

// Seitenzahl eines PDFs (Cache über mtime und Größe)
const pdfSeitenCache = new Map();
export function zaehlePdfSeiten(datei) {
  let st;
  try { st = fs.statSync(datei); } catch { return null; }
  const sig = `${st.mtimeMs}:${st.size}`;
  const c = pdfSeitenCache.get(datei);
  if (c && c.sig === sig) return c.wert;
  let wert = null;
  try {
    const roh = fs.readFileSync(datei);
    const s = roh.toString('latin1');
    const m = s.match(/\/Type\s*\/Page(?!s)/g);
    const zaehle = (t) => { const n = [...t.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g)].map((x) => Number(x[1] || x[2])); return n.length ? Math.max(...n) : null; };
    if (m) wert = m.length;
    else wert = zaehle(s);
    // Seitenbaum in komprimierten Objekt-Streams (Tectonic, pdfTeX ab 1.5): nur /ObjStm entpacken
    if (!wert) {
      for (const x of s.matchAll(/stream\r?\n/g)) {
        if (!/\/ObjStm/.test(s.slice(Math.max(0, x.index - 300), x.index))) continue;
        const ende = s.indexOf('endstream', x.index);
        try { const n = zaehle(zlib.inflateSync(roh.subarray(x.index + x[0].length, ende)).toString('latin1')); if (n) wert = Math.max(wert || 0, n); } catch {}
      }
    }
  } catch {}
  pdfSeitenCache.set(datei, { sig, wert });
  return wert;
}

const absForm = (root, rel) => { const s = path.resolve(root, ...String(rel).split('/')).split(path.sep).join('/'); return s.startsWith('/') ? s : '/' + s; };

// Arbeit.pdf bzw. Expose.pdf. Ist die Datei beim Bau in einem PDF-Programm geöffnet (Windows sperrt sie), schreibt
// pdf.mjs <Name>-neu.pdf daneben: dann gilt die neuere der beiden.
function pdfLage(root, name, { bau, quellen = [] } = {}) {
  const neu = name.replace(/\.pdf$/, '-neu.pdf');
  const st = (n) => { try { const x = fs.statSync(p(root, n)); return x.isFile() ? x : null; } catch { return null; } };
  const a = st(name), b = st(neu);
  const datei = a && b ? (b.mtimeMs > a.mtimeMs ? neu : name) : a ? name : b ? neu : null;
  if (!datei) return null;
  const s = datei === name ? a : b;
  const geaendert_seit = quellen.filter((q) => q.mtime > s.mtimeMs + 1000).map((q) => q.nr || q.datei);
  const seitenBau = bau && bau.pdf === datei && Number(bau.seiten) > 0 && Math.abs(Date.parse(bau.ende || 0) - s.mtimeMs) < 120000 ? Number(bau.seiten) : null;
  return {
    datei, url: `/datei/${datei}`, pfad_abs: absForm(root, datei), zeit: s.mtime.toISOString(),
    seiten: seitenBau ?? zaehlePdfSeiten(p(root, datei)), ausweich: datei === neu,
    veraltet: geaendert_seit.length > 0, geaendert_seit,
  };
}

function planMitZeitleiste(root, kapitel, abgabeDatum, einstellungen) {
  const plan = lesePlan(root);
  const mit = (x) => { const t = tageBis(x.datum); return { ...x, tage: t }; };
  const meilensteine = plan.meilensteine.map((m) => {
    const erreicht = meilensteinErreicht(m, kapitel);
    const x = mit(m);
    return { art: 'meilenstein', ...x, erreicht, erledigt: erreicht, ueberfaellig: !erreicht && x.tage !== null && x.tage < 0 };
  });
  const termine = plan.termine.map((t) => {
    const x = mit(t);
    return { art: 'termin', ...x, ueberfaellig: !t.erledigt && x.tage !== null && x.tage < 0 };
  });
  const zeitleiste = [...meilensteine, ...termine];
  const ad = parseDatum(abgabeDatum);
  if (ad) {
    const t = tageBis(ad);
    zeitleiste.push({ art: 'abgabe', id: 'abgabe', datum: heute(ad), zeit: '', text: 'Abgabe', erledigt: false,
      ueberfaellig: false, tage: t, zeile: einstellungen.zeilen?.['arbeit.abgabe'] || null, pfad: EINSTELLUNGEN_DATEI });
  }
  const rangArt = { meilenstein: 0, termin: 1, abgabe: 2 };
  zeitleiste.sort((a, b) => a.datum.localeCompare(b.datum) || (a.zeit || '').localeCompare(b.zeit || '') || rangArt[a.art] - rangArt[b.art]);
  return { pfad: PLAN_DATEI, vorhanden: plan.vorhanden, zeitleiste, meilensteine, termine, fehler: plan.fehler };
}

export function ladeStand(root = findeRoot()) {
  // Unlesbare JSON-Dateien: nie werfen und nie eine Vorlage unterschieben, sondern melden.
  const kaputt = [];
  const lies = (rel, vorlage, ersatz) => {
    try {
      const v = leseJson(p(root, ...rel.split('/')), undefined);
      if (v !== undefined) return obj(v);
      if (vorlage) { try { const w = leseJson(kit(root, 'vorlagen', 'arbeit', vorlage), undefined); if (w !== undefined) return obj(w); } catch {} }
      return ersatz;
    } catch {
      kaputt.push(rel);
      return ersatz;
    }
  };
  const einstellungen = leseEinstellungen(root);
  const zustand = lies('.arbeit/zustand.json', 'zustand.json', {});
  const kandidaten = lies('.arbeit/kandidaten.json', null, {});
  const bib = parseBib(leseText(p(root, 'quellen', 'literatur.bib'), ''));
  const bibKeys = new Set(bib.map((b) => b.key));
  const altesLayout = existiert(p(root, 'arbeit', 'projekt.json')) || existiert(p(root, 'arbeit', 'zustand.json'));

  const arbeit = einstellungen.arbeit;
  const ms = obj(zustand.meilensteine);
  const phaseId = PHASEN_IDS.includes(zustand.phase) ? zustand.phase : 'einrichtung';
  const phaseIndex = PHASEN_IDS.indexOf(phaseId);
  const phasen = PHASEN.map((ph, i) => ({
    ...ph,
    status: obj(ms[ph.id]).status || (i < phaseIndex ? 'erledigt' : i === phaseIndex ? 'aktiv' : 'offen'),
    datum: obj(ms[ph.id]).datum || null,
  }));

  // Schreibeinheiten aus zustand.json (beliebige Ebene: "3", "3.2", "3.2.1"), mit Umfang und Gliederung (seiten.mjs)
  const hauptListe = arr(zustand.hauptkapitel).filter((h) => h && h.nr != null);
  const hauptTitel = new Map(hauptListe.map((h) => [String(h.nr), txt(h.titel)]));
  const kapitelNamen = (() => { try { return fs.readdirSync(p(root, KAPITEL_ORDNER)).filter((n) => n.endsWith('.md') && !n.startsWith('.')); } catch { return []; } })();
  const basis = arr(zustand.kapitel).filter((k) => k && typeof k === 'object' && k.nr != null).map((k) => {
    const nr = String(k.nr);
    const haupt = String(k.hauptkapitel ?? nrTeile(nr)[0]);
    return { ...k, nr, hauptkapitel: haupt, status: normStatus(k.status) || 'offen',
      hauptkapitel_titel: hauptTitel.get(haupt) || (arr(zustand.kapitel).find((x) => String(x?.nr) === haupt)?.titel ?? '') };
  });
  // Umbenannte Datei (F): Eintrag zeigt ins Leere, aber genau eine freie Datei hat dieselbe Nummer → zuordnen.
  // check.mjs meldet das, check.mjs --reparieren bzw. zustand.mjs dateien-reparieren schreibt es fest.
  const dateiDa = (rel) => typeof rel === 'string' && rel && existiert(p(root, ...rel.split('/')));
  const vergeben = new Set(basis.filter((k) => dateiDa(k.datei)).map((k) => String(k.datei).split('/').pop()));
  for (const k of basis) {
    if (dateiDa(k.datei)) continue;
    const frei = kapitelNamen.filter((n) => !vergeben.has(n) && nummerAusDateiname(n) === k.nr);
    if (frei.length === 1) {
      k.datei_zustand = txt(k.datei) || null;
      k.datei = `${KAPITEL_ORDNER}/${frei[0]}`;
      k.datei_umbenannt = true;
      vergeben.add(frei[0]);
    }
  }
  const umfangRoh = seitenJeKapitel(root, { kapitel: basis, hauptkapitel: hauptListe, einstellungen: { seiten: arbeit.seiten }, fach: arbeit });
  const umfangNr = new Map(umfangRoh.kapitel.map((u) => [u.nr, u]));
  const kapitel = basis.map((k) => {
    const datei = typeof k.datei === 'string' && k.datei ? p(root, ...k.datei.split('/')) : null;
    let geaendert = null;
    try { geaendert = datei ? fs.statSync(datei).mtime.toISOString() : null; } catch {}
    const u = umfangNr.get(k.nr) || {};
    const gl = u.gliederung || null;
    const pruefung = `.arbeit/pruefung/pruefung-${k.nr}.md`;
    const pruefungDa = existiert(p(root, ...pruefung.split('/')));
    const titelZustand = txt(k.titel);
    const titel = gl?.titel || titelZustand;
    return {
      ...k,
      titel, titel_zustand: titelZustand, titel_abweichung: !!(gl?.titel && titelZustand && gl.titel !== titelZustand),
      ebene: nrTiefe(k.nr),
      vorhanden: !!geaendert, geaendert,
      datei_umbenannt: !!k.datei_umbenannt,
      kopf_fehlt: !!(geaendert && gl && gl.kopf_fehlt), kopf_zeile: gl?.kopf_zeile ?? null,
      abschnitte: gl ? gl.abschnitte : [],
      status_erlaubt: erlaubteZiele(k.status),
      woerter: u.woerter || 0, abbildungen: u.abbildungen || 0, tabellen: u.tabellen || 0, formeln: u.formeln || 0,
      anteil: u.anteil ?? null, anteil_gesetzt: !!u.anteil_gesetzt, seiten: u.seiten || null,
      woerter_ziel_min: u.woerter_ziel_min ?? null, woerter_ziel_max: u.woerter_ziel_max ?? null,
      woerter_ziel: u.woerter_ziel_max ? Math.round((u.woerter_ziel_min + u.woerter_ziel_max) / 2) : (Number(k.woerter_ziel) || 0),
      plan_vorhanden: existiert(p(root, '.arbeit', 'plaene', `plan-${k.nr}.md`)) || existiert(p(root, '.arbeit', 'plaene', `plan-${k.nr.replace(/\./g, '-')}.md`)),
      pruefung_vorhanden: pruefungDa, pruefung: pruefungDa ? pruefung : null,
    };
  }).sort((a, b) => vergleicheNr(a.nr, b.nr));
  for (const k of kapitel) { if (!k.datei_umbenannt) delete k.datei_zustand; }
  // Hauptkapiteltitel aus der Einleitungseinheit "3", falls zustand.hauptkapitel nichts sagt
  for (const k of kapitel) if (!hauptTitel.get(k.hauptkapitel)) k.hauptkapitel_titel = kapitel.find((x) => x.nr === k.hauptkapitel)?.titel || k.hauptkapitel_titel;

  // Gruppen: jede Nummer, unter der mindestens eine Einheit liegt (Hauptkapitel und Zwischenebenen), mit Summen.
  // titel aus zustand.hauptkapitel (gilt für jede Ebene), sonst aus der gleichnamigen Einheit.
  const rangStatus = (st) => KAPITEL_STATUS.indexOf(normStatus(st) || 'offen');
  const gruppenNr = new Set();
  for (const k of kapitel) { const t = nrTeile(k.nr); for (let i = 1; i < t.length; i++) gruppenNr.add(t.slice(0, i).join('.')); }
  const gruppen = [...gruppenNr].sort(vergleicheNr).map((g) => {
    const darin = kapitel.filter((k) => k.nr === g || k.nr.startsWith(g + '.'));
    const eigen = kapitel.find((k) => k.nr === g);
    const s = (f) => Math.round(darin.reduce((x, k) => x + (Number(f(k)) || 0), 0) * 10) / 10;
    const minStatus = darin.reduce((m, k) => (rangStatus(k.status) < rangStatus(m) ? k.status : m), 'final');
    return {
      nr: g, ebene: nrTiefe(g), titel: hauptTitel.get(g) || eigen?.titel || '', einheit: !!eigen,
      einheiten: darin.map((k) => k.nr), status: minStatus, woerter: s((k) => k.woerter), anteil: s((k) => k.anteil),
      seiten: { schaetzung: s((k) => k.seiten?.schaetzung), ziel_min: s((k) => k.seiten?.ziel_min), ziel_max: s((k) => k.seiten?.ziel_max),
        aktuell: s((k) => k.seiten?.echt ?? k.seiten?.schaetzung) },
    };
  });
  // Kapiteldateien ohne Eintrag in zustand.json zählen nicht zum Umfang (B5)
  const bekannt = new Set(kapitel.map((k) => txt(k.datei).split('/').pop()));
  for (const k of kapitel) if (k.datei_zustand) bekannt.add(String(k.datei_zustand).split('/').pop());
  const istSonder = (n) => /^(00|99)-/.test(n);
  const kapitelDateien = dateienIn(p(root, KAPITEL_ORDNER), (n) => n.endsWith('.md'))
    .map((d) => ({ ...d, datei: `${KAPITEL_ORDNER}/${d.name}`, woerter: zaehleWoerter(leseText(p(root, KAPITEL_ORDNER, d.name))) }));
  const kapitelOhneEintrag = kapitelDateien.filter((d) => !bekannt.has(d.name) && !istSonder(d.name));
  const sonderTexte = kapitelDateien.filter((d) => istSonder(d.name));

  // Das eine Umfangziel (B6): Seitenbereich aus den Einstellungen, Wörter nur umgerechnet.
  const g = umfangRoh.gesamt;
  const seitenMin = Number(arbeit.seiten.min) || 0, seitenMax = Number(arbeit.seiten.max) || 0;
  const zielText = seitenMin || seitenMax ? `Ziel laut Einstellungen ${seitenMin === seitenMax ? seitenMin : `${seitenMin} bis ${seitenMax}`} Seiten.` : 'Noch kein Seitenziel in den Einstellungen.';
  const teileErkl = [`${zahlDe(g.woerter)} Wörtern`];
  if (g.abbildungen) teileErkl.push(`${g.abbildungen} ${g.abbildungen === 1 ? 'Abbildung' : 'Abbildungen'}`);
  if (g.tabellen) teileErkl.push(`${g.tabellen} ${g.tabellen === 1 ? 'Tabelle' : 'Tabellen'}`);
  const herkunft = g.quelle === 'pdf' ? 'Seiten aus dem letzten PDF.'
    : `${g.quelle === 'gemischt' ? 'Teils aus dem letzten PDF, sonst geschätzt' : 'Geschätzt'} aus ${teileErkl.length > 1 ? teileErkl.slice(0, -1).join(', ') + ' und ' + teileErkl.at(-1) : teileErkl[0]}.`;
  const umfang = {
    seiten_min: seitenMin || null, seiten_max: seitenMax || null, seiten: g.seiten, woerter: g.woerter,
    abbildungen: g.abbildungen, tabellen: g.tabellen, formeln: g.formeln,
    woerter_pro_seite: WOERTER_PRO_SEITE, quelle: g.quelle, erklaerung: `${herkunft} ${zielText}`, bau: umfangRoh.bau,
  };
  const zielWoerter = seitenMin || seitenMax ? Math.round(((seitenMin || seitenMax) + (seitenMax || seitenMin)) / 2 * WOERTER_PRO_SEITE) : 0;

  // Abgabe
  const abgabeDatum = txt(einstellungen.abgabe.datum);
  const abgabeTage = tageBis(abgabeDatum);

  // Quellen. PDF: Feld pdf im Board, sonst quellen/pdfs/<bibkey>.pdf, sonst das file-Feld der bib (Zotero, JabRef).
  // Vorschläge ohne bibkey, deren DOI schon in der bib steht, sind dieselbe Quelle (D): bibkey ergänzt, zählt als genommen.
  const bibNachKey = new Map(bib.map((b) => [b.key, b]));
  const bibNachDoi = new Map();
  for (const b of bib) { const d = normDoi(b.felder.doi); if (d && !bibNachDoi.has(d)) bibNachDoi.set(d, b.key); }
  const pdfFuer = (key, eigen) => {
    if (typeof eigen === 'string' && eigen && existiert(p(root, ...eigen.split('/')))) return { rel: eigen, abs: absForm(root, eigen), herkunft: 'board' };
    if (key && existiert(p(root, 'quellen', 'pdfs', `${key}.pdf`))) { const rel = `quellen/pdfs/${key}.pdf`; return { rel, abs: absForm(root, rel), herkunft: 'ordner' }; }
    const f = key && bibNachKey.has(key) ? bibPdf(root, bibNachKey.get(key)) : null;
    return f ? { rel: f.rel, abs: f.rel ? absForm(root, f.rel) : f.abs.split(path.sep).join('/').replace(/^(?!\/)/, '/'), herkunft: 'bib' } : null;
  };
  const liste = arr(kandidaten.quellen).filter((q) => q && typeof q === 'object').map((q) => {
    let bibkey = typeof q.bibkey === 'string' ? q.bibkey : '';
    let ueberDoi = false;
    if (!bibkey || !bibNachKey.has(bibkey)) {
      const k = bibNachDoi.get(normDoi(q.doi));
      if (k) { bibkey = k; ueberDoi = true; }
    }
    const pdf = pdfFuer(bibkey, q.pdf);
    const zitate = zaehleZitate(root, bibkey) || Number(q.zitate) || 0;
    let status = typeof q.status === 'string' && q.status ? q.status : 'vorschlag';
    const extra = {};
    if (ueberDoi) { extra.bibkey_ueber_doi = true; if (status === 'vorschlag' || status === 'spaeter') { extra.status_board = status; status = 'genommen'; } }
    return { ...q, bibkey, status, ...extra,
      autoren: arr(q.autoren), kapitel: arr(q.kapitel), markierungen: arr(q.markierungen),
      pdf: pdf?.rel || null, pdf_vorhanden: !!pdf, pdf_abs: pdf?.abs || null, pdf_herkunft: pdf?.herkunft || null,
      zitate, ausgewertet: !!q.ausgewertet || zitate > 0, in_bib: bibkey ? bibKeys.has(bibkey) : false };
  });
  const zaehler = { vorschlag: 0, genommen: 0, spaeter: 0, verworfen: 0 };
  for (const q of liste) zaehler[q.status] = (zaehler[q.status] || 0) + 1;
  // Bib-Einträge, die nicht im Board stehen (z. B. per Zotero importiert), zählen als genommen
  const boardKeys = new Set(liste.map((q) => q.bibkey).filter(Boolean));
  const nurBib = bib.filter((b) => !boardKeys.has(b.key)).map((b) => {
    const pdf = pdfFuer(b.key, null);
    return {
      id: b.key, bibkey: b.key, titel: b.felder.title || b.key,
      autoren: (b.felder.author || '').split(/\s+and\s+/).filter(Boolean),
      jahr: Number(b.felder.year) || b.felder.year || '', venue: b.felder.journal || b.felder.booktitle || b.felder.publisher || '',
      doi: b.felder.doi || '', url: b.felder.url || '', status: 'genommen', herkunft: 'bib', stern: 0, markierungen: [],
      kapitel: [], relevanz: null, kurz: '', warum: '', notiz: '',
      zitate: zaehleZitate(root, b.key), pdf: pdf?.rel || null, pdf_vorhanden: !!pdf, pdf_abs: pdf?.abs || null,
      pdf_herkunft: pdf?.herkunft || null, in_bib: true,
    };
  });
  for (const q of nurBib) { q.ausgewertet = q.zitate > 0; zaehler.genommen++; }
  const alleQuellen = [...liste, ...nurBib];

  // Abgleich über die ganze Arbeit: was im Text zitiert wird, gegen bib, Notizen und PDFs
  const nrJeDatei = new Map(kapitel.filter((k) => k.datei).map((k) => [String(k.datei), k.nr]));
  const stellen = zitierStellen(root, (rel) => nrJeDatei.get(rel) || null);
  const notizDa = (key) => existiert(p(root, ...NOTIZ_ORDNER.split('/'), `${key}.md`));
  const pdfDa = new Map(alleQuellen.filter((q) => q.bibkey).map((q) => [q.bibkey, q.pdf_vorhanden]));
  const zitiert = [...stellen.keys()].sort();
  const kurzeStellen = (key) => stellen.get(key).map(({ datei, zeile, kapitel: nr }) => ({ datei, zeile, kapitel: nr }));
  const abgleich = {
    zitiert: zitiert.length,
    nicht_in_bib: zitiert.filter((k) => !bibKeys.has(k)).map((key) => ({ key, stellen: kurzeStellen(key) })),
    nie_zitiert: bib.map((b) => b.key).filter((k) => !stellen.has(k)),
    ohne_notiz: zitiert.filter((k) => bibKeys.has(k) && !notizDa(k)).map((key) => ({ key, stellen: kurzeStellen(key) })),
    ohne_pdf: zitiert.filter((k) => bibKeys.has(k) && !pdfDa.get(k)).map((key) => ({ key, stellen: kurzeStellen(key) })),
  };
  const eingang = dateienIn(p(root, 'quellen', 'eingang'));

  // Sync (letzter Sync ist gerätelokal, .lokal/sync.json, siehe git-lage.mjs)
  let git = { repo: false, remote: null, ungesichert: 0, letzterSync: null };
  try { git = gitLageGecached(root); } catch {}
  const letzterSync = git.letzterSync || null;
  const syncTage = letzterSync ? Math.floor((Date.now() - Date.parse(letzterSync)) / 86400000) : null;

  // PDFs (C): Arbeit und Exposé, jeweils die neuere von <Name>.pdf und <Name>-neu.pdf
  const bau = leseLetztenBau(root);
  const kapitelZeiten = kapitel.filter((k) => k.geaendert).map((k) => ({ nr: k.nr, mtime: Date.parse(k.geaendert) }));
  for (const rel of ['quellen/literatur.bib', '.arbeit/begriffe.md']) { try { kapitelZeiten.push({ datei: rel, mtime: fs.statSync(p(root, ...rel.split('/'))).mtimeMs }); } catch {} }
  let exposeZeit = [];
  try { exposeZeit = [{ datei: '.arbeit/expose/expose.md', mtime: fs.statSync(p(root, '.arbeit', 'expose', 'expose.md')).mtimeMs }]; } catch {}
  const pdfArbeit = pdfLage(root, 'Arbeit.pdf', { bau, quellen: kapitelZeiten });
  const pdfExpose = pdfLage(root, 'Expose.pdf', { quellen: exposeZeit });
  const pdf = { vorhanden: !!pdfArbeit, geaendert: pdfArbeit?.zeit || null, datei: pdfArbeit?.datei || null, arbeit: pdfArbeit, expose: pdfExpose };

  const dok = (rel) => {
    const f = p(root, ...rel.split('/'));
    return existiert(f) ? { pfad: rel, woerter: zaehleWoerter(leseText(f)) } : null;
  };

  const eingerichtet = !!einstellungen.eingerichtet;
  const stand = {
    schema: 1,
    erzeugt: new Date().toISOString(),
    heute: heute(),
    root,
    version: kitVersion(root),
    projekt: einstellungen,
    einstellungen_datei: EINSTELLUNGEN_DATEI,
    altes_layout: altesLayout,
    eingerichtet,
    titel: arbeit.titel || '',
    phase: phaseId,
    phaseIndex,
    phaseName: PHASEN[phaseIndex].name,
    phasen,
    naechster_schritt: (eingerichtet && /\/start ein\.?$/.test(txt(zustand.naechster_schritt)) ? '' : txt(zustand.naechster_schritt)) || (eingerichtet ? 'Weiter mit /weiter.' : 'Richte dein Projekt mit /start ein.'),
    naechster_command: eingerichtet ? '/weiter' : '/start',
    ...editorLage(einstellungen.editor),
    kapitel,
    gruppen,
    hauptkapitel: arr(zustand.hauptkapitel),
    kapitelOhneEintrag,
    sonderTexte,
    umfang,
    // nur aus Kompatibilität, maßgeblich ist umfang
    woerter: { gesamt: g.woerter, ziel: zielWoerter, prozent: zielWoerter ? Math.min(100, Math.round((g.woerter / zielWoerter) * 100)) : null,
      pro_seite: WOERTER_PRO_SEITE, seiten_geschaetzt: g.seiten },
    abgabe: { datum: abgabeDatum, tage: abgabeTage, beginn: txt(einstellungen.abgabe.beginn) },
    kaputt,
    quellen: { liste: alleQuellen, zaehler, bib_anzahl: bib.length, eingang,
      ausgewertet: alleQuellen.filter((q) => q.ausgewertet).length, abgleich },
    plan: planMitZeitleiste(root, kapitel, abgabeDatum, einstellungen),
    sync: { letzter: letzterSync, tage: syncTage, git: git.repo, remote: git.remote, ungesichert: git.ungesichert,
      erinnern: git.repo && (syncTage === null || syncTage > 2) },
    verlauf: arr(zustand.verlauf).slice(0, 20),
    pdf,
    dokumente: {
      thema: dok('.arbeit/thema/thema.md'),
      expose: dok('.arbeit/expose/expose.md'),
      gliederung: dok('.arbeit/gliederung/gliederung.md'),
      stil: dok('.arbeit/stil.md'),
      tagebuch: dok('.arbeit/tagebuch.md'),
      docs: dateienIn(kit(root, 'docs'), (n) => n.endsWith('.md')).sort((a, b) => a.name.localeCompare(b.name))
        .map((d) => ({ ...d, pfad: `.claude/kit/docs/${d.name}` })),
    },
    betreuung: dateienIn(p(root, '.arbeit', 'betreuung'), (n) => n.endsWith('.md')).slice(0, 10),
  };
  return stand;
}

if (process.argv[1] && (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })()) {
  const s = ladeStand(findeRoot());
  if (process.argv.includes('--kurz')) {
    const u = s.umfang;
    const ziel = u.seiten_max ? ` von ${u.seiten_min === u.seiten_max ? u.seiten_max : `${u.seiten_min}-${u.seiten_max}`}` : '';
    console.log(`${s.phaseName} (${s.phaseIndex + 1}/8) · ca. ${u.seiten}${ziel} Seiten (${u.woerter} Wörter) · ` +
      `${s.quellen.zaehler.genommen} Quellen · ${s.abgabe.tage == null ? 'Abgabedatum fehlt' : 'Abgabe in ' + s.abgabe.tage + ' Tagen'}`);
    if (s.kaputt.length) console.log(`Beschädigt: ${s.kaputt.join(', ')}`);
  } else console.log(JSON.stringify(s, null, 2));
}
