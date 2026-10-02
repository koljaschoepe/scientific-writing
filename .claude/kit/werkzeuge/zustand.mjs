#!/usr/bin/env node
// Einzige Schreibstelle für .arbeit/zustand.json. Skills ändern den Zustand nur hierüber.
//
// CLI: node .claude/kit/werkzeuge/zustand.mjs <befehl> [argumente]
//   init                                 fehlende Dateien aus .claude/kit/vorlagen/arbeit anlegen, ältere Projekte umziehen
//   zeige                                Kurzüberblick (Phase, nächster Schritt, Umfang, Kapitel, Termine)
//   phase <id>                           Phase aktiv setzen, vorige erledigt, spätere offen
//   kapitel <nr> [status] [--titel T] [--datei D] [--ziel N] [--anteil P] [--note X] [--offen N] [--erzwingen]
//                                        legt fehlende Kapitel an, ändert Felder
//   status <nr> <status> [--erzwingen]   Status setzen (offen, geplant, entwurf, geprueft, final)
//   status-zurueck <nr> <vorher> [verlauf_id]   Undo einer Statusänderung: alter Status, Verlaufseintrag weg
//   kapitel-setzen <datei.json|->        (auch kapitel-liste, kapitel-anlegen) Kapitelliste setzen (bestehende Status bleiben)
//                                        Format: [{ "nr": "2.1", "titel": "...", "woerter_ziel": 1200, "anteil": 12 }]
//   hauptkapitel <datei.json|->          Titel für Ebenen ohne eigene Datei setzen: [{ "nr": "2", "titel": "Grundlagen", "anteil": 20 }]
//                                        (nr auf jeder Ebene, anteil optional: fester Prozentanteil des Hauptkapitels)
//   freigeben <nr>                       Kapitel von geprueft auf final setzen
//   gliederung                           Gliederung als Baum: Einheiten (Dateien, Status, Wörter) und ihre Abschnitte
//   anlegen <nr> --titel T [--datei D] [--anteil P]
//                                        neue Schreibeinheit auf beliebiger Ebene (3, 3.2, 3.2.1) samt Datei mit Kopfüberschrift
//   aufteilen <nr> [--probe]             Einheit an ihren Unterüberschriften in Untereinheiten mit eigenen Dateien zerlegen
//   zusammenfuehren <nr> [--probe]       alle Einheiten unter <nr> in die Datei von <nr> zurückholen
//   abgleichen                           umbenannte Kapiteldateien und geänderte Titel aus den Dateien übernehmen
//                                        (aufteilen und zusammenfuehren verschieben nur Text: vorher liegt jede Datei als
//                                        Kopie in kapitel/.versionen/, nichts wird gelöscht. --probe zeigt nur, was passieren würde)
//   naechster "<text>"                   nächsten Schritt setzen (steht im Dashboard und im Start-Hook)
//   verlauf "<text>"                     Eintrag in den Verlauf (letzte 50)
//   einstellung <pfad> <wert>            eine Einstellung in .arbeit/einstellungen.md setzen, z. B. arbeit.seiten 60-80
//   einstellung <pfad>                   eine Einstellung lesen
//
// Statusregeln: rückwärts jederzeit, vorwärts nur einen Schritt, final nur aus geprueft.
// --erzwingen erlaubt größere Schritte vorwärts (z. B. offen -> entwurf), aber nie final ohne geprueft.
//
// Exit-Codes: 0 ok, 1 Fehler, 5 eine JSON-Datei ist beschädigt (nichts wurde geschrieben).
//
// Exporte: ladeZustand, speichereZustand, init, migriereAltesLayout, setzePhase, schliesseAb, setzeKapitel,
//          setzeKapitelStatus, rueckgaengigStatus, setzeKapitelListe, setzeHauptkapitel, freigeben,
//          setzeNaechster, verlauf, legeEinheitAn, teileAuf, fuehreZusammen, gleicheAb

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  PHASEN, PHASEN_IDS, KAPITEL_STATUS, findeRoot, p, kit, arbeit, existiert, leseJson, schreibeJson,
  heute, jetztIso, slug, lokal, beendeBeiKaputt, normStatus, pruefeUebergang, leseEinstellungen,
  setzeEinstellung, setzeEinstellungen, schreibeTermin, lesePlan, EINSTELLUNGEN_DATEI,
  zaehleWoerter, leseText, schreibeText, KAPITEL_ORDNER,
} from './lib.mjs';
import { gliederung, verschiebeUeberschriften, nrTeile, nrTiefe, vergleicheNr } from './gliederung.mjs';

const zustandsDatei = (root) => arbeit(root, 'zustand.json');
const vorlage = (root, name) => kit(root, 'vorlagen', 'arbeit', name);

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
  if (!Array.isArray(z.verlauf)) z.verlauf = [];
  return z;
}

