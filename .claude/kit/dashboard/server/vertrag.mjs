// Einstellungen (.arbeit/einstellungen.md, Zusammenfassung fürs Dashboard) und Termine (.arbeit/plan.md).
// Nutzt leseEinstellungen, lesePlan, schreibeTermin, entferneTermin, setzeTerminErledigt aus lib.mjs.
// Kapitel-Seiten, Umfang und Zeitleiste rechnet ladeStand() (stand.mjs, seiten.mjs).

import * as lib from '../../werkzeuge/lib.mjs';
import { ORTE, absPfad, ungueltig, nichtGefunden, konflikt } from './basis.mjs';

const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
const txt = (x) => (x == null ? '' : String(x));

// ---------- Einstellungen ----------

const erst = (...werte) => werte.map(txt).find((x) => x.trim() !== '') || '';

// Zusammenfassung für stand.einstellungen (Quelle: leseEinstellungen aus lib.mjs)
export function einstellungen(root) {
  const e = lib.leseEinstellungen(root);
  const s = obj(e.stil);
  const jaNein = (v) => (typeof v === 'boolean' ? (v ? 'ja' : 'nein') : txt(v) || 'nein');
  return {
    pfad: ORTE.einstellungen,
    pfad_abs: absPfad(root, ORTE.einstellungen),
    vorhanden: !!e.vorhanden,
    titel: txt(e.arbeit?.titel),
    untertitel: txt(e.arbeit?.untertitel),
    typ: txt(e.arbeit?.typ),
    sprache: txt(e.arbeit?.sprache) || 'de',
    fachgebiet: txt(e.arbeit?.fachgebiet),
    seiten: { min: Number(e.arbeit?.seiten?.min) || null, max: Number(e.arbeit?.seiten?.max) || null },
    abgabe: txt(e.abgabe?.datum),
    beginn: txt(e.abgabe?.beginn),
    name: txt(e.autor?.name),
    hochschule: txt(e.hochschule?.name),
    betreuer: erst(e.betreuung?.betreuer, e.betreuung?.erstgutachter),
    zitierstil: txt(e.zitation?.stil),
    schreibmodus: txt(e.schreibmodus),
    stil: {
      ich_form: jaNein(s.ich_form),
      gedankenstriche: txt(s.gedankenstriche) || 'nein',
      semikolons: jaNein(s.semikolons),
      satz_max_woerter: Number(s.satz_max_woerter) || 30,
      kommas_max: Number(s.kommas_max) || 3,
    },
    port: Number(e.dashboard?.port) || null,
    editor: txt(e.editor) || 'automatisch',             // technik.editor: automatisch, vscode oder cursor
    zeilen: { ...obj(e.zeilen) },
  };
}

// ---------- Termine ----------

function terminForm(t) {
  const tb = lib.tageBis(t.datum);
  return { art: 'termin', id: t.id, datum: t.datum, zeit: t.zeit || '', text: txt(t.text), erledigt: !!t.erledigt,
    ...(t.ort ? { ort: t.ort } : {}), ...(t.notiz ? { notiz: t.notiz } : {}),
    ueberfaellig: !t.erledigt && tb !== null && tb < 0, tage: tb, zeile: t.zeile || null };
}

// ---------- Termine schreiben (über lib.mjs, zeilengenau) ----------

function saubererTermin(b) {
  const datum = txt(b.datum).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || !lib.parseDatum(datum)) throw ungueltig('Datum fehlt oder ist ungültig (JJJJ-MM-TT).');
  let zeit = txt(b.zeit).trim().slice(0, 5);
  if (zeit) {
    const m = zeit.match(/^(\d{1,2}):(\d{2})$/);
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw ungueltig('Uhrzeit ist ungültig (HH:MM).');
    zeit = `${m[1].padStart(2, '0')}:${m[2]}`;
  }
  const text = txt(b.text ?? b.titel).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) throw ungueltig('Bezeichnung des Termins fehlt.');
  if (text.length > 200) throw ungueltig('Die Bezeichnung ist zu lang (höchstens 200 Zeichen).');
  const extra = {};
  if (b.ort) extra.ort = txt(b.ort).slice(0, 200);
  if (b.notiz) extra.notiz = txt(b.notiz).slice(0, 500);
  return { datum, zeit, text, erledigt: !!b.erledigt, ...extra };
}

const findeTermin = (root, id) => {
  const t = lib.lesePlan(root).termine.find((x) => x.id === id);
  if (!t) throw nichtGefunden('Diesen Termin gibt es nicht mehr. Lade das Dashboard neu.');
  return t;
};

export function terminAnlegen(root, b) {
  return terminForm(lib.schreibeTermin(root, saubererTermin({ ...b, erledigt: false })));
}

export function terminErledigt(root, b) {
  if (!b.id) throw ungueltig('Termin fehlt (id).');
  const t = findeTermin(root, String(b.id));
  const r = lib.setzeTerminErledigt(root, t.id, !!b.erledigt);
  return { termin: terminForm(findeTermin(root, t.id)), vorher: { erledigt: !!(r?.vorher?.erledigt ?? t.erledigt) } };
}

export function terminLoeschen(root, b) {
  if (!b.id) throw ungueltig('Termin fehlt (id).');
  const t = findeTermin(root, String(b.id));
  const r = lib.entferneTermin(root, t.id);
  return { termin: terminForm(r?.termin || t), zeile: r?.zeile || t.zeile };
}

export function terminWiederherstellen(root, b) {
  const alt = b.termin;
  if (!alt || typeof alt !== 'object') throw ungueltig('Termin fehlt.');
  if (alt.id && lib.lesePlan(root).termine.some((x) => x.id === alt.id)) throw konflikt('Diesen Termin gibt es schon.');
  const zeile = Number(b.zeile ?? alt.zeile) || undefined;
  return terminForm(lib.schreibeTermin(root, saubererTermin(alt), { zeile }));
}
