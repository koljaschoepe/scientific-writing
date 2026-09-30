// Schreibende Endpunkte: Quellen-Board, Termine, Kapitelstatus, Zitate, Upload.
// Jede JSON-Datei wird streng gelesen: unlesbar → 409 kaputt, nie überschreiben.

import fs from 'node:fs';
import path from 'node:path';
import { p, heute, parseDatum, leseText, parseBib, QUELLEN_STATUS, MARKIERUNGEN, KAPITEL_STATUS } from '../../werkzeuge/lib.mjs';
import { setzeKapitel } from '../../werkzeuge/zustand.mjs';
import {
  leseJsonStreng, schreibeJson, schreibeText, journal, notiereAktivitaet, ungueltig, nichtGefunden, konflikt, HttpFehler,
} from './basis.mjs';

const STATUS_WORT = { vorschlag: 'zurück auf Vorschlag gesetzt', genommen: 'genommen', verworfen: 'verworfen', spaeter: 'auf später gelegt' };
const KAPITEL_WORT = { offen: 'offen', geplant: 'geplant', entwurf: 'Entwurf', geprueft: 'geprüft', final: 'freigegeben' };
const ARTEN = ['betreuung', 'frist', 'labor', 'sonstiges'];

// ---------- Quellen ----------

export function aendereQuelle(root, b) {
  if (!b.id || typeof b.id !== 'string') throw ungueltig('Die Quelle fehlt (id).');
  const datei = p(root, 'quellen', 'kandidaten.json');
  const k = leseJsonStreng(datei, null);
  if (!k || !Array.isArray(k.quellen)) throw nichtGefunden('Quelle nicht im Board. Nur Board-Einträge lassen sich hier ändern.');
  let treffer = k.quellen.filter((x) => x && x.id === b.id);
  if (!treffer.length) treffer = k.quellen.filter((x) => x && x.bibkey && x.bibkey === b.id);
  if (!treffer.length) throw nichtGefunden('Quelle nicht im Board. Nur Board-Einträge lassen sich hier ändern.');
  if (b.status !== undefined && !QUELLEN_STATUS.includes(b.status)) throw ungueltig('Unbekannter Status.');
  const felder = ['status', 'stern', 'notiz', 'markierungen', 'kapitel'].filter((f) => b[f] !== undefined);
  if (!felder.length) throw ungueltig('Keine Änderung angegeben.');
  const q0 = treffer[0];
  const vorher = {};
  for (const f of felder) vorher[f] = q0[f] === undefined ? null : structuredClone(q0[f]);
  if (b.status !== undefined) vorher.entschieden = q0.entschieden ?? null;
  const texte = [];
  const name = q0.bibkey || q0.id;
  // Doppelte ids (z. B. nach einem Merge) werden alle gleich geändert
  for (const q of treffer) {
    if (b.status !== undefined) {
      if (q.status !== b.status) q.entschieden = b.status === 'vorschlag' ? null : heute();
      q.status = b.status;
    }
    if (b.stern !== undefined) q.stern = Math.max(0, Math.min(3, Math.round(Number(b.stern)) || 0));
    if (b.notiz !== undefined) q.notiz = String(b.notiz ?? '').slice(0, 5000);
    if (b.markierungen !== undefined) {
      q.markierungen = [...new Set((Array.isArray(b.markierungen) ? b.markierungen : []).filter((m) => MARKIERUNGEN.includes(m)))];
    }
    if (b.kapitel !== undefined) q.kapitel = (Array.isArray(b.kapitel) ? b.kapitel : []).map(String).slice(0, 20);
  }
  if (b.status !== undefined && vorher.status !== b.status) texte.push(`Quelle ${name} ${STATUS_WORT[b.status]}`);
  if (b.stern !== undefined) texte.push(`Stern für ${name} auf ${q0.stern} gesetzt`);
  if (b.notiz !== undefined) texte.push(`Notiz zu ${name} geändert`);
  if (b.markierungen !== undefined) texte.push(`Markierungen von ${name}: ${q0.markierungen.join(', ') || 'keine'}`);
  if (b.kapitel !== undefined) texte.push(`Kapitel von ${name}: ${q0.kapitel.join(', ') || 'keine'}`);
  schreibeJson(datei, k);
  if (texte.length) journal(root, 'quelle', texte.join('. '));
  if (b.status === 'genommen' && vorher.status !== 'genommen') notiereAktivitaet(root, { quellen: 1 });
  return { ok: true, quelle: q0, vorher, anzahl: treffer.length };
}

// ---------- Termine ----------

const leerPlan = () => ({ schema: 1, termine: [], tagesziel: { arbeitstage: ['mo', 'di', 'mi', 'do', 'fr'], woerter_manuell: null } });