// Felder aus älteren Versionen (Tagesaktivität, Abzeichen, Sync-Zeit) gehören nicht mehr hierher.
function bereinige(z) {
  for (const f of ['aktivitaet', 'abzeichen', 'letzter_stop', 'letzte_gesamt', 'letzte_quellen', 'sync']) delete z[f];
  for (const k of z.kapitel) {
    if (typeof k.datei === 'string') k.datei = k.datei.replace(/^arbeit\/kapitel\//, 'kapitel/');
    if (k.status) k.status = normStatus(k.status) || 'offen';
  }
}

export function speichereZustand(root, z) {
  bereinige(z);
  schreibeJson(zustandsDatei(root), z);
}

// ---------- Umzug älterer Projekte (bis v2.1: arbeit/, quellen/zitate, latex/, projekt.json, plan.json) ----------

function verschiebe(von, nach, protokoll, root) {
  if (!existiert(von)) return;
  const st = fs.statSync(von);
  if (st.isDirectory()) {
    for (const n of fs.readdirSync(von)) verschiebe(path.join(von, n), path.join(nach, n), protokoll, root);
    try { fs.rmdirSync(von); } catch { /* nicht leer: Rest bleibt liegen */ }
    return;
  }
  if (existiert(nach)) {
    const gleich = (() => { try { return fs.readFileSync(von).equals(fs.readFileSync(nach)); } catch { return false; } })();
    if (gleich || path.basename(von) === '.gitkeep') { try { fs.unlinkSync(von); } catch {} return; }
    protokoll.konflikte.push(path.relative(root, von).split(path.sep).join('/'));
    return; // beide Fassungen bleiben, nichts geht verloren
  }
  fs.mkdirSync(path.dirname(nach), { recursive: true });
  fs.renameSync(von, nach);
  protokoll.verschoben.push(`${path.relative(root, von).split(path.sep).join('/')} -> ${path.relative(root, nach).split(path.sep).join('/')}`);
}

function sichereAlt(root, rel, protokoll) {
  const von = p(root, ...rel.split('/'));
  if (!existiert(von)) return;
  const ziel = lokal(root, 'v2-sicherung', path.basename(von));
  fs.copyFileSync(von, ziel);
  fs.unlinkSync(von);
  protokoll.verschoben.push(`${rel} -> .lokal/v2-sicherung/${path.basename(von)} (übernommen)`);
}

// Nur wenn alte Ordner da sind. Verschiebt, löscht keine Nutzerdaten (Konflikte bleiben an beiden Orten).
export function migriereAltesLayout(root) {
  const protokoll = { verschoben: [], konflikte: [], einstellungen: false, termine: 0 };
  const alt = p(root, 'arbeit');
  if (existiert(p(alt, 'kapitel'))) verschiebe(p(alt, 'kapitel'), p(root, 'kapitel'), protokoll, root);
  if (existiert(alt) && fs.statSync(alt).isDirectory()) verschiebe(alt, p(root, '.arbeit'), protokoll, root);
  if (existiert(p(root, 'quellen', 'zitate'))) verschiebe(p(root, 'quellen', 'zitate'), p(root, 'quellen', 'notizen'), protokoll, root);
  if (existiert(p(root, 'quellen', 'kandidaten.json'))) verschiebe(p(root, 'quellen', 'kandidaten.json'), arbeit(root, 'kandidaten.json'), protokoll, root);
  for (const n of ['eigene-praeambel.tex', 'eigene-erklaerung.tex', 'eigene.csl']) {
    if (existiert(p(root, 'latex', n))) verschiebe(p(root, 'latex', n), arbeit(root, 'latex', n), protokoll, root);
  }
  // Generiertes aus latex/ (gitignored) und der alte Vorlagenordner, falls noch da
  for (const d of ['kapitel', 'build', 'build-expose']) { try { fs.rmSync(p(root, 'latex', d), { recursive: true, force: true }); } catch {} }
  try { if (existiert(p(root, 'latex')) && !fs.readdirSync(p(root, 'latex')).length) fs.rmdirSync(p(root, 'latex')); } catch {}

  // Weiche aus dem Übergang v2.x -> v3 (kit/manifest.json, kit/VERSION, kit/CHANGELOG.md): das Manifest zieht
  // nach .claude/kit/manifest.json (das nächste /update braucht es), dann geht kit/, wenn sonst nichts darin liegt.
  const weiche = p(root, 'kit');
  try {
    if (fs.statSync(weiche).isDirectory() && fs.readdirSync(weiche).every((n) => ['manifest.json', 'VERSION', 'CHANGELOG.md'].includes(n))) {
      const neuM = kit(root, 'manifest.json');
      if (!existiert(neuM) && existiert(p(weiche, 'manifest.json'))) fs.copyFileSync(p(weiche, 'manifest.json'), neuM);
      fs.rmSync(weiche, { recursive: true, force: true });
      protokoll.verschoben.push('kit/ (Übergangsdateien) entfernt');
    }
  } catch { /* kein kit/ */ }

  // projekt.json -> einstellungen.md
  const pj = arbeit(root, 'projekt.json');
  if (existiert(pj)) {
    const j = leseJson(pj, null); // wirft bei Beschädigung: dann bleibt alles, wie es ist
    if (j && typeof j === 'object') {
      const a = j.arbeit || {}, l = j.latex || {};
      const s = a.seiten || {};
      setzeEinstellungen(root, {
        'arbeit.titel': a.titel, 'arbeit.untertitel': a.untertitel, 'arbeit.typ': a.typ, 'arbeit.sprache': a.sprache,
        'arbeit.fachprofil': a.fachprofil, 'arbeit.fachgebiet': a.fachgebiet, 'arbeit.methodik': a.methodik,
        'arbeit.seiten': (s.min || s.max) ? { min: s.min || s.max, max: s.max || s.min } : '',
        'arbeit.abgabe': j.abgabe?.datum, 'arbeit.beginn': j.abgabe?.beginn, 'arbeit.eingerichtet': !!j.eingerichtet,
        'person.name': j.autor?.name, 'person.matrikel': j.autor?.matrikel, 'person.email': j.autor?.email,
        'hochschule.name': j.hochschule?.name, 'hochschule.fakultaet': j.hochschule?.fakultaet, 'hochschule.institut': j.hochschule?.institut,
        'hochschule.studiengang': j.hochschule?.studiengang, 'hochschule.ort': j.hochschule?.ort,
        'hochschule.betreuer': j.betreuung?.betreuer, 'hochschule.erstgutachter': j.betreuung?.erstgutachter,
        'hochschule.zweitgutachter': j.betreuung?.zweitgutachter,
        'hochschule.ki_regeln': j.ki_regeln?.status, 'hochschule.ki_quelle': j.ki_regeln?.quelle,
        ...(j.ki_regeln?.notiz ? { 'hochschule.ki_notiz': j.ki_regeln.notiz } : {}),
        'zitieren.stil': j.zitation?.stil, 'stil.schreibmodus': j.schreibmodus,
        'layout.vorlage': l.vorlage, 'layout.schrift': l.schrift, 'layout.schriftgroesse': l.schriftgroesse,
        'layout.zeilenabstand': l.zeilenabstand, 'layout.raender': l.raender_cm, 'layout.zweiseitig': !!l.zweiseitig, 'layout.logo': l.logo,
        ...(l.verzeichnisse ? { 'layout.verzeichnisse': l.verzeichnisse } : {}),
        'technik.python': j.werkzeuge?.python, 'technik.zotero': !!j.werkzeuge?.zotero, 'technik.playwright': j.werkzeuge?.playwright !== false,
        'technik.abo': j.abo, 'technik.dashboard_port': j.dashboard?.port,
      });
      protokoll.einstellungen = true;
      sichereAlt(root, '.arbeit/projekt.json', protokoll);
    }
  }
  // plan.json -> plan.md (Termine). Tagesziel und Arbeitstage entfallen.
  const pl = arbeit(root, 'plan.json');
  if (existiert(pl)) {
    const j = leseJson(pl, null);
    const bekannt = new Set(lesePlan(root).termine.map((t) => `${t.datum}|${t.text}`));
    for (const t of (j && Array.isArray(j.termine) ? j.termine : [])) {
      const text = String(t?.text || t?.titel || '').trim();
      const datum = String(t?.datum || '').slice(0, 10);
      if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(datum) || bekannt.has(`${datum}|${text}`)) continue;
      const zeit = /\d{1,2}:\d{2}/.exec(String(t.zeit || t.uhrzeit || String(t.datum).slice(10)))?.[0] || '';
      try { schreibeTermin(root, { datum, zeit, text, erledigt: !!t.erledigt, notiz: t.notiz }); protokoll.termine++; } catch {}
    }
    sichereAlt(root, '.arbeit/plan.json', protokoll);
  }
  // Kapitelpfade in zustand.json
  if (existiert(zustandsDatei(root))) {
    const z = ladeZustand(root);
    const vorher = JSON.stringify(z);
    bereinige(z);
    if (JSON.stringify(z) !== vorher) schreibeJson(zustandsDatei(root), z);
  }
  return protokoll;
}

