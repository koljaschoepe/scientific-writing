// Gliederung aus den Kapiteldateien. Liest nur, schreibt nie. Genutzt von seiten.mjs, stand.mjs, pdf.mjs,
// zustand.mjs (aufteilen, zusammenführen) und check.mjs.
//
// Regel für Kapiteldateien (Schreibeinheiten):
// - Eine Datei ist eine Schreibeinheit mit Status, auf beliebiger Ebene: nr "3", "3.2", "3.2.1" …
// - Die Datei beginnt mit genau einer Überschrift für ihre Einheit, ohne Nummer. Empfohlen: so viele # wie
//   die nr Ebenen hat ("3" → "# Titel", "3.2" → "## Titel"). Innere Überschriften eine Ebene tiefer und so weiter.
// - Alles unterhalb der Einheit (Abschnitte) wird hier aus den Überschriften abgeleitet, nie gespeichert.
// - pdf.mjs setzt die Kopfüberschrift auf die LaTeX-Ebene der nr ("3" → \chapter, "3.2" → \section …)
//   und verschiebt die inneren Überschriften relativ dazu. Weicht die Zahl der # ab, gilt trotzdem die nr.
//
// Exporte:
//   nrTeile(nr), nrTiefe(nr), vergleicheNr(a, b), nrSchluessel(nr)
//   nummerAusDateiname(name)        "03-02-x.md" -> "3.2", "2-einleitung.md" -> "2", sonst null
//   ueberschriften(md)              [{ zeile (1-basiert), stufe (Zahl der #), titel, roh, unnummeriert, anker, ende }]
//                                   ohne Frontmatter, Code-Blöcke, HTML-Kommentare, $$-Blöcke
//   kopf(md)                        { ueberschrift | null, vorText: bool } Kopfüberschrift = erste Überschrift, vor der kein Text steht
//   gliederung(md, nr)              { titel, kopf_zeile, kopf_stufe, kopf_fehlt, mehrere_koepfe, abschnitte: [{ ebene, nr, titel, zeile, woerter, woerter_gesamt }] }
//   verschiebeUeberschriften(md, delta)   alle ATX-Überschriften um delta Stufen verschieben (1..6), Code-Blöcke bleiben
//   ohneNummer(titel, nr?)          "2.1 Titel" -> "Titel" (nur wenn die Nummer zur Einheit passt bzw. ohne nr: jede Nummer mit Punkt)
//   entferneNummern(md, nr?)        dasselbe für alle Überschriften einer Datei (Code-Blöcke bleiben)

import { zaehleWoerter } from './lib.mjs';

export const nrTeile = (nr) => String(nr ?? '').trim().split('.').filter((x) => x !== '');
export const nrTiefe = (nr) => nrTeile(nr).length;
export const nrSchluessel = (nr) => nrTeile(nr).map((x) => x.padStart(4, '0')).join('.');
export function vergleicheNr(a, b) {
  const x = nrTeile(a), y = nrTeile(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] === undefined) return -1;
    if (y[i] === undefined) return 1;
    const d = (Number(x[i]) - Number(y[i])) || x[i].localeCompare(y[i]);
    if (d) return d;
  }
  return 0;
}

// "03-02-ergebnisse.md" -> "3.2". 00-* und 99-* sind Sonderdateien (null).
export function nummerAusDateiname(name) {
  const teile = String(name || '').split('/').pop().replace(/\.md$/i, '').split('-');
  const nr = [];
  for (const t of teile) { if (/^\d+$/.test(t)) nr.push(String(Number(t))); else break; }
  if (!nr.length || nr[0] === '0' || nr[0] === '99') return null;
  return nr.join('.');
}

const ATTRIBUT = /\s*\{([^{}]*)\}\s*$/;

