// Umfang in Seiten je Schreibeinheit: Schätzung aus dem Text, echte Seiten aus dem letzten PDF-Bau.
// Liest nur. Genutzt von stand.mjs (und darüber von Dashboard, Hooks, zustand.mjs zeige).
//
// Schätzung = Wörter / 300 + 0,5 je Abbildung + 0,3 je Tabelle + 0,1 je abgesetzter Formel.
// Echt = Seiten laut Inhaltsverzeichnis des letzten erfolgreichen Baus (.lokal/letzter-bau.toc). pdf.mjs schreibt je
// Einheit eine Marke \kitEinheit{nr}{seite} ins Inhaltsverzeichnis, dadurch passt die Zuordnung auch bei Lücken in
// der Nummerierung und auf jeder Ebene. Ist eine Einheit seit dem Bau geändert (oder neu, oder leer geworden), gelten
// ihre und alle späteren echten Seiten als veraltet, denn sie haben sich verschoben.
// Ziel je Einheit = Seitenbereich aus .arbeit/einstellungen.md × Anteil der Einheit.
// Anteil: zustand.json kapitel[].anteil (Prozent des Ganzen) gilt fest. Sonst bekommt jedes Hauptkapitel einen Anteil
// je Kapiteltyp (ANTEIL_JE_TYP, Naturwissenschaft: ANTEIL_NATUR), optional fest über zustand.hauptkapitel[].anteil.
// Innerhalb eines Hauptkapitels verteilt sich der Anteil hierarchisch: gleich auf die Untereinheiten einer Ebene,
// eine Einleitungseinheit ("3" neben "3.1", "3.2") bekommt nur ein kleines Gewicht (EINLEITUNG_GEWICHT). Hat sie selbst
// Unterabschnitte der nächsten Ebene ("3" enthält 3.1, "3.2" ist eigene Datei), zählt jeder davon wie eine Untereinheit.
//
// Exporte: WOERTER_PRO_SEITE, ANTEIL_JE_TYP, ANTEIL_NATUR, typVon(titel), istNaturwissenschaft(fach),
//          zaehleElemente(md), schaetzeSeiten(woerter, el), leseToc(root), leseLetztenBau(root), seitenJeKapitel(root, stand?)

import fs from 'node:fs';
import { p, leseText, zaehleWoerter, leseEinstellungen } from './lib.mjs';
import { gliederung, nrTeile, nrTiefe, vergleicheNr } from './gliederung.mjs';

export const WOERTER_PRO_SEITE = 300;
export const EINLEITUNG_GEWICHT = 0.15;

// Erkennung des Kapiteltyps aus dem Titel, in dieser Reihenfolge. Grundlage: leitfaeden/struktur/gewichtung.md
const TYP_MUSTER = [
  ['einleitung', /einleitung|einführung|introduction|motivation/i],
  ['fazit', /^(fazit|schluss|zusammenfassung|ausblick|conclusion|outlook|summary)\b|\b(fazit|ausblick|schlussfolgerung\w*|schlussbetrachtung|schlusswort|conclusions?|outlook)\b/i],
  ['grundlagen', /grundlage|theorie|theoret|stand der|literatur|hintergrund|background|kenntnisstand/i],
  ['methodik', /method|material|experiment|vorgehen|versuch|daten und|aufbau|durchführung|synthese|präparativ/i],
  ['ergebnisse', /ergebnis|result|befund|auswertung|analyse/i],
  ['diskussion', /diskussion|discussion|interpretation|empfehlung/i],
];
export function typVon(titel) {
  const t = String(titel || '');
  return TYP_MUSTER.find(([, m]) => m.test(t))?.[0] || null;
}

// Gewichte je Kapiteltyp (Prozent, werden auf 100 normiert)
export const ANTEIL_JE_TYP = { einleitung: 9, grundlagen: 22, methodik: 15, ergebnisse: 25, diskussion: 17, fazit: 8 };
// Naturwissenschaft (Chemie, Physik, Biologie …): Ergebnisse und Diskussion zusammen 45 %
export const ANTEIL_NATUR = { einleitung: 8, grundlagen: 20, methodik: 20, ergebnisse: 45, diskussion: 20, fazit: 7 };
const ANTEIL_SONST = 20;