export function init(root) {
  const angelegt = [];
  const umzug = migriereAltesLayout(root);
  const kopien = ['einstellungen.md', 'zustand.json', 'plan.md', 'kandidaten.json', 'stil.md', 'begriffe.md', 'hilfsmittel.md', 'tagebuch.md'];
  for (const name of kopien) {
    const ziel = arbeit(root, name);
    if (!existiert(ziel) && existiert(vorlage(root, name))) {
      fs.mkdirSync(path.dirname(ziel), { recursive: true });
      fs.copyFileSync(vorlage(root, name), ziel);
      angelegt.push(`.arbeit/${name}`);
    }
  }
  for (const d of ['kapitel', '.arbeit/plaene', '.arbeit/pruefung', '.arbeit/betreuung', '.arbeit/thema', '.arbeit/expose',
    '.arbeit/gliederung', 'quellen/notizen', 'quellen/pdfs', 'quellen/eingang', 'abbildungen', 'daten']) {
    const ziel = p(root, ...d.split('/'));
    if (!existiert(ziel)) { fs.mkdirSync(ziel, { recursive: true }); angelegt.push(d + '/'); }
  }
  const bib = p(root, 'quellen', 'literatur.bib');
  if (!existiert(bib)) {
    fs.writeFileSync(bib, '% Literaturdatenbank. Wird von /quellen gepflegt.\n', 'utf8');
    angelegt.push('quellen/literatur.bib');
  }
  return { angelegt, umzug };
}

// ---------- Verlauf ----------

