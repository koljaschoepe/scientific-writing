// Schreibende Endpunkte: Quellen-Board, Termine, Kapitelstatus, Zitate, Upload.
// Jede JSON-Datei wird streng gelesen: unlesbar → 409 kaputt, nie überschreiben.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as lib from '../../werkzeuge/lib.mjs';
import { heute, leseText, parseBib, QUELLEN_STATUS, MARKIERUNGEN, KAPITEL_STATUS } from '../../werkzeuge/lib.mjs';
import * as zustandMod from '../../werkzeuge/zustand.mjs';
import {
  leseJsonStreng, schreibeJson, schreibeText, journal, ungueltig, nichtGefunden, konflikt, HttpFehler, ort, ORTE,
} from './basis.mjs';
import { terminAnlegen, terminErledigt, terminLoeschen, terminWiederherstellen } from './vertrag.mjs';

const STATUS_WORT = { vorschlag: 'zurück auf Vorschlag gesetzt', genommen: 'genommen', verworfen: 'verworfen', spaeter: 'auf später gelegt' };
const KAPITEL_WORT = { offen: 'offen', geplant: 'geplant', entwurf: 'Entwurf', geprueft: 'geprüft', final: 'freigegeben' };

// ---------- Quellen ----------

export function aendereQuelle(root, b) {
  if (!b.id || typeof b.id !== 'string') throw ungueltig('Die Quelle fehlt (id).');
  const datei = ort(root, 'kandidaten');
  const k = leseJsonStreng(datei, null);
  if (!k || !Array.isArray(k.quellen)) throw nichtGefunden('Quelle nicht im Board. Nur Board-Einträge lassen sich hier ändern.');
  let treffer = k.quellen.filter((x) => x && x.id === b.id);
  if (!treffer.length) treffer = k.quellen.filter((x) => x && x.bibkey && x.bibkey === b.id);
  if (!treffer.length) throw nichtGefunden('Quelle nicht im Board. Nur Board-Einträge lassen sich hier ändern.');
  if (b.status !== undefined && !QUELLEN_STATUS.includes(b.status)) throw ungueltig('Unbekannter Status.');
  // v3: Board-Notiz heißt im Dashboard eigene_notiz (in kandidaten.json weiter notiz)
  if (b.eigene_notiz !== undefined) b = { ...b, notiz: b.eigene_notiz };
  if (b.notiz !== undefined && typeof b.notiz !== 'string' && b.notiz !== null) throw ungueltig('Die Notiz muss Text sein.');
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
  if ('notiz' in vorher) vorher.eigene_notiz = vorher.notiz;
  return { ok: true, quelle: { ...q0, eigene_notiz: typeof q0.notiz === 'string' ? q0.notiz : '' }, vorher, anzahl: treffer.length };
}

// ---------- Termine (.arbeit/plan.md) ----------

export function termin(root, weg, b) {
  if (weg === '/api/termin') {
    const t = terminAnlegen(root, b);
    journal(root, 'termin', `Termin „${t.text}“ am ${t.datum} angelegt`);
    return { ok: true, termin: t };
  }
  if (weg === '/api/termin/wiederherstellen') {
    const t = terminWiederherstellen(root, b);
    journal(root, 'termin', `Termin „${t.text}“ am ${t.datum} wiederhergestellt`);
    return { ok: true, termin: t };
  }
  if (weg === '/api/termin/erledigt') {
    const { termin: t, vorher } = terminErledigt(root, b);
    if (vorher.erledigt !== t.erledigt) journal(root, 'termin', `Termin „${t.text}“ ${t.erledigt ? 'erledigt' : 'wieder offen'}`);
    return { ok: true, termin: t, vorher };
  }
  if (weg === '/api/termin/loeschen') {
    const { termin: t, zeile } = terminLoeschen(root, b);
    journal(root, 'termin', `Termin „${t.text}“ am ${t.datum} gelöscht`);
    return { ok: true, termin: t, zeile };
  }
  throw nichtGefunden();
}

// ---------- Kapitel ----------

// Rückgängig-Kennzeichen dieses Serverlaufs: token → { nr, vorher, nachher, verlauf_id }
const undoListe = new Map();
const UNDO_MAX = 200;

// Erlaubte Ziele inklusive des aktuellen Status (Reihenfolge laut lib.mjs, B1)
export function statusErlaubt(von) {
  const akt = lib.normStatus(von) || 'offen';
  const ziele = new Set(lib.erlaubteZiele(akt));
  return KAPITEL_STATUS.filter((s) => s === akt || ziele.has(s));
}

// Liest zustand.json streng (beschädigt → 409 kaputt, nie überschreiben) und findet das Kapitel
function kapitelAusZustand(root, nr) {
  const z = leseJsonStreng(ort(root, 'zustand'), null);
  const k = (z?.kapitel || []).find((x) => String(x.nr) === nr);
  if (!k) throw ungueltig(`Kapitel ${nr} gibt es nicht.`);
  return k;
}