const NATUR_FACH = /chemi|physik|biolog|biochem|bio\b|pharma|geowiss|geolog|mineralog|material|werkstoff|naturwiss|lebensmittel|umweltwiss|astronom/i;
export function istNaturwissenschaft(fach = {}) {
  return String(fach.fachprofil || '').toLowerCase() === 'naturwissenschaft' || NATUR_FACH.test(String(fach.fachgebiet || ''));
}

const runde = (x, schritt = 0.1) => Math.round(x / schritt) * schritt;
const r1 = (x) => Math.round(x * 10) / 10;

export function zaehleElemente(md) {
  const t = String(md || '').replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '').replace(/```[\s\S]*?```/g, '');
  const abbildungen = (t.match(/!\[[^\]]*\]\([^)]*\)/g) || []).length + (t.match(/\\includegraphics/g) || []).length;
  const pipeTabellen = (t.match(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/gm) || []).length;
  const texTabellen = (t.match(/\\begin\{(table|longtable)\}/g) || []).length;
  const formeln = (t.match(/\$\$[\s\S]*?\$\$/g) || []).length + (t.match(/\\begin\{(equation|align|gather|multline)\*?\}/g) || []).length;
  return { abbildungen, tabellen: pipeTabellen + texTabellen, formeln };
}

export function schaetzeSeiten(woerter, el = {}) {
  return r1((Number(woerter) || 0) / WOERTER_PRO_SEITE + 0.5 * (el.abbildungen || 0) + 0.3 * (el.tabellen || 0) + 0.1 * (el.formeln || 0));
}

// .lokal/letzter-bau.toc (sonst .lokal/build/main.toc) -> { mtime, eintraege: [{ ebene, nr, titel, seite }], marken: [{ nr, seite }] }
const EBENE = { part: -1, chapter: 0, section: 1, subsection: 2, subsubsection: 3, paragraph: 4 };
export function leseToc(root) {
  let text = '', mtime = 0;
  for (const datei of [p(root, '.lokal', 'letzter-bau.toc'), p(root, '.lokal', 'build', 'main.toc')]) {
    try { text = fs.readFileSync(datei, 'utf8'); mtime = fs.statSync(datei).mtimeMs; break; } catch { /* nächste */ }
  }
  if (!text) return null;
  const eintraege = [], marken = [];
  const zahl = (s) => (/^\d+$/.test(String(s).trim()) ? Number(String(s).trim()) : null);
  for (const z of text.split(/\r?\n/)) {
    const t = z.trim();
    const mk = /^\\kitEinheit\s*\{([^{}]*)\}\s*\{([^{}]*)\}/.exec(t);
    if (mk) { marken.push({ nr: mk[1].trim(), seite: zahl(mk[2]) }); continue; }
    // mit hyperref vier Gruppen ({ebene}{titel}{seite}{anker}), ohne drei
    const m = /^\\contentsline\s*\{(\w+)\}\{(.*)\}\{([^{}]*)\}\{[^{}]*\}%?\s*$/.exec(t) || /^\\contentsline\s*\{(\w+)\}\{(.*)\}\{([^{}]*)\}%?\s*$/.exec(t);
    if (!m) continue;
    const nr = /\\numberline\s*\{([^{}]*)\}/.exec(m[2]);
    eintraege.push({ ebene: EBENE[m[1]] ?? 5, nr: nr ? nr[1].trim() : null, titel: m[2].replace(/\\numberline\s*\{[^{}]*\}/, '').trim(), seite: zahl(m[3]) });
  }
  return { mtime, eintraege, marken };
}

// .lokal/letzter-bau.json (pdf.mjs nach jedem erfolgreichen Bau): { start, ende, modus, pdf, seiten, einheiten }
export function leseLetztenBau(root) {
  try { const j = JSON.parse(fs.readFileSync(p(root, '.lokal', 'letzter-bau.json'), 'utf8')); return j && typeof j === 'object' ? j : null; } catch { return null; }
}

// Echte Seiten aus den Marken: von der eigenen Marke bis zur nächsten (die Endmarke "ende" steht auf der letzten Textseite)
function seitenAusMarken(marken) {
  const seiten = new Map();
  marken.forEach((m, i) => {
    if (m.nr === 'ende' || m.seite === null) return;
    const n = marken.slice(i + 1).find((x) => x.seite !== null);
    if (!n) return;
    const d = n.nr === 'ende' ? n.seite - m.seite + 1 : n.seite - m.seite;
    if (d >= 0) seiten.set(m.nr, Math.max(0.5, d));
  });
  return seiten;
}