function eintragVerlauf(z, text) {
  const id = crypto.randomBytes(4).toString('hex');
  z.verlauf.unshift({ id, datum: jetztIso(), was: String(text) });
  z.verlauf = z.verlauf.slice(0, 50);
  return id;
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

// ---------- Kapitel ----------

// Dateiname einer Einheit: kapitel/<nr mit Bindestrich>-<slug>.md. Haben die vorhandenen Kapiteldateien führende
// Nullen (01-einleitung.md), bekommt die neue sie auch (03-02-titel.md).
function kapitelDatei(nr, titel, root = null) {
  let null2 = false;
  if (root) { try { null2 = fs.readdirSync(p(root, KAPITEL_ORDNER)).some((n) => /^0\d-/.test(n)); } catch {} }
  const teil = nrTeile(nr).map((x) => (null2 && /^\d$/.test(x) ? '0' + x : x)).join('-');
  return `${KAPITEL_ORDNER}/${teil}${titel ? '-' + slug(titel) : ''}.md`;
}

const STATUS_WORT = { offen: 'offen', geplant: 'geplant', entwurf: 'Entwurf fertig', geprueft: 'geprüft', final: 'freigegeben' };

function pruefeStatus(status) {
  const s = normStatus(status);
  if (!s) throw new Error(`Unbekannter Status "${status}". Erlaubt: ${KAPITEL_STATUS.join(', ')}`);
  return s;
}

// erzwingen: größere Sprünge vorwärts erlaubt, final aber nur aus geprueft.
function pruefeSchritt(nr, von, nach, erzwingen) {
  const fehler = pruefeUebergang(nr, von, nach);
  if (!fehler) return;
  if (erzwingen && !(nach === 'final' && von !== 'geprueft')) return;
  throw Object.assign(new Error(fehler), { code: 'UEBERGANG' });
}

function anteilWert(x) {
  if (x === undefined) return undefined;
  if (x === null || x === '') return null;
  const n = Number(String(x).replace(',', '.').replace('%', ''));
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error(`Anteil "${x}" ist keine Prozentzahl zwischen 0 und 100.`);
  return n;
}

export function setzeKapitel(root, nr, status, extra = {}, { erzwingen = false } = {}) {
  const s = status ? pruefeStatus(status) : null;
  const z = ladeZustand(root);
  let k = z.kapitel.find((x) => String(x.nr) === String(nr));
  if (!k) {
    k = { nr: String(nr), titel: extra.titel || '', hauptkapitel: String(nr).split('.')[0],
      datei: '', status: 'offen', woerter_ziel: 0, anteil: null, note_schaetzung: null, offene_punkte: 0 };
    z.kapitel.push(k);
  }
  if (extra.titel !== undefined) k.titel = extra.titel;
  if (extra.datei !== undefined) k.datei = extra.datei;
  if (extra.woerter_ziel !== undefined) k.woerter_ziel = Number(extra.woerter_ziel) || 0;
  if (extra.anteil !== undefined) k.anteil = anteilWert(extra.anteil);
  if (extra.note_schaetzung !== undefined) k.note_schaetzung = extra.note_schaetzung === '' ? null : extra.note_schaetzung;
  if (extra.offene_punkte !== undefined) k.offene_punkte = Number(extra.offene_punkte) || 0;
  if (!k.datei) k.datei = kapitelDatei(k.nr, k.titel, root);
  let verlauf_id = null;
  const vorher = k.status || 'offen';
  if (s && s !== vorher) {
    pruefeSchritt(k.nr, vorher, s, erzwingen);
    k.status = s;
    verlauf_id = eintragVerlauf(z, `Kapitel ${k.nr} ${k.titel ? '„' + k.titel + '“ ' : ''}${STATUS_WORT[s]}`);
  }
  sortiereKapitel(z);
  speichereZustand(root, z);
  return { ...k, vorher, verlauf_id };
}

function sortiereKapitel(z) {
  z.kapitel.sort((a, b) => vergleicheNr(a.nr, b.nr));
}

export function setzeKapitelListe(root, liste) {
  if (!Array.isArray(liste)) throw new Error('Kapitelliste muss ein JSON-Array sein: [{ "nr": "2.1", "titel": "..." }]');
  for (const e of liste) {
    if (!e || typeof e !== 'object' || e.nr === undefined || e.nr === null || String(e.nr).trim() === '') throw new Error('Jeder Eintrag der Kapitelliste braucht eine "nr".');
    if (e.status !== undefined && e.status !== null && e.status !== '') pruefeStatus(e.status);
    anteilWert(e.anteil);
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
      datei: e.datei || a.datei || kapitelDatei(e.nr, titel, root),
      status: (e.status && normStatus(e.status)) || a.status || 'offen',
      woerter_ziel: Number(e.woerter_ziel ?? a.woerter_ziel ?? 0) || 0,
      anteil: anteilWert(e.anteil) ?? a.anteil ?? null,
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
  // nr auf jeder Ebene erlaubt ("3", "3.2"): Titel für Ebenen ohne eigene Datei. anteil (Prozent) optional fest.
  z.hauptkapitel = liste.map((h) => ({ nr: String(h.nr), titel: String(h.titel || ''),
    ...(h.anteil !== undefined && h.anteil !== null && h.anteil !== '' ? { anteil: anteilWert(h.anteil) } : {}) }));
  speichereZustand(root, z);
  return z.hauptkapitel;
}

// Status eines bestehenden Kapitels setzen. Liefert { kapitel, vorher, verlauf_id } (fürs Undo).
// Wirft mit code 'UEBERGANG', wenn der Schritt nicht erlaubt ist (B1).
export function setzeKapitelStatus(root, nr, status, { erzwingen = false } = {}) {
  const s = pruefeStatus(status);
  const z = ladeZustand(root);
  const k = z.kapitel.find((x) => String(x.nr) === String(nr));
  if (!k) throw Object.assign(new Error(`Kapitel ${nr} gibt es nicht. Bekannt: ${z.kapitel.map((x) => x.nr).join(', ') || 'noch keine'}`), { code: 'ENOENT' });
  const vorher = k.status || 'offen';
  let verlauf_id = null;
  if (vorher !== s) {
    pruefeSchritt(k.nr, vorher, s, erzwingen);
    k.status = s;
    verlauf_id = eintragVerlauf(z, `Kapitel ${k.nr} ${k.titel ? '„' + k.titel + '“ ' : ''}${STATUS_WORT[s]}`);
    speichereZustand(root, z);
  }
  return { kapitel: k, vorher, verlauf_id };
}

// Undo (B2): alten Status ohne Reihenfolgeprüfung zurücksetzen und den Verlaufseintrag der
// ursprünglichen Änderung entfernen. Kein neuer Verlaufseintrag.
// Ohne verlauf_id wird der jüngste passende Eintrag dieses Kapitels entfernt.
export function rueckgaengigStatus(root, nr, vorher, verlaufId = null) {
  const s = pruefeStatus(vorher);
  const z = ladeZustand(root);
  const k = z.kapitel.find((x) => String(x.nr) === String(nr));
  if (!k) throw Object.assign(new Error(`Kapitel ${nr} gibt es nicht.`), { code: 'ENOENT' });
  const jetzt = k.status || 'offen';
  k.status = s;
  let idx = verlaufId ? z.verlauf.findIndex((v) => v && v.id === verlaufId) : -1;
  if (idx < 0 && !verlaufId) {
    const muster = `Kapitel ${k.nr} `;
    idx = z.verlauf.findIndex((v) => v && typeof v.was === 'string' && v.was.startsWith(muster) && v.was.endsWith(STATUS_WORT[jetzt]));
  }
  const entfernt = idx >= 0 ? z.verlauf.splice(idx, 1)[0] : null;
  speichereZustand(root, z);
  return { kapitel: k, vorher: jetzt, verlauf_entfernt: entfernt };
}

// Freigeben geht nur aus "geprueft". Alles andere erst prüfen lassen (/pruefen).
export function freigeben(root, nr) {
  const z = ladeZustand(root);
  const k = z.kapitel.find((x) => String(x.nr) === String(nr));
  if (!k) throw new Error(`Kapitel ${nr} gibt es nicht.`);
  if (k.status === 'final') return { kapitel: k, vorher: 'final', verlauf_id: null };
  return setzeKapitelStatus(root, nr, 'final');
}

// ---------- Gliederung: anlegen, aufteilen, zusammenführen, abgleichen ----------

const NR_MUSTER = /^\d+(\.\d+)*$/;
const STATUS_RANG = (st) => KAPITEL_STATUS.indexOf(normStatus(st) || 'offen');
const rel = (root, voll) => path.relative(root, voll).split(path.sep).join('/');
const eol = (t) => (/\r\n/.test(t) ? '\r\n' : '\n');
const stempel = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);

function pruefeNr(nr) {
  const n = String(nr ?? '').trim();
  if (!NR_MUSTER.test(n)) throw new Error(`"${nr}" ist keine Kapitelnummer. Beispiele: 3, 3.2, 3.2.1`);
  return n;
}

// Sicherung vor jeder Umbauaktion: kapitel/.versionen/<name>-<stempel>.md (kopieren oder verschieben)
function sichere(root, voll, { verschieben = false } = {}) {
  const ziel = p(root, KAPITEL_ORDNER, '.versionen', `${path.basename(voll, '.md')}-${stempel()}.md`);
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  let z = ziel, i = 2;
  while (existiert(z)) z = ziel.replace(/\.md$/, `-${i++}.md`);
  if (verschieben) fs.renameSync(voll, z); else fs.copyFileSync(voll, z);
  return rel(root, z);
}

function kopfText(nr, titel, { platzhalter = true } = {}) {
  const kopf = `${'#'.repeat(Math.min(6, Math.max(1, nrTiefe(nr))))} ${titel}\n`;
  return platzhalter ? `${kopf}\n<!-- Geplant: Stichpunkte, was hier hineingehört. Wird beim Schreiben ersetzt. -->\n` : kopf;
}

// Neue Einheit samt Datei. Gibt es die Datei schon, bleibt sie, wie sie ist.
export function legeEinheitAn(root, nr, { titel = '', datei, anteil, status } = {}) {
  const n = pruefeNr(nr);
  const z = ladeZustand(root);
  if (z.kapitel.some((k) => String(k.nr) === n)) throw new Error(`Kapitel ${n} gibt es schon.`);
  const d = datei || kapitelDatei(n, titel, root);
  const voll = p(root, ...d.split('/'));
  let angelegt = false;
  if (!existiert(voll)) { schreibeText(voll, kopfText(n, titel || `Kapitel ${n}`)); angelegt = true; }
  const k = { nr: n, titel: titel || '', hauptkapitel: nrTeile(n)[0], datei: d, status: status ? pruefeStatus(status) : 'offen',
    woerter_ziel: 0, anteil: anteil === undefined ? null : anteilWert(anteil), note_schaetzung: null, offene_punkte: 0 };
  z.kapitel.push(k);
  sortiereKapitel(z);
  eintragVerlauf(z, `Kapitel ${n}${titel ? ' „' + titel + '“' : ''} angelegt`);
  speichereZustand(root, z);
  return { kapitel: k, datei: d, datei_angelegt: angelegt };
}

function dateiDerEinheit(root, k) {
  const voll = typeof k.datei === 'string' && k.datei ? p(root, ...k.datei.split('/')) : null;
  if (!voll || !existiert(voll)) throw new Error(`Die Datei zu Kapitel ${k.nr} fehlt (${k.datei || 'keine Datei eingetragen'}). Erst: node .claude/kit/werkzeuge/zustand.mjs abgleichen`);
  return voll;
}

// Zerlegt eine Einheit an ihren direkten, nummerierten Unterüberschriften (Ebene nr + 1). Jeder Teil wird eine
// Untereinheit mit eigener Datei (Überschrift wird Kopfüberschrift, tiefere rutschen mit). Text vor der ersten
// Unterüberschrift bleibt als Einleitung in der alten Datei; ist dort außer der Kopfüberschrift nichts, wandert die
// Datei nach kapitel/.versionen/ und der Titel nach zustand.hauptkapitel. Status übernehmen die Teile.
export function teileAuf(root, nr, { probe = false } = {}) {
  const n = pruefeNr(nr);
  const z = ladeZustand(root);
  const k = z.kapitel.find((x) => String(x.nr) === n);
  if (!k) throw new Error(`Kapitel ${n} gibt es nicht.`);
  const voll = dateiDerEinheit(root, k);
  const md = leseText(voll);
  const nl = eol(md);
  const zeilen = md.replace(/\r\n?/g, '\n').split('\n');
  const gl = gliederung(md, n);
  const d = nrTiefe(n);
  const teile = gl.abschnitte.filter((a) => a.ebene === d + 1 && a.nr);
  if (!teile.length) throw new Error(`Kapitel ${n} hat keine Unterüberschriften der nächsten Ebene (${'#'.repeat(Math.min(6, (gl.kopf_stufe || d) + 1))} Titel). Nichts zu teilen.`);
  const belegt = teile.filter((t) => z.kapitel.some((x) => String(x.nr) === t.nr));
  if (belegt.length) throw new Error(`Die Nummern ${belegt.map((t) => t.nr).join(', ')} gibt es schon als eigene Kapitel.`);
  const stufeVon = (zeile) => /^ {0,3}(#{1,6})[ \t]/.exec(zeilen[zeile - 1])?.[1].length || d + 1;
  const stueck = (von, bis) => zeilen.slice(von, bis);
  const einleitung = stueck(0, teile[0].zeile - 1);
  const neu = teile.map((t, i) => {
    const bis = i + 1 < teile.length ? teile[i + 1].zeile - 1 : zeilen.length;
    const roh = stueck(t.zeile - 1, bis);
    while (roh.length && !roh[roh.length - 1].trim()) roh.pop();
    const text = verschiebeUeberschriften(roh.join('\n'), (d + 1) - stufeVon(t.zeile)) + '\n';
    const datei = kapitelDatei(t.nr, t.titel, root);
    if (existiert(p(root, ...datei.split('/')))) throw new Error(`Die Datei ${datei} gibt es schon. Nichts geändert.`);
    return { nr: t.nr, titel: t.titel, datei, text, woerter: zaehleWoerter(text) };
  });
  // Einleitung leer? (außer der Kopfüberschrift nur Leerzeilen und Kommentare; die stehen in der Sicherung)
  const einleitungRest = einleitung.filter((x, i) => !(gl.kopf_zeile && i === gl.kopf_zeile - 1)).join('\n').replace(/<!--[\s\S]*?-->/g, '');
  const einleitungLeer = !einleitungRest.trim();
  while (einleitung.length && !einleitung[einleitung.length - 1].trim()) einleitung.pop();
  const woerterVorher = zaehleWoerter(md);
  const woerterNachher = zaehleWoerter(einleitung.join('\n')) + neu.reduce((x, t) => x + t.woerter, 0);
  if (woerterVorher !== woerterNachher) throw new Error(`Interner Fehler beim Teilen (${woerterVorher} statt ${woerterNachher} Wörter). Nichts geändert.`);
  const ergebnis = {
    nr: n, teile: neu.map(({ nr: x, titel, datei, woerter }) => ({ nr: x, titel, datei, woerter })),
    einleitung: einleitungLeer ? null : { nr: n, datei: k.datei, woerter: zaehleWoerter(einleitung.join('\n')) },
    probe,
  };
  if (probe) return ergebnis;

  // Sicherung: bei leerer Einleitung wandert die Datei ganz nach .versionen, sonst eine Kopie
  if (!einleitungLeer) ergebnis.sicherung = sichere(root, voll, { verschieben: false });
  for (const t of neu) schreibeText(p(root, ...t.datei.split('/')), nl === '\r\n' ? t.text.replace(/\n/g, '\r\n') : t.text);
  const titelEinheit = gl.titel || k.titel || '';
  const anteilAlt = k.anteil === null || k.anteil === undefined || k.anteil === '' ? null : Number(k.anteil);
  const gewichte = (einleitungLeer ? 0 : 0.15) + neu.length;
  for (const t of neu) {
    z.kapitel.push({ nr: t.nr, titel: t.titel, hauptkapitel: nrTeile(t.nr)[0], datei: t.datei, status: k.status || 'offen',
      woerter_ziel: 0, anteil: anteilAlt !== null ? Math.round((anteilAlt / gewichte) * 10) / 10 : null, note_schaetzung: null, offene_punkte: 0 });
  }
  if (einleitungLeer) {
    ergebnis.sicherung = sichere(root, voll, { verschieben: true });
    z.kapitel = z.kapitel.filter((x) => x !== k);
    const hk = Array.isArray(z.hauptkapitel) ? z.hauptkapitel : [];
    if (titelEinheit && !hk.some((h) => String(h.nr) === n)) hk.push({ nr: n, titel: titelEinheit });
    z.hauptkapitel = hk.sort((a, b) => vergleicheNr(a.nr, b.nr));
  } else {
    schreibeText(voll, einleitung.join(nl) + nl);
    if (anteilAlt !== null) k.anteil = Math.round((anteilAlt * 0.15 / gewichte) * 10) / 10;
  }
  sortiereKapitel(z);
  eintragVerlauf(z, `Kapitel ${n} aufgeteilt in ${neu.map((t) => t.nr).join(', ')}`);
  speichereZustand(root, z);
  return ergebnis;
}

// Holt alle Einheiten unter nr (nr.1, nr.2.1 …) in die Datei von nr zurück, in Nummernfolge, Überschriften auf ihre
// Ebene gesetzt. Gibt es nr noch nicht, entsteht sie (Titel aus zustand.hauptkapitel). Die Dateien der Teile wandern
// nach kapitel/.versionen/, die alte Datei von nr liegt dort als Kopie. Status: der niedrigste der Teile.
export function fuehreZusammen(root, nr, { probe = false } = {}) {
  const n = pruefeNr(nr);
  const z = ladeZustand(root);
  const teile = z.kapitel.filter((x) => String(x.nr).startsWith(n + '.')).sort((a, b) => vergleicheNr(a.nr, b.nr));
  if (!teile.length) throw new Error(`Unter Kapitel ${n} gibt es keine eigenen Kapitel. Nichts zusammenzuführen.`);
  let ziel = z.kapitel.find((x) => String(x.nr) === n);
  const hk = Array.isArray(z.hauptkapitel) ? z.hauptkapitel : [];
  const titel = ziel?.titel || hk.find((h) => String(h.nr) === n)?.titel || '';
  const d = nrTiefe(n);
  const auf = (k, tiefe) => {
    const voll = dateiDerEinheit(root, k);
    let md = leseText(voll);
    const g = gliederung(md, k.nr);
    let basis = g.kopf_stufe;
    if (g.kopf_fehlt) { basis = Math.min(6, tiefe); md = `${'#'.repeat(basis)} ${g.titel || k.titel || k.nr}\n\n${md}`; }
    return { voll, md: verschiebeUeberschriften(md.replace(/\r\n?/g, '\n'), tiefe - basis).replace(/\s+$/, ''), woerter: zaehleWoerter(md) };
  };
  const zielDatei = ziel?.datei && existiert(p(root, ...ziel.datei.split('/'))) ? ziel.datei : (ziel?.datei || kapitelDatei(n, titel, root));
  const zielVoll = p(root, ...zielDatei.split('/'));
  const kopf = existiert(zielVoll) ? auf({ ...(ziel || {}), nr: n, datei: zielDatei, titel }, d) : { voll: null, md: kopfText(n, titel || `Kapitel ${n}`, { platzhalter: false }).replace(/\s+$/, ''), woerter: 0 };
  const stuecke = teile.map((k) => ({ k, ...auf(k, nrTiefe(k.nr)) }));
  const nl = existiert(zielVoll) ? eol(leseText(zielVoll)) : '\n';
  const text = [kopf.md, ...stuecke.map((x) => x.md)].join('\n\n') + '\n';
  const woerterVorher = kopf.woerter + stuecke.reduce((x, s) => x + s.woerter, 0);
  if (zaehleWoerter(text) !== woerterVorher) throw new Error(`Interner Fehler beim Zusammenführen (${zaehleWoerter(text)} statt ${woerterVorher} Wörter). Nichts geändert.`);
  const minStatus = [...(ziel ? [ziel] : []), ...teile].reduce((m, k) => (STATUS_RANG(k.status) < STATUS_RANG(m) ? normStatus(k.status) || 'offen' : m), 'final');
  const ergebnis = { nr: n, datei: zielDatei, teile: teile.map((k) => ({ nr: k.nr, datei: k.datei })), woerter: woerterVorher, status: minStatus, probe };
  if (probe) return ergebnis;

  ergebnis.sicherungen = [];
  if (kopf.voll) ergebnis.sicherungen.push(sichere(root, kopf.voll));
  schreibeText(zielVoll, nl === '\r\n' ? text.replace(/\n/g, '\r\n') : text);
  for (const s of stuecke) if (path.resolve(s.voll) !== path.resolve(zielVoll)) ergebnis.sicherungen.push(sichere(root, s.voll, { verschieben: true }));
  const anteile = teile.map((k) => k.anteil).concat(ziel ? [ziel.anteil] : []);
  const alleGesetzt = anteile.every((a) => a !== null && a !== undefined && a !== '');
  if (!ziel) {
    ziel = { nr: n, titel, hauptkapitel: nrTeile(n)[0], datei: zielDatei, status: minStatus, woerter_ziel: 0, anteil: null, note_schaetzung: null, offene_punkte: 0 };
    z.kapitel.push(ziel);
  }
  ziel.datei = zielDatei;
  ziel.status = minStatus;
  if (alleGesetzt) ziel.anteil = Math.round(anteile.reduce((x, a) => x + Number(a), 0) * 10) / 10;
  const weg = new Set(teile);
  z.kapitel = z.kapitel.filter((x) => !weg.has(x));
  sortiereKapitel(z);
  eintragVerlauf(z, `Kapitel ${teile.map((k) => k.nr).join(', ')} in Kapitel ${n} zusammengeführt`);
  speichereZustand(root, z);
  return ergebnis;
}

// Umbenannte Dateien (Eintrag zeigt ins Leere, genau eine freie Datei mit derselben Nummer) und Titel aus der
// Kopfüberschrift der Datei in zustand.json übernehmen. Die Datei bleibt unverändert.
export async function gleicheAb(root, { probe = false } = {}) {
  const { ladeStand } = await import('./stand.mjs');
  const s = ladeStand(root);
  const z = ladeZustand(root);
  const aenderungen = [];
  for (const k of s.kapitel) {
    const e = z.kapitel.find((x) => String(x.nr) === k.nr);
    if (!e) continue;
    if (k.datei_umbenannt && k.datei !== e.datei) { aenderungen.push({ nr: k.nr, feld: 'datei', alt: e.datei || '', neu: k.datei }); e.datei = k.datei; }
    if (k.titel_abweichung || (!e.titel && k.titel)) { aenderungen.push({ nr: k.nr, feld: 'titel', alt: e.titel || '', neu: k.titel }); e.titel = k.titel; }
  }
  if (aenderungen.length && !probe) {
    eintragVerlauf(z, `Gliederung abgeglichen (${aenderungen.length} ${aenderungen.length === 1 ? 'Änderung' : 'Änderungen'})`);
    speichereZustand(root, z);
  }
  return { aenderungen, probe };
}

async function zeigeGliederung(root) {
  const { ladeStand } = await import('./stand.mjs');
  const s = ladeStand(root);
  const z = [];
  const einrueck = (e) => '  '.repeat(Math.max(0, e - 1));
  const gruppen = new Map((s.gruppen || []).map((g) => [g.nr, g]));
  const gezeigt = new Set();
  for (const k of s.kapitel) {
    const t = nrTeile(k.nr);
    for (let i = 1; i < t.length; i++) {
      const g = t.slice(0, i).join('.');
      if (gezeigt.has(g) || s.kapitel.some((x) => x.nr === g)) continue;
      gezeigt.add(g);
      z.push(`${einrueck(i)}${g} ${gruppen.get(g)?.titel || '(ohne Titel, zustand.mjs hauptkapitel)'}`);
    }
    gezeigt.add(k.nr);
    const seiten = k.seiten ? `${String(k.seiten.echt ?? k.seiten.schaetzung).replace('.', ',')}${k.seiten.ziel_max ? '/' + String(k.seiten.ziel_min === k.seiten.ziel_max ? k.seiten.ziel_max : `${k.seiten.ziel_min}-${k.seiten.ziel_max}`).replace(/\./g, ',') : ''} S.` : '';
    const hinweis = [!k.vorhanden ? 'Datei fehlt' : '', k.datei_umbenannt ? 'Datei umbenannt' : '', k.titel_abweichung ? `Titel im Zustand: ${k.titel_zustand}` : '', k.kopf_fehlt ? 'Datei beginnt nicht mit einer Überschrift' : ''].filter(Boolean);
    z.push(`${einrueck(k.ebene)}${k.nr} ${k.titel || '(ohne Titel)'} · ${k.status} · ${k.woerter} W. · ${seiten} · ${k.datei || '-'}${hinweis.length ? ' · ' + hinweis.join(', ') : ''}`);
    for (const a of k.abschnitte || []) z.push(`${einrueck(a.ebene)}${a.nr ? a.nr + ' ' : ''}${a.titel} · ${a.woerter} W. · Zeile ${a.zeile}`);
  }
  if (!z.length) z.push('Noch keine Kapitel. Gliederung anlegen: zustand.mjs anlegen <nr> --titel "…" oder kapitel-setzen -');
  for (const d of s.kapitelOhneEintrag || []) z.push(`Ohne Eintrag (zählt nicht): ${d.datei}`);
  return z.join('\n');
}

export function setzeNaechster(root, text) {
  const z = ladeZustand(root);
  z.naechster_schritt = String(text);
  speichereZustand(root, z);
}

export function verlauf(root, text) {
  const z = ladeZustand(root);
  const id = eintragVerlauf(z, text);
  speichereZustand(root, z);
  return id;
}

function leseEingabeJson(arg) {
  const text = arg === '-' || !arg ? fs.readFileSync(0, 'utf8') : fs.readFileSync(arg, 'utf8');
  return JSON.parse(text.replace(/^﻿/, ''));
}

const SCHALTER = new Set(['erzwingen', 'probe']);
function optionen(args) {
  const o = {}; const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const n = args[i].slice(2);
      if (SCHALTER.has(n)) o[n] = true; else { o[n] = args[i + 1]; i++; }
    } else rest.push(args[i]);
  }
  return { o, rest };
}