function saubererTermin(t, id) {
  if (!parseDatum(t.datum) || !/^\d{4}-\d{2}-\d{2}$/.test(String(t.datum).slice(0, 10))) throw ungueltig('Datum fehlt oder ist ungültig (JJJJ-MM-TT).');
  if (!String(t.titel || '').trim()) throw ungueltig('Titel fehlt.');
  const zeit = String(t.zeit || '').slice(0, 5);
  if (zeit && !/^\d{1,2}:\d{2}$/.test(zeit)) throw ungueltig('Uhrzeit ist ungültig (HH:MM).');
  return { id, datum: String(t.datum).slice(0, 10), zeit, titel: String(t.titel).trim().slice(0, 200),
    art: ARTEN.includes(t.art) ? t.art : 'sonstiges', notiz: String(t.notiz || '').slice(0, 2000), erledigt: !!t.erledigt };
}

export function termin(root, weg, b) {
  const datei = p(root, 'arbeit', 'plan.json');
  const plan = leseJsonStreng(datei, null) || leerPlan();
  if (!Array.isArray(plan.termine)) plan.termine = [];
  if (weg === '/api/termin') {
    const t = saubererTermin({ ...b, erledigt: false }, 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
    plan.termine.push(t);
    schreibeJson(datei, plan);
    journal(root, 'termin', `Termin „${t.titel}“ am ${t.datum} angelegt`);
    return { ok: true, termin: t };
  }
  if (weg === '/api/termin/wiederherstellen') {
    const alt = b.termin;
    if (!alt || typeof alt !== 'object' || !alt.id) throw ungueltig('Termin fehlt.');
    const id = String(alt.id).slice(0, 60);
    if (plan.termine.some((x) => x.id === id)) throw konflikt('Diesen Termin gibt es schon.');
    const t = saubererTermin(alt, id);
    plan.termine.push(t);
    schreibeJson(datei, plan);
    journal(root, 'termin', `Termin „${t.titel}“ am ${t.datum} wiederhergestellt`);
    return { ok: true, termin: t };
  }
  if (!b.id) throw ungueltig('Termin fehlt (id).');
  const t = plan.termine.find((x) => x.id === b.id);
  if (!t) throw nichtGefunden('Termin nicht gefunden.');
  if (weg === '/api/termin/erledigt') {
    const vorher = { erledigt: !!t.erledigt };
    t.erledigt = !!b.erledigt;
    schreibeJson(datei, plan);
    journal(root, 'termin', `Termin „${t.titel}“ ${t.erledigt ? 'erledigt' : 'wieder offen'}`);
    return { ok: true, termin: t, vorher };
  }
  if (weg === '/api/termin/loeschen') {
    plan.termine = plan.termine.filter((x) => x.id !== b.id);
    schreibeJson(datei, plan);
    journal(root, 'termin', `Termin „${t.titel}“ am ${t.datum} gelöscht`);
    return { ok: true, termin: t };
  }
  throw nichtGefunden();
}

// ---------- Kapitel ----------

export function kapitelStatus(root, b, { alias = false } = {}) {
  const nr = b.nr === undefined || b.nr === null ? '' : String(b.nr).trim();
  if (!nr) throw ungueltig('Kapitelnummer fehlt.');
  const status = alias ? 'final' : b.status;
  if (!KAPITEL_STATUS.includes(status)) throw ungueltig(`Unbekannter Status. Erlaubt: ${KAPITEL_STATUS.join(', ')}.`);
  // Streng lesen, damit zustand.mjs nie eine Vorlage über eine beschädigte Datei schreibt
  const z = leseJsonStreng(p(root, 'arbeit', 'zustand.json'), null);
  const k = (z?.kapitel || []).find((x) => String(x.nr) === nr);
  if (!k) throw ungueltig(`Kapitel ${nr} gibt es nicht.`);
  if (alias && k.status === 'final') throw ungueltig(`Kapitel ${nr} ist schon freigegeben.`);
  if (alias && k.status !== 'geprueft') throw ungueltig(`Kapitel ${nr} ist ${KAPITEL_WORT[k.status] || k.status || 'offen'}. Freigeben geht erst nach der Prüfung.`);
  const vorher = { status: k.status || 'offen' };
  const neu = setzeKapitel(root, nr, status);
  if (vorher.status !== status) journal(root, 'kapitel', `Kapitel ${nr} im Dashboard auf „${KAPITEL_WORT[status]}“ gesetzt (vorher ${KAPITEL_WORT[vorher.status] || vorher.status})`);
  return { ok: true, kapitel: neu, vorher };
}

// ---------- Zitate ----------

export function zitat(root, b) {
  const bibkey = String(b.bibkey || '').trim();
  if (!/^[A-Za-z0-9][\w:.-]{0,99}$/.test(bibkey)) throw ungueltig('Bibkey fehlt oder ist ungültig.');
  const text = String(b.text || '').replace(/\s+/g, ' ').trim();
  if (!text) throw ungueltig('Zitattext fehlt.');
  if (text.length > 5000) throw ungueltig('Das Zitat ist zu lang (höchstens 5000 Zeichen).');
  const seite = String(b.seite ?? '').trim().slice(0, 20);
  const notiz = String(b.notiz || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  const rel = `quellen/zitate/${bibkey}.md`;
  const datei = p(root, 'quellen', 'zitate', `${bibkey}.md`);
  let inhalt = leseText(datei, '');
  if (!inhalt) {
    const e = parseBib(leseText(p(root, 'quellen', 'literatur.bib'), '')).find((x) => x.key === bibkey);
    const kurz = e?.felder?.title ? e.felder.title.split(/\s+/).slice(0, 8).join(' ') : bibkey;
    inhalt = `# ${bibkey}: ${kurz}\n\n> Quelle: quellen/pdfs/${bibkey}.pdf · angelegt ${heute()} im Dashboard\n`;
  }
  const nummern = [...inhalt.matchAll(/^##\s+Z(\d+)/gm)].map((m) => Number(m[1]));
  const id = `Z${(nummern.length ? Math.max(...nummern) : 0) + 1}`;
  const zeilen = [`## ${id}`, `- seite: ${seite}`, '- typ: aussage', '- kapitel:', `- original: "${text.replace(/"/g, '\\"')}"`];
  if (notiz) zeilen.push(`- kontext: ${notiz}`);
  zeilen.push(`- herkunft: dashboard ${heute()}`);
  inhalt = inhalt.replace(/\s*$/, '\n') + '\n' + zeilen.join('\n') + '\n';
  schreibeText(datei, inhalt);
  journal(root, 'zitat', `Zitat ${id} aus ${bibkey}${seite ? ` (S. ${seite})` : ''} im Dashboard gemerkt`);
  return { ok: true, datei: rel, id };
}

export function zitatEntfernen(root, b) {
  const bibkey = String(b.bibkey || '').trim();
  const id = String(b.id || '').trim();
  if (!/^[A-Za-z0-9][\w:.-]{0,99}$/.test(bibkey) || !/^Z\d+$/.test(id)) throw ungueltig('Bibkey oder Zitatnummer ungültig.');
  const datei = p(root, 'quellen', 'zitate', `${bibkey}.md`);
  const inhalt = leseText(datei, '');
  const re = new RegExp(`\\n*^## ${id}\\n[\\s\\S]*?(?=^## |(?![\\s\\S]))`, 'm');
  if (!inhalt || !re.test(inhalt)) throw nichtGefunden('Zitat nicht gefunden.');
  schreibeText(datei, inhalt.replace(re, '\n').replace(/\s*$/, '\n'));
  journal(root, 'zitat', `Zitat ${id} aus ${bibkey} im Dashboard wieder entfernt`);
  return { ok: true };
}

// ---------- Upload ----------

const MAX_UPLOAD = 300 * 1024 * 1024;

export function sichererName(name) {
  let n = path.basename(String(name || 'datei').replace(/\\/g, '/')).normalize('NFC');
  n = n.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/^[.\s]+/, '').replace(/[.\s]+$/, '').trim();
  if (!n) n = 'datei';
  if (/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(n)) n = '_' + n;
  if (n.length > 180) {
    const ext = path.extname(n).slice(0, 20);
    n = n.slice(0, 180 - ext.length) + ext;
  }
  return n;
}

function oeffneExklusiv(ordner, name) {
  const ext = path.extname(name); const basis = name.slice(0, name.length - ext.length);
  for (let i = 1; i < 1000; i++) {
    const n = i === 1 ? name : `${basis}-${i}${ext}`;
    try { return { name: n, fd: fs.openSync(path.join(ordner, n), 'wx') }; } catch (e) { if (e.code !== 'EEXIST') throw e; }
  }
  const n = `${basis}-${Date.now()}${ext}`;
  return { name: n, fd: fs.openSync(path.join(ordner, n), 'wx') };
}

export function upload(root, req, rohName) {
  return new Promise((resolve, reject) => {
    const laenge = Number(req.headers['content-length']);
    if (laenge > MAX_UPLOAD) { req.resume(); return reject(new HttpFehler(413, 'zu_gross', 'Die Datei ist größer als 300 MB.')); }
    const ordner = p(root, 'quellen', 'eingang');
    fs.mkdirSync(ordner, { recursive: true });
    const { name, fd } = oeffneExklusiv(ordner, sichererName(rohName));
    const voll = path.join(ordner, name);
    const ziel = fs.createWriteStream(voll, { fd });
    let groesse = 0; let fertig = false;
    const abbruch = (fehler) => {
      if (fertig) return; fertig = true;
      req.unpipe(ziel);
      ziel.destroy();
      fs.unlink(voll, () => {});
      req.resume();
      reject(fehler);
    };
    req.on('data', (c) => {
      groesse += c.length;
      if (groesse > MAX_UPLOAD) abbruch(new HttpFehler(413, 'zu_gross', 'Die Datei ist größer als 300 MB.'));
    });
    req.on('aborted', () => abbruch(new HttpFehler(400, 'ungueltig', 'Upload abgebrochen.')));
    req.on('error', (e) => abbruch(e));
    ziel.on('error', (e) => abbruch(e));
    ziel.on('finish', () => {
      if (fertig) return; fertig = true;
      if (!groesse) { fs.unlink(voll, () => {}); return reject(ungueltig('Die Datei ist leer.')); }
      journal(root, 'upload', `Datei ${name} in quellen/eingang hochgeladen`);
      resolve({ ok: true, name, pfad: `quellen/eingang/${name}`, groesse });
    });
    req.pipe(ziel);
  });
}