// Rückfall für Bauten ohne Marken (vor 3.0): Seiten je Nummer vom eigenen Eintrag bis zum nächsten Eintrag, der auf
// gleicher oder höherer Ebene steht oder selbst eine Einheit ist. Stimmt nur, solange die Nummern lückenlos sind.
function seitenAusNummern(toc, nummern) {
  const seiten = new Map();
  const e = toc.eintraege;
  e.forEach((x, i) => {
    if (!x.nr || !nummern.has(x.nr) || x.seite === null) return;
    for (let j = i + 1; j < e.length; j++) {
      const y = e[j];
      if (y.ebene <= x.ebene || (y.nr && nummern.has(y.nr))) {
        if (y.seite !== null && y.seite >= x.seite) seiten.set(x.nr, Math.max(0.5, y.seite - x.seite));
        return;
      }
    }
  });
  return seiten;
}

const gesetzterWert = (x) => (x !== null && x !== undefined && x !== '' && Number.isFinite(Number(x)) ? Number(x) : null);

// Anteile in Prozent je Einheit (Summe 100, außer alle sind fest gesetzt). Siehe Kopfkommentar.
// kapitel: [{ nr, hauptkapitel, titel, hauptkapitel_titel, anteil }], hauptAnteile: Map(hauptkapitel → Prozent)
function anteile(kapitel, { natur = false, hauptAnteile = new Map() } = {}) {
  const gruppen = new Map();
  for (const k of kapitel) { if (!gruppen.has(k.hauptkapitel)) gruppen.set(k.hauptkapitel, []); gruppen.get(k.hauptkapitel).push(k); }
  const titelVon = (h, ks) => ks[0].hauptkapitel_titel || ks.find((k) => k.nr === h)?.titel || ks[0].titel || '';
  const typen = new Map([...gruppen].map(([h, ks]) => [h, typVon(titelVon(h, ks))]));
  const tabelle = natur ? { ...ANTEIL_NATUR } : { ...ANTEIL_JE_TYP };
  // Naturwissenschaft: Ergebnisse und Diskussion zusammen 45 %, getrennt 25 + 20
  if (natur && [...typen.values()].includes('diskussion') && [...typen.values()].includes('ergebnisse')) tabelle.ergebnisse = 25;

  const erg = new Map();
  const gesetzt = new Set();
  for (const k of kapitel) { const v = gesetzterWert(k.anteil); if (v !== null) { erg.set(k.nr, v); gesetzt.add(k.nr); } }

  // Betrag je Hauptkapitel für die freien Einheiten
  let fest = [...erg.values()].reduce((s, x) => s + x, 0);
  const frei = new Map(); // h -> { betrag (fest) | gewicht (Typ) }
  for (const [h, ks] of gruppen) {
    const freie = ks.filter((k) => !gesetzt.has(k.nr));
    if (!freie.length) continue;
    const festH = gesetzterWert(hauptAnteile.get(h));
    if (festH !== null) {
      const imH = ks.filter((k) => gesetzt.has(k.nr)).reduce((s, k) => s + erg.get(k.nr), 0);
      const betrag = Math.max(0, festH - imH);
      frei.set(h, { betrag });
      fest += betrag;
    } else frei.set(h, { gewicht: tabelle[typen.get(h)] ?? ANTEIL_SONST });
  }
  const pool = Math.max(0, 100 - fest);
  const summeGewicht = [...frei.values()].reduce((s, x) => s + (x.gewicht || 0), 0);
  for (const [h, x] of frei) if (x.betrag === undefined) x.betrag = summeGewicht ? (pool * x.gewicht) / summeGewicht : 0;

  // Hierarchisch auf die freien Einheiten des Hauptkapitels verteilen
  const verteile = (praefix, liste, betrag) => {
    const eigen = liste.find((k) => k.nr === praefix);
    const tiefe = nrTiefe(praefix);
    const kinder = new Map();
    for (const k of liste) {
      if (k.nr === praefix) continue;
      const kp = nrTeile(k.nr).slice(0, tiefe + 1).join('.');
      if (!kinder.has(kp)) kinder.set(kp, []);
      kinder.get(kp).push(k);
    }
    if (!kinder.size) { if (eigen) erg.set(eigen.nr, betrag); return; }
    // Eine Einheit mit eigenen Unterabschnitten (Datei "2" enthält 2.1 und 2.2, Datei "2.3" liegt daneben) zählt wie
    // so viele Untereinheiten, sonst ist sie nur Einleitungstext mit kleinem Gewicht.
    const gEigen = eigen ? Math.max(EINLEITUNG_GEWICHT, Number(eigen.unterteile) || 0) : 0;
    const anteilKind = betrag / (gEigen + kinder.size);
    if (eigen) erg.set(eigen.nr, anteilKind * gEigen);
    for (const [kp, ks] of kinder) verteile(kp, ks, anteilKind);
  };
  for (const [h, x] of frei) verteile(h, gruppen.get(h).filter((k) => !gesetzt.has(k.nr)), x.betrag);

  const summe = [...erg.values()].reduce((s, x) => s + x, 0);
  if (summe > 100.5) for (const [nr, x] of erg) erg.set(nr, (x * 100) / summe);
  return { erg, gesetzt, typen };
}