async function zeige(root) {
  const { ladeStand } = await import('./stand.mjs');
  const s = ladeStand(root);
  const z = [];
  if (s.kaputt.length) z.push(`ACHTUNG beschädigt: ${s.kaputt.join(', ')}. Reparatur: node .claude/kit/werkzeuge/check.mjs --reparieren`);
  const u = s.umfang;
  const ziel = u.seiten_min || u.seiten_max ? ` von ${u.seiten_min === u.seiten_max ? u.seiten_min : `${u.seiten_min}-${u.seiten_max}`} S.` : ' (kein Seitenziel)';
  z.push(`Phase: ${s.phaseName} (${s.phaseIndex + 1}/8)`, `Nächster Schritt: ${s.naechster_schritt}`,
    `Umfang: ca. ${String(u.seiten).replace('.', ',')} S.${ziel}, ${u.woerter} Wörter`);
  if (s.abgabe.tage != null) z.push(`Abgabe: ${s.abgabe.datum} (${s.abgabe.tage >= 0 ? 'in ' + s.abgabe.tage : 'vor ' + -s.abgabe.tage} Tagen)`);
  z.push(`Kapitel: ${s.kapitel.map((k) => `${k.nr} ${k.status}`).join(', ') || 'noch keine'}`,
    `Quellen: ${s.quellen.zaehler.genommen} genommen, ${s.quellen.zaehler.vorschlag} ${s.quellen.zaehler.vorschlag === 1 ? 'Vorschlag' : 'Vorschläge'} offen`);
  const bald = s.plan.zeitleiste.filter((t) => !t.erledigt && t.art !== 'abgabe').slice(0, 3);
  if (bald.length) z.push(`Als Nächstes: ${bald.map((t) => `${t.datum}${t.zeit ? ' ' + t.zeit : ''} ${t.text}${t.ueberfaellig ? ' (überfällig)' : ''}`).join('; ')}`);
  return z.join('\n');
}