export function kapitelStatus(root, b, { alias = false } = {}) {
  const nr = b.nr === undefined || b.nr === null ? '' : String(b.nr).trim();
  if (!nr) throw ungueltig('Kapitelnummer fehlt.');
  const status = alias ? 'final' : lib.normStatus(b.status);
  if (!status) throw ungueltig(`Unbekannter Status. Erlaubt: ${KAPITEL_STATUS.join(', ')}.`);
  const k = kapitelAusZustand(root, nr);
  const vorher = { status: lib.normStatus(k.status) || 'offen' };

  // Rückgängig (B2): alter Status ohne Reihenfolgeprüfung, Verlaufseintrag der Änderung wird entfernt
  if (b.rueckgaengig !== undefined && b.rueckgaengig !== null && b.rueckgaengig !== '') {
    const u = undoListe.get(String(b.rueckgaengig));
    if (!u || u.nr !== nr || u.vorher !== status || vorher.status !== u.nachher) {
      throw konflikt('Das lässt sich nicht mehr rückgängig machen. Der Status wurde inzwischen anders geändert.');
    }
    const r = zustandMod.rueckgaengigStatus(root, nr, status, u.verlauf_id);
    undoListe.delete(String(b.rueckgaengig));
    journal(root, 'kapitel', `Statusänderung von Kapitel ${nr} im Dashboard zurückgenommen (wieder ${KAPITEL_WORT[status]})`);
    return { ok: true, kapitel: r.kapitel, vorher };
  }

  if (vorher.status === status) {
    if (alias) throw ungueltig(`Kapitel ${nr} ist schon freigegeben.`);
    return { ok: true, kapitel: k, vorher, undo: null };
  }
  const fehler = lib.pruefeUebergang(nr, vorher.status, status);
  if (fehler) throw ungueltig(fehler);
  let erg;
  try { erg = zustandMod.setzeKapitelStatus(root, nr, status); } catch (e) {
    if (e?.code === 'UEBERGANG') throw ungueltig(e.message);
    if (e?.code === 'ENOENT') throw ungueltig(e.message);
    throw e;
  }
  const token = crypto.randomBytes(8).toString('hex');
  undoListe.set(token, { nr, vorher: vorher.status, nachher: status, verlauf_id: erg.verlauf_id || null });
  while (undoListe.size > UNDO_MAX) undoListe.delete(undoListe.keys().next().value);
  journal(root, 'kapitel', `Kapitel ${nr} im Dashboard auf „${KAPITEL_WORT[status]}“ gesetzt (vorher ${KAPITEL_WORT[vorher.status] || vorher.status})`);
  return { ok: true, kapitel: erg.kapitel, vorher, undo: { nr, status: vorher.status, rueckgaengig: token } };
}

// ---------- Zitate ----------

export function zitat(root, b) {
  const bibkey = String(b.bibkey || '').trim();
  if (!/^[A-Za-z0-9][\w:.-]{0,99}$/.test(bibkey)) throw ungueltig('Bibkey fehlt oder ist ungültig.');
  const text = String(b.text || '').replace(/\s+/g, ' ').trim();
  if (!text) throw ungueltig('Zitattext fehlt.');
  if (text.length > 5000) throw ungueltig('Das Zitat ist zu lang (höchstens 5000 Zeichen).');
  const seite = String(b.seite ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 20);
  const seitePdf = b.seite_pdf === undefined || b.seite_pdf === null || b.seite_pdf === '' ? null : Number(b.seite_pdf);
  if (seitePdf !== null && !(Number.isInteger(seitePdf) && seitePdf > 0)) throw ungueltig('PDF-Seite ist ungültig.');
  const notiz = String(b.notiz || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  const rel = `${ORTE.notizen}/${bibkey}.md`;
  const datei = ort(root, 'notizen', `${bibkey}.md`);
  let inhalt = leseText(datei, '');
  if (!inhalt) {
    const e = parseBib(leseText(ort(root, 'bib'), '')).find((x) => x.key === bibkey);
    const kurz = e?.felder?.title ? e.felder.title.split(/\s+/).slice(0, 8).join(' ') : bibkey;
    inhalt = `# ${bibkey}: ${kurz}\n\n> Quelle: quellen/pdfs/${bibkey}.pdf · angelegt ${heute()} im Dashboard\n`;
  }
  const nummern = [...inhalt.matchAll(/^##\s+Z(\d+)/gm)].map((m) => Number(m[1]));
  const id = `Z${(nummern.length ? Math.max(...nummern) : 0) + 1}`;
  // B3: seite = gedruckte Seitenzahl, seite_pdf = PDF-Seite (nur wenn abweichend oder keine gedruckte da)
  const seiteText = seite || (seitePdf ? `[PDF-Seite ${seitePdf}, bitte prüfen]` : '');
  const zeilen = [`## ${id}`, `- seite: ${seiteText}`];
  if (seitePdf && String(seitePdf) !== seite) zeilen.push(`- seite_pdf: ${seitePdf}`);
  zeilen.push('- typ: aussage', '- kapitel:', `- original: "${text.replace(/"/g, '\\"')}"`);
  if (notiz) zeilen.push(`- kontext: ${notiz}`);
  zeilen.push(`- herkunft: dashboard ${heute()}`);
  inhalt = inhalt.replace(/\s*$/, '\n') + '\n' + zeilen.join('\n') + '\n';
  schreibeText(datei, inhalt);
  journal(root, 'zitat', `Zitat ${id} aus ${bibkey}${seite ? ` (S. ${seite})` : seitePdf ? ` (PDF-Seite ${seitePdf}, gedruckte Seite noch prüfen)` : ''} im Dashboard gemerkt`);
  return { ok: true, datei: rel, id };
}

export function zitatEntfernen(root, b) {
  const bibkey = String(b.bibkey || '').trim();
  const id = String(b.id || '').trim();
  if (!/^[A-Za-z0-9][\w:.-]{0,99}$/.test(bibkey) || !/^Z\d+$/.test(id)) throw ungueltig('Bibkey oder Zitatnummer ungültig.');
  const datei = ort(root, 'notizen', `${bibkey}.md`);
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
    const ordner = ort(root, 'eingang');
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