// stand: optional. Genutzt werden stand.kapitel (Einträge aus zustand.json, gern schon mit hauptkapitel_titel),
// stand.hauptkapitel (zustand.hauptkapitel, für feste Anteile je Hauptkapitel), der Seitenbereich aus
// stand.einstellungen.seiten bzw. stand.projekt.arbeit.seiten und das Fach (stand.fach bzw. stand.projekt.arbeit).
// Fehlt etwas, liest die Funktion selbst (.arbeit/zustand.json, .arbeit/einstellungen.md).
// Ergebnis: { kapitel: [{ nr, ebene, titel_datei, gliederung, woerter, abbildungen, tabellen, formeln, anteil, anteil_gesetzt,
//             seiten: { schaetzung, echt, ziel_min, ziel_max, quelle, pdf_veraltet }, woerter_ziel_min, woerter_ziel_max }],
//             gesamt: { seiten, schaetzung, woerter, abbildungen, tabellen, formeln, seiten_min, seiten_max, quelle },
//             bau: { zeit, marken } | null }
export function seitenJeKapitel(root, stand = {}) {
  let liste = Array.isArray(stand?.kapitel) ? stand.kapitel : null;
  let hauptkapitel = Array.isArray(stand?.hauptkapitel) ? stand.hauptkapitel : null;
  if (!liste || !hauptkapitel) {
    let z = {};
    try { z = JSON.parse(leseText(p(root, '.arbeit', 'zustand.json'), '{}')); } catch {}
    liste ??= Array.isArray(z.kapitel) ? z.kapitel : [];
    hauptkapitel ??= Array.isArray(z.hauptkapitel) ? z.hauptkapitel : [];
  }
  let bereich = stand?.einstellungen?.seiten || stand?.projekt?.arbeit?.seiten || null;
  let fach = stand?.fach || stand?.projekt?.arbeit || null;
  if (!bereich || !fach) {
    try { const e = leseEinstellungen(root); bereich ??= e.arbeit.seiten; fach ??= e.arbeit; } catch { bereich ??= { min: 0, max: 0 }; fach ??= {}; }
  }
  const min = Number(bereich?.min) || 0, max = Number(bereich?.max) || min;

  const kapitel = liste.filter((k) => k && k.nr != null).map((k) => ({
    ...k, nr: String(k.nr), hauptkapitel: String(k.hauptkapitel ?? nrTeile(k.nr)[0]),
  })).sort((a, b) => vergleicheNr(a.nr, b.nr));

  // Dateien einmal lesen
  const texte = new Map();
  for (const k of kapitel) {
    const datei = typeof k.datei === 'string' && k.datei ? p(root, ...k.datei.split('/')) : null;
    let md = '', mtime = 0;
    if (datei) { try { md = fs.readFileSync(datei, 'utf8'); mtime = fs.statSync(datei).mtimeMs; } catch {} }
    const gl = md ? gliederung(md, k.nr) : null;
    texte.set(k.nr, { md, mtime, gl });
  }
  // Titel aus der Datei gilt, sobald es sie gibt
  const mitTitel = kapitel.map((k) => {
    const gl = texte.get(k.nr).gl;
    const unterteile = gl ? gl.abschnitte.filter((a) => a.ebene === nrTiefe(k.nr) + 1 && a.nr).length : 0;
    return { ...k, titel: gl?.titel || k.titel || '', unterteile };
  });
  const hauptAnteile = new Map(hauptkapitel.filter((h) => h && h.nr != null).map((h) => [String(h.nr), h.anteil]));
  const { erg: ant, gesetzt } = anteile(mitTitel, { natur: istNaturwissenschaft(fach || {}), hauptAnteile });

  const toc = leseToc(root);
  const bau = leseLetztenBau(root);
  const bauZeit = bau?.start ? Date.parse(bau.start) : toc?.mtime || 0;
  const mitMarken = !!toc?.marken?.length;
  const echt = !toc ? new Map() : mitMarken ? seitenAusMarken(toc.marken) : seitenAusNummern(toc, new Set(kapitel.map((k) => k.nr)));
  // Einheiten des letzten Baus mit Text (neu dazugekommene oder leer gewordene verschieben alles danach)
  const bauText = new Map((Array.isArray(bau?.einheiten) ? bau.einheiten : []).map((e) => [String(e.nr), !!e.text]));

  const gesamt = { seiten: 0, schaetzung: 0, woerter: 0, abbildungen: 0, tabellen: 0, formeln: 0, seiten_min: min || null, seiten_max: max || null, quelle: 'schaetzung' };
  let mitPdf = 0, mitText = 0;
  let verschoben = false; // eine frühere Einheit hat sich seit dem Bau geändert
  const aus = kapitel.map((k) => {
    const { md, mtime, gl } = texte.get(k.nr);
    const woerter = md ? zaehleWoerter(md) : 0;
    const el = md ? zaehleElemente(md) : { abbildungen: 0, tabellen: 0, formeln: 0 };
    const schaetzung = md ? schaetzeSeiten(woerter, el) : 0;
    const hatText = woerter > 0 || el.abbildungen + el.tabellen + el.formeln > 0;
    let veraltet = false;
    if (toc) {
      const neuOderLeer = bauText.size > 0 && (bauText.get(k.nr) ?? false) !== hatText;
      if ((md.trim() && mtime > bauZeit + 1000) || neuOderLeer) verschoben = true;
      veraltet = verschoben && echt.has(k.nr);
    }
    const echtWert = echt.has(k.nr) && md.trim() && !veraltet ? echt.get(k.nr) : null;
    const anteil = r1(ant.get(k.nr) || 0);
    const zmin = min ? runde((min * anteil) / 100, 0.5) : null;
    const zmax = max ? runde((max * anteil) / 100, 0.5) : null;
    const seiten = echtWert ?? schaetzung;
    if (md.trim()) { mitText++; if (echtWert !== null) mitPdf++; }
    gesamt.seiten += seiten; gesamt.schaetzung += schaetzung; gesamt.woerter += woerter;
    gesamt.abbildungen += el.abbildungen; gesamt.tabellen += el.tabellen; gesamt.formeln += el.formeln;
    return {
      nr: k.nr, ebene: nrTiefe(k.nr), titel_datei: gl?.titel || null, gliederung: gl, woerter, ...el, anteil, anteil_gesetzt: gesetzt.has(k.nr),
      seiten: { schaetzung, echt: echtWert, ziel_min: zmin, ziel_max: zmax, quelle: echtWert !== null ? 'pdf' : 'schaetzung', pdf_veraltet: !!veraltet },
      woerter_ziel_min: zmin !== null ? Math.round(zmin * WOERTER_PRO_SEITE) : null,
      woerter_ziel_max: zmax !== null ? Math.round(zmax * WOERTER_PRO_SEITE) : null,
    };
  });
  gesamt.seiten = r1(gesamt.seiten);
  gesamt.schaetzung = r1(gesamt.schaetzung);
  gesamt.quelle = !mitPdf ? 'schaetzung' : mitPdf === mitText ? 'pdf' : 'gemischt';
  return { kapitel: aus, gesamt, woerter_pro_seite: WOERTER_PRO_SEITE, bau: toc ? { zeit: new Date(bauZeit).toISOString(), marken: mitMarken } : null };
}