// Überschriftentext ohne Attribute; unnummeriert bei {-} oder {.unnumbered}; anker bei {#sec:x}
function zerlegeTitel(roh) {
  let titel = roh.replace(/\s+#+\s*$/, '').trim(); // schließende # (ATX)
  let unnummeriert = false, anker = null;
  const a = ATTRIBUT.exec(titel);
  if (a) {
    const teile = a[1].trim().split(/\s+/);
    if (teile.some((t) => t === '-' || t === '.unnumbered')) unnummeriert = true;
    const id = teile.find((t) => t.startsWith('#'));
    if (id) anker = id.slice(1);
    titel = titel.slice(0, a.index).trim();
  }
  return { titel, unnummeriert, anker };
}

export function ohneNummer(titel, nr = null) {
  const t = String(titel || '');
  const m = /^(\d+(?:\.\d+)*)\.?\s+(?=\S)/.exec(t);
  if (!m) return t;
  // Ohne Einheit nur Nummern mit Punkt ("2.1", "3.") entfernen, damit "1984 als Wendepunkt" bleibt
  if (nr == null) return /\./.test(m[0]) ? t.slice(m[0].length) : t;
  return nrTeile(m[1])[0] === nrTeile(nr)[0] ? t.slice(m[0].length) : t;
}

// Zeilen mit Kennzeichen, ob sie zum Text zählen (nicht Frontmatter, Code, Kommentar, Formelblock)
function zeilenMitArt(md) {
  const zeilen = String(md || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const art = new Array(zeilen.length).fill('text');
  let i = 0;
  if (zeilen[0] === '---') {
    for (let j = 1; j < zeilen.length; j++) if (/^(---|\.\.\.)\s*$/.test(zeilen[j])) { for (let k = 0; k <= j; k++) art[k] = 'frontmatter'; i = j + 1; break; }
  }
  let zaun = null, kommentar = false, formel = false;
  for (; i < zeilen.length; i++) {
    const z = zeilen[i], t = z.trim();
    if (zaun) { art[i] = 'code'; if (t.startsWith(zaun)) zaun = null; continue; }
    if (kommentar) { art[i] = 'kommentar'; if (z.includes('-->')) kommentar = false; continue; }
    if (formel) { art[i] = 'formel'; if (/\$\$(\s*\{#[^}]*\})?$/.test(t)) formel = false; continue; }
    const f = /^(```|~~~)/.exec(t);
    if (f) { art[i] = 'code'; zaun = f[1]; continue; }
    if (t.startsWith('<!--')) {
      art[i] = 'kommentar';
      if (!t.slice(4).includes('-->')) kommentar = true;
      continue;
    }
    if (t.startsWith('$$') && !(t.length > 2 && /\$\$(\s*\{#[^}]*\})?$/.test(t.slice(2)))) { art[i] = 'formel'; formel = true; continue; }
  }
  return { zeilen, art };
}

export function ueberschriften(md) {
  const { zeilen, art } = zeilenMitArt(md);
  const erg = [];
  zeilen.forEach((z, i) => {
    if (art[i] !== 'text') return;
    const m = /^ {0,3}(#{1,6})[ \t]+(.*?)\s*$/.exec(z);
    if (!m || !m[2].replace(/#+$/, '').trim()) return;
    erg.push({ zeile: i + 1, stufe: m[1].length, roh: m[2], ...zerlegeTitel(m[2]) });
  });
  return erg;
}

// Kopfüberschrift: erste Überschrift, vor der nur Leerzeilen, Kommentare oder Frontmatter stehen.
export function kopf(md) {
  const { zeilen, art } = zeilenMitArt(md);
  for (let i = 0; i < zeilen.length; i++) {
    if (art[i] !== 'text' || !zeilen[i].trim()) continue;
    const m = /^ {0,3}(#{1,6})[ \t]+(.*?)\s*$/.exec(zeilen[i]);
    if (m && m[2].replace(/#+$/, '').trim()) return { ueberschrift: { zeile: i + 1, stufe: m[1].length, roh: m[2], ...zerlegeTitel(m[2]) }, vorText: false };
    return { ueberschrift: null, vorText: true };
  }
  return { ueberschrift: null, vorText: false };
}

// Gliederung einer Einheit. nr: Nummer der Einheit (z. B. "3.2"). Abschnitt-ebene ist absolut (1 = Kapitel).
// Nummeriert wird bis Ebene 4 (LaTeX secnumdepth 3, also bis \subsubsection), tiefer und unnummerierte: nr null.
export const NUMMERIERT_BIS_EBENE = 4;
export function gliederung(md, nr) {
  const tiefe = Math.max(1, nrTiefe(nr));
  const liste = ueberschriften(md);
  const k = kopf(md);
  const kopfU = k.ueberschrift && liste.length && liste[0].zeile === k.ueberschrift.zeile ? liste[0] : null;
  const innen = kopfU ? liste.slice(1) : liste;
  // Stufe, die der Einheit entspricht: die der Kopfüberschrift, ohne Kopf eine über der flachsten inneren
  const basis = kopfU ? kopfU.stufe : (innen.length ? Math.min(...innen.map((u) => u.stufe)) - 1 : tiefe);
  // Wörter je Abschnitt: Text bis zur nächsten Überschrift (eigen) bzw. bis zur nächsten gleich hohen (gesamt)
  const zeilen = String(md || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const textZwischen = (von, bis) => zaehleWoerter(zeilen.slice(von, bis).join('\n'));
  const zaehler = nrTeile(nr).map(Number);
  const abschnitte = innen.map((u, j) => {
    const ebene = Math.max(tiefe + 1, tiefe + (u.stufe - basis));
    const naechste = innen[j + 1];
    let bisGesamt = zeilen.length;
    for (let x = j + 1; x < innen.length; x++) if (innen[x].stufe <= u.stufe) { bisGesamt = innen[x].zeile - 1; break; }
    let nrText = null;
    if (!u.unnummeriert && ebene <= NUMMERIERT_BIS_EBENE) {
      zaehler.length = Math.max(zaehler.length, ebene);
      for (let e = tiefe; e < ebene - 1; e++) zaehler[e] ??= 0;
      zaehler[ebene - 1] = (zaehler[ebene - 1] || 0) + 1;
      zaehler.length = ebene;
      nrText = zaehler.map((x) => String(x ?? 0)).join('.');
    }
    return {
      ebene, nr: nrText, titel: ohneNummer(u.titel, nr), zeile: u.zeile,
      woerter: textZwischen(u.zeile, naechste ? naechste.zeile - 1 : zeilen.length),
      woerter_gesamt: textZwischen(u.zeile, bisGesamt),
      ...(u.anker ? { anker: u.anker } : {}),
    };
  });
  // Mehrere Köpfe: weitere Überschriften auf der Stufe des Kopfs (dann ist die Datei eigentlich zwei Einheiten)
  const mehrere = kopfU ? innen.filter((u) => u.stufe <= kopfU.stufe).length : 0;
  return {
    titel: kopfU ? ohneNummer(kopfU.titel, nr) : null,
    kopf_zeile: kopfU ? kopfU.zeile : null,
    kopf_stufe: kopfU ? kopfU.stufe : null,
    kopf_fehlt: !kopfU,
    mehrere_koepfe: mehrere,
    abschnitte,
  };
}

// ATX-Überschriften um delta verschieben (auf 1..6 begrenzt), außerhalb von Code, Kommentaren und Formeln.
export function verschiebeUeberschriften(md, delta) {
  if (!delta) return String(md || '');
  const text = String(md || '').replace(/^﻿/, '');
  const crlf = /\r\n/.test(text);
  const { zeilen, art } = zeilenMitArt(text);
  const neu = zeilen.map((z, i) => {
    if (art[i] !== 'text') return z;
    const m = /^( {0,3})(#{1,6})([ \t]+.*)$/.exec(z);
    if (!m) return z;
    const stufe = Math.min(6, Math.max(1, m[2].length + delta));
    return `${m[1]}${'#'.repeat(stufe)}${m[3]}`;
  });
  return crlf ? neu.join('\r\n') : neu.join('\n');
}

// Nummern am Anfang von Überschriften entfernen ("## 2.1 Titel" -> "## Titel"), LaTeX bzw. Word nummerieren selbst.
// Mit nr nur Nummern, deren erste Stelle zur Einheit passt; ohne nr jede Nummer (Exposé).
export function entferneNummern(md, nr = undefined) {
  const text = String(md || '').replace(/^﻿/, '');
  const crlf = /\r\n/.test(text);
  const { zeilen, art } = zeilenMitArt(text);
  const neu = zeilen.map((z, i) => {
    if (art[i] !== 'text') return z;
    const m = /^( {0,3}#{1,6}[ \t]+)(.*)$/.exec(z);
    if (!m) return z;
    if (nr === undefined) return m[1] + m[2].replace(/^\d+(?:\.\d+)*\.?\s+(?=\S)/, '');
    return m[1] + ohneNummer(m[2], nr);
  });
  return crlf ? neu.join('\r\n') : neu.join('\n');
}