async function main() {
  const [befehl, ...args] = process.argv.slice(2);
  const root = findeRoot();
  const aus = (x) => console.log(typeof x === 'string' ? x : JSON.stringify(x, null, 2));
  const { o, rest } = optionen(args);
  switch (befehl) {
    case 'init': {
      const r = init(root);
      const teile = [];
      if (r.umzug.verschoben.length) teile.push(`Umgezogen (${r.umzug.verschoben.length}): ${r.umzug.verschoben.slice(0, 20).join(', ')}${r.umzug.verschoben.length > 20 ? ' …' : ''}`);
      if (r.umzug.einstellungen) teile.push('projekt.json in .arbeit/einstellungen.md übernommen.');
      if (r.umzug.termine) teile.push(`${r.umzug.termine} Termine nach .arbeit/plan.md übernommen.`);
      if (r.umzug.konflikte.length) teile.push(`Nicht verschoben, weil am Ziel schon eine andere Fassung liegt: ${r.umzug.konflikte.join(', ')}`);
      if (r.angelegt.length) teile.push(`Angelegt: ${r.angelegt.join(', ')}`);
      aus(teile.length ? teile.join('\n') : 'Alles vorhanden.');
      break;
    }
    case 'zeige': aus(await zeige(root)); break;
    case 'phase': setzePhase(root, rest[0]); aus(`Phase ${rest[0]} aktiv.`); break;
    case 'abschliessen': schliesseAb(root); aus('Alle Phasen erledigt.'); break;
    case 'kapitel': {
      const k = setzeKapitel(root, rest[0], rest[1], {
        titel: o.titel, datei: o.datei, woerter_ziel: o.ziel, anteil: o.anteil, note_schaetzung: o.note, offene_punkte: o.punkte ?? o.offen,
      }, { erzwingen: !!o.erzwingen });
      aus(k); break;
    }
    case 'kapitel-liste': case 'kapitel-setzen': case 'kapitel-anlegen': aus(setzeKapitelListe(root, leseEingabeJson(rest[0]))); break;
    case 'hauptkapitel': aus(setzeHauptkapitel(root, leseEingabeJson(rest[0]))); break;
    case 'freigeben': freigeben(root, rest[0]); aus(`Kapitel ${rest[0]} freigegeben.`); break;
    case 'gliederung': aus(await zeigeGliederung(root)); break;
    case 'anlegen': {
      if (!rest[0]) throw new Error('Aufruf: anlegen <nr> --titel "Titel" [--datei kapitel/…md] [--anteil P]');
      const r = legeEinheitAn(root, rest[0], { titel: o.titel, datei: o.datei, anteil: o.anteil });
      aus(`Kapitel ${r.kapitel.nr} angelegt: ${r.datei}${r.datei_angelegt ? '' : ' (Datei gab es schon, unverändert)'}.`);
      break;
    }
    case 'aufteilen': {
      if (!rest[0]) throw new Error('Aufruf: aufteilen <nr> [--probe]');
      const r = teileAuf(root, rest[0], { probe: !!o.probe });
      aus(`${r.probe ? 'Probe, nichts geändert. Würde' : 'Kapitel ' + r.nr + ' aufgeteilt:'} ${r.teile.map((t) => `${t.nr} ${t.titel} -> ${t.datei} (${t.woerter} W.)`).join('; ')}` +
        `${r.einleitung ? `; Einleitung bleibt in ${r.einleitung.datei} (${r.einleitung.woerter} W.)` : '; keine Einleitung, Titel nach zustand.hauptkapitel'}` +
        `${r.sicherung ? `. Kopie vorher: ${r.sicherung}` : ''}.`);
      break;
    }
    case 'zusammenfuehren': case 'zusammenführen': {
      if (!rest[0]) throw new Error('Aufruf: zusammenfuehren <nr> [--probe]');
      const r = fuehreZusammen(root, rest[0], { probe: !!o.probe });
      aus(`${r.probe ? 'Probe, nichts geändert. Würde' : 'Zusammengeführt:'} ${r.teile.map((t) => t.nr).join(', ')} -> ${r.datei} (${r.woerter} W., Status ${r.status})` +
        `${r.sicherungen ? `. Alte Dateien in kapitel/.versionen/` : ''}.`);
      break;
    }
    case 'abgleichen': {
      const r = await gleicheAb(root, { probe: !!o.probe });
      aus(r.aenderungen.length ? r.aenderungen.map((a) => `Kapitel ${a.nr}: ${a.feld} ${a.alt || '(leer)'} -> ${a.neu}`).join('\n') + (r.probe ? '\n(Probe, nichts geändert)' : '') : 'Gliederung stimmt mit den Dateien überein.');
      break;
    }
    case 'status': {
      if (!rest[0] || !rest[1]) throw new Error(`Aufruf: status <nr> <status>. Erlaubt: ${KAPITEL_STATUS.join(', ')}`);
      const r = setzeKapitelStatus(root, rest[0], rest[1], { erzwingen: !!o.erzwingen });
      const neu = normStatus(rest[1]);
      aus(r.vorher === neu ? `Kapitel ${rest[0]} war schon ${neu}.` : `Kapitel ${rest[0]}: ${r.vorher} -> ${neu}.`);
      break;
    }
    case 'status-zurueck': {
      if (!rest[0] || !rest[1]) throw new Error('Aufruf: status-zurueck <nr> <vorher> [verlauf_id]');
      const r = rueckgaengigStatus(root, rest[0], rest[1], rest[2] || null);
      aus(`Kapitel ${rest[0]}: zurück auf ${normStatus(rest[1])}${r.verlauf_entfernt ? ', Verlaufseintrag entfernt' : ''}.`);
      break;
    }
    case 'naechster': setzeNaechster(root, rest.join(' ')); aus('Nächster Schritt gesetzt.'); break;
    case 'verlauf': verlauf(root, rest.join(' ')); aus('Eingetragen.'); break;
    case 'einstellung': {
      if (!rest[0]) throw new Error('Aufruf: einstellung <abschnitt.schluessel> [wert], z. B. einstellung arbeit.seiten 60-80');
      if (rest.length === 1) {
        const e = leseEinstellungen(root);
        const [a, k] = rest[0].split('.');
        aus(e.roh?.[a]?.[k]?.wert ?? '(nicht gesetzt)');
      } else {
        const r = setzeEinstellung(root, rest[0], rest.slice(1).join(' '));
        aus(r.geaendert ? `${EINSTELLUNGEN_DATEI}: ${r.pfad} = ${r.neu} (Zeile ${r.zeile}).` : `${rest[0]} war schon so gesetzt.`);
      }
      break;
    }
    default:
      aus('Befehle: init, zeige, gliederung, phase <id>, abschliessen, kapitel <nr> [status] [--titel --datei --ziel --anteil --note --offen --erzwingen], ' +
        'anlegen <nr> --titel T, aufteilen <nr> [--probe], zusammenfuehren <nr> [--probe], abgleichen [--probe], ' +
        'status <nr> <status> [--erzwingen], status-zurueck <nr> <vorher> [verlauf_id], kapitel-setzen <json|->, hauptkapitel <json|->, ' +
        'freigeben <nr>, naechster "<text>", verlauf "<text>", einstellung <pfad> [wert]');
      if (befehl) process.exitCode = 1;
  }
}

if (process.argv[1] && (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })()) {
  main().catch((e) => { beendeBeiKaputt(e); console.error(`Fehler: ${e.message}`); process.exit(1); });
}
