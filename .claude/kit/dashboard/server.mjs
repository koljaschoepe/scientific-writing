#!/usr/bin/env node
// Dashboard-Server. Nur Node-Built-ins, nur 127.0.0.1. Vertrag mit dem Frontend: .claude/kit/dashboard/API.md.
//
//   node .claude/kit/dashboard/server.mjs [--root <pfad>] [--port <n>]   Server im Vordergrund
//   node .claude/kit/dashboard/server.mjs --starten [--oeffnen]            im Hintergrund starten (falls nötig), URL ausgeben
//   node .claude/kit/dashboard/server.mjs --statisch                       nur dashboard.html neu schreiben
//   node .claude/kit/dashboard/server.mjs --stoppen                        laufenden Server beenden (über POST /api/stop)
//
// Export: stelleServerSicher(root) → { url, port, gestartet }, laufInfo(root), schreibeStatisch(root), oeffneImBrowser(url)
//
// Bausteine in .claude/kit/dashboard/server/: basis (Hilfen, lib-Brücke, Orte), text (/api/text, nur lesen),
// beobachter (fs.watch + Abfrage), aenderungen (Schnappschüsse, „zuletzt geändert“), vertrag (Einstellungen,
// Plan, Termine, Seiten), quellen (Notizen, wo zitiert), skills (Werkzeugkasten), pdfbau (PDF auf Knopfdruck),
// schreiben (alle Schreibaktionen), system (Editor umschalten, PDF im PDF-Programm öffnen).
//
// Last: Der Stand entsteht neu, wenn der Beobachter eine Änderung meldet oder geschrieben wurde (gebündelt), sonst nur
// alle 60 s (Datumswechsel, Git). git status fragt git-lage.mjs höchstens alle 60 s ab.

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findeRoot, p, existiert, kitVersion } from '../werkzeuge/lib.mjs';
import { ladeStand } from '../werkzeuge/stand.mjs';
import { renderSeite } from './render.mjs';
import {
  sende, sendeFehler, sendeDatei, leseJsonKoerper, leseJsonLocker, echterPfad, liegtIn, sichererRel, istKaputt, kaputtFehler,
  HttpFehler, ungueltig, nichtGefunden, TYPEN, absPfad, mtimeIso, ORTE,
} from './server/basis.mjs';
import { leseTextAntwort } from './server/text.mjs';
import { starteAenderungserkennung, aenderungenFuerStand, geaenderteAbsaetze } from './server/aenderungen.mjs';
import { starteBeobachter } from './server/beobachter.mjs';
import { einstellungen } from './server/vertrag.mjs';
import { reichereQuellenAn } from './server/quellen.mjs';
import { ladeSkills, leseSkill } from './server/skills.mjs';
import { erzeugePdfBau } from './server/pdfbau.mjs';
import { aendereQuelle, termin, kapitelStatus, statusErlaubt, zitat, zitatEntfernen, upload } from './server/schreiben.mjs';
import { editorUmschalten, pdfOeffnen } from './server/system.mjs';

const STANDARD_PORT = 4711;
const HIER = path.dirname(fileURLToPath(import.meta.url));

// ---------- Laufzeitinfo (außerhalb des Repos, damit nichts synchronisiert wird) ----------

function infoDatei(root) {
  const h = crypto.createHash('sha1').update(echterPfad(root)).digest('hex').slice(0, 10);
  return path.join(os.tmpdir(), `scientific-writing-dashboard-${h}.json`);
}
export function laufInfo(root) { return leseJsonLocker(infoDatei(root), null); }

function wunschPort(root) {
  try { return einstellungen(root).port || STANDARD_PORT; } catch { return STANDARD_PORT; }
}

function anfrage(port, { methode = 'GET', weg = '/api/ping', koerper, timeout = 600 } = {}) {
  return new Promise((resolve) => {
    const daten = koerper ? JSON.stringify(koerper) : null;
    const req = http.request({ host: '127.0.0.1', port, path: weg, method: methode, timeout,
      headers: { Host: `127.0.0.1:${port}`, ...(daten ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(daten) } : {}) } }, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
    if (daten) req.write(daten);
    req.end();
  });
}
const ping = (port, timeout) => anfrage(port, { timeout });

const gleicherRoot = (a, b) => !!a && !!b && echterPfad(a) === echterPfad(b);

// Läuft schon ein Server für dieses Projekt? Sonst im Hintergrund starten.
export async function stelleServerSicher(root) {
  const kandidaten = [...new Set([laufInfo(root)?.port, wunschPort(root)].filter(Boolean))];
  for (const port of kandidaten) {
    const r = await ping(port);
    if (r?.ok && gleicherRoot(r.root, root)) return { url: `http://127.0.0.1:${port}/`, port, gestartet: false };
  }
  const kind = spawn(process.execPath, [fileURLToPath(import.meta.url), '--root', root], {
    detached: true, stdio: 'ignore', windowsHide: true, cwd: root,
  });
  kind.unref();
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 150));
    const info = laufInfo(root);
    if (info?.port) {
      const r = await ping(info.port);
      if (r?.ok && gleicherRoot(r.root, root)) return { url: `http://127.0.0.1:${info.port}/`, port: info.port, gestartet: true };
    }
  }
  throw new Error('Dashboard-Server startet nicht. Prüfe mit: node .claude/kit/dashboard/server.mjs');
}

export function oeffneImBrowser(url) {
  const opt = { detached: true, stdio: 'ignore', windowsHide: true };
  if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], opt).unref();
  else if (process.platform === 'darwin') spawn('open', [url], opt).unref();
  else spawn('xdg-open', [url], opt).unref();
}

// ---------- Stand ----------

// Stand aus ladeStand() plus die Teile, die nur der Server kennt
function vollerStand(root, pdfBau) {
  const stand = ladeStand(root);
  anreichern(root, stand);
  stand.aenderungen = aenderungenFuerStand(root);
  try { stand.skills = ladeSkills(root); } catch { stand.skills = []; }
  stand.pdfBau = pdfBau ? pdfBau.zustand() : erzeugePdfBau(root).zustand();
  return stand;
}

// v3-Teile des Stands (API.md, Abschnitt v3), soweit ladeStand() sie nicht schon liefert.
// Jeder Teil für sich abgesichert, damit ein Fehler nicht alles leert.
function anreichern(root, stand) {
  const versuch = (name, f) => { try { f(); } catch (e) { console.error(`Stand (${name}):`, e.message); } };
  stand.api = 3;
  stand.vscode ??= 'vscode://file'; // ladeStand liefert schon vscode:// bzw. cursor:// (technik.editor)
  stand.root_abs = absPfad(root);
  for (const weg of ['serie', 'letzte14', 'abzeichen', 'tagesziel', 'termine', 'projekt']) delete stand[weg];

  versuch('einstellungen', () => { stand.einstellungen = einstellungen(root); });
  versuch('kapitel', () => {
    for (const k of Array.isArray(stand.kapitel) ? stand.kapitel : []) {
      const rel = typeof k.datei === 'string' && k.datei ? k.datei : null;
      k.pfad_abs = rel ? absPfad(root, rel) : null;
      if (k.geaendert === undefined) k.geaendert = rel ? mtimeIso(p(root, ...rel.split('/'))) : null;
      k.status = k.status || 'offen';
      k.status_erlaubt = statusErlaubt(k.status); // inklusive des aktuellen Status
    }
    for (const d of Array.isArray(stand.kapitelOhneEintrag) ? stand.kapitelOhneEintrag : []) {
      if (d.datei) d.pfad_abs = absPfad(root, d.datei);
    }
  });
  versuch('plan', () => {
    if (stand.plan && typeof stand.plan === 'object') stand.plan.pfad_abs = absPfad(root, ORTE.plan);
  });
  versuch('quellen', () => reichereQuellenAn(root, stand));
}

function standVersion(stand) {
  const { erzeugt, standVersion: _v, ...rest } = stand;
  return crypto.createHash('sha1').update(JSON.stringify(rest)).digest('hex').slice(0, 12);
}

// Minimaler Stand, wenn eine Projektdatei beschädigt ist (die Seite zeigt dann nur den Hinweis)
function kaputtStand(root, e) {
  const f = kaputtFehler(root, e);
  return { schema: 1, api: 3, root, version: kitVersion(root), kaputt: [f.extra.datei], notstand: true, erzeugt: new Date().toISOString() };
}

// ---------- Statische Kopie ----------

export function schreibeStatisch(root, port, pdfBau, fertigerStand = null) {
  let stand = fertigerStand;
  if (!stand) {
    try { stand = vollerStand(root, pdfBau); } catch (e) { if (!istKaputt(e)) throw e; stand = kaputtStand(root, e); }
    stand.standVersion = standVersion(stand);
  }
  const html = renderSeite(stand, { statisch: true, port: port || laufInfo(root)?.port || wunschPort(root), root });
  // direkt schreiben (schreibeText aus lib legt ab v2.1 ggf. .bak an, das braucht eine generierte Datei nicht)
  const ziel = p(root, 'dashboard.html');
  const tmp = `${ziel}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, html, 'utf8');
  try { fs.renameSync(tmp, ziel); } catch { fs.writeFileSync(ziel, html, 'utf8'); try { fs.unlinkSync(tmp); } catch {} }
}

// ---------- Systemcheck asynchron ----------

function starteCheck(root) {
  return new Promise((resolve) => {
    const datei = p(root, '.claude', 'kit', 'werkzeuge', 'check.mjs');
    if (!existiert(datei)) return resolve({ verfuegbar: false, ergebnisse: [] });
    let aus = ''; let err = '';
    const kind = spawn(process.execPath, [datei, '--json'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const wecker = setTimeout(() => { try { kind.kill(); } catch {} }, 90000);
    kind.stdout.on('data', (c) => { if (aus.length < 2e6) aus += c; });
    kind.stderr.on('data', (c) => { if (err.length < 1e5) err += c; });
    kind.on('error', (e) => { clearTimeout(wecker); resolve({ verfuegbar: false, ergebnisse: [], fehler: e.message }); });
    kind.on('close', () => {
      clearTimeout(wecker);
      try { resolve({ verfuegbar: true, ergebnisse: JSON.parse(aus) }); }
      catch { resolve({ verfuegbar: false, ergebnisse: [], fehler: (err.trim().split('\n').pop() || 'Systemcheck lieferte kein Ergebnis.').slice(0, 500) }); }
    });
  });
}

// ---------- Server ----------

const ERLAUBTE_ORDNER = ['kapitel', '.arbeit', 'quellen', 'abbildungen', 'daten', '.claude/kit/docs'];
const ERLAUBTE_DATEIEN = ['Arbeit.pdf', 'Arbeit-neu.pdf', 'Expose.pdf', 'Expose-neu.pdf'];
const JSON_WEGE = new Set(['/api/quelle', '/api/termin', '/api/termin/erledigt', '/api/termin/loeschen', '/api/termin/wiederherstellen',
  '/api/kapitel/status', '/api/kapitel/freigeben', '/api/zitat', '/api/zitat/entfernen', '/api/pdf/bauen', '/api/stop',
  '/api/editor', '/api/pdf/oeffnen']);
// Sicherheitsnetz ohne Dateiereignis (Datumswechsel, Git-Stand). Änderungen an Dateien meldet der Beobachter sofort.
const STAND_TAKT_MS = 60000;
// GET /api/stand rechnet nur neu, wenn sich seither etwas geändert hat oder der Stand älter ist als das
const STAND_FRISCH_MS = 5000;
const EINFACHE_TYPEN = /^(application\/x-www-form-urlencoded|multipart\/form-data|text\/plain)\b/i;

async function starteServer(root, portWunsch) {
  let version = '';
  let standCache = null;
  let standZeit = 0;
  let schmutzig = true; // seit dem letzten Stand eine Datei- oder Schreibänderung
  let aktuellerPort = portWunsch;
  const clients = new Set();

  const sseSenden = (event, daten) => {
    const text = `event: ${event}\ndata: ${JSON.stringify(daten)}\n\n`;
    for (const res of clients) { try { res.write(text); } catch {} }
  };

  let aktualisiere = () => {};
  const pdfBau = erzeugePdfBau(root, { beiEnde: (z) => { sseSenden('pdf', z); aktualisiere(); } });

  const berechne = () => {
    schmutzig = false;
    standZeit = Date.now();
    try { standCache = vollerStand(root, pdfBau); } catch (e) {
      if (!istKaputt(e)) throw e;
      standCache = kaputtStand(root, e);
    }
    standCache.standVersion = standVersion(standCache);
    return standCache.standVersion;
  };

  aktualisiere = () => {
    let v;
    try { v = berechne(); } catch (e) { console.error('Stand fehlerhaft:', e.message); return; }
    if (v === version) return;
    version = v;
    sseSenden('stand', { version });
    try { schreibeStatisch(root, aktuellerPort, pdfBau, standCache); } catch (e) { console.error('dashboard.html:', e.message); }
  };

  let timer = null;
  const entprellt = () => { schmutzig = true; clearTimeout(timer); timer = setTimeout(aktualisiere, 350); };
  const frischerStand = () => { if (!standCache || schmutzig || Date.now() - standZeit > STAND_FRISCH_MS) berechne(); return standCache; };

  let checkLaeuft = null;
  let beenden = () => process.exit(0);

  const erlaubteHosts = () => new Set([`127.0.0.1:${aktuellerPort}`, `localhost:${aktuellerPort}`]);
  const erlaubteOrigins = () => new Set([`http://127.0.0.1:${aktuellerPort}`, `http://localhost:${aktuellerPort}`]);

  const server = http.createServer(async (req, res) => {
    try {
      // DNS-Rebinding: nur Anfragen an 127.0.0.1/localhost mit unserem Port
      if (!erlaubteHosts().has(String(req.headers.host || '').toLowerCase())) {
        throw new HttpFehler(403, 'verboten', 'Nur über 127.0.0.1 oder localhost erreichbar.');
      }
      let url; let weg;
      try {
        url = new URL(req.url, `http://127.0.0.1:${aktuellerPort}`);
        weg = decodeURIComponent(url.pathname);
      } catch { throw ungueltig('Die Adresse ist ungültig.'); }
      if (weg.includes('\u0000')) throw ungueltig('Die Adresse ist ungültig.');

      const schreibend = req.method === 'POST' || req.method === 'PUT';
      if (schreibend) {
        // Fremde Webseiten (auch Origin "null" aus Sandbox/Datei) dürfen nichts ändern
        const herkunft = req.headers.origin;
        if (herkunft !== undefined && !erlaubteOrigins().has(herkunft)) throw new HttpFehler(403, 'verboten', 'Nur vom Dashboard aus erlaubt.');
        const typ = String(req.headers['content-type'] || '');
        if (JSON_WEGE.has(weg) && !/^application\/json\b/i.test(typ)) throw new HttpFehler(403, 'verboten', 'Anfrage muss JSON sein (Content-Type: application/json).');
        if (weg === '/api/upload' && (!typ || EINFACHE_TYPEN.test(typ))) throw new HttpFehler(403, 'verboten', 'Upload braucht Content-Type: application/octet-stream.');
      }

      // ----- Lesen -----
      if (req.method === 'GET' || req.method === 'HEAD') {
        if (weg === '/' || weg === '/index.html') {
          frischerStand();
          return sende(res, 200, renderSeite(standCache, { statisch: false, port: aktuellerPort, root }), 'text/html; charset=utf-8',
            { 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' });
        }
        if (weg === '/api/ping') {
          return sende(res, 200, { ok: true, root, pid: process.pid, port: aktuellerPort, version: kitVersion(root) });
        }
        if (weg === '/api/stand') {
          return sende(res, 200, frischerStand());
        }
        if (weg === '/api/check') {
          checkLaeuft ??= starteCheck(root).finally(() => { checkLaeuft = null; });
          return sende(res, 200, await checkLaeuft);
        }
        if (weg === '/api/text') {
          return sende(res, 200, leseTextAntwort(root, url.searchParams.get('datei'), (rel) => geaenderteAbsaetze(root, rel)));
        }
        if (weg === '/api/skill') {
          return sende(res, 200, leseSkill(root, url.searchParams.get('name')));
        }
        if (weg === '/ereignisse') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
          if (!version) { try { version = berechne(); } catch {} }
          res.write(`retry: 2000\n\nevent: hallo\ndata: ${JSON.stringify({ version, pid: process.pid })}\n\nevent: stand\ndata: ${JSON.stringify({ version })}\n\n`);
          clients.add(res);
          const weg2 = () => clients.delete(res);
          req.on('close', weg2);
          res.on('error', weg2);
          return;
        }
        if (weg === '/anpassungen.css' || weg === '/anpassungen.js') {
          const ext = path.extname(weg);
          const datei = p(root, '.arbeit', `dashboard-anpassungen${ext}`);
          const inhalt = existiert(datei) && liegtIn(p(root, '.arbeit'), datei) ? fs.readFileSync(datei) : '';
          return sende(res, 200, inhalt, TYPEN[ext]);
        }
        if (weg.startsWith('/vendor/')) {
          const r = sichererRel(weg.slice('/vendor/'.length));
          const basis = path.join(HIER, 'vendor');
          const voll = r ? path.join(basis, ...r.split('/')) : null;
          if (!voll || !existiert(voll) || !liegtIn(basis, voll) || !fs.statSync(voll).isFile()) throw nichtGefunden();
          return sendeDatei(res, voll);
        }
        if (weg.startsWith('/datei/') || ERLAUBTE_DATEIEN.includes(weg.slice(1))) {
          const r = sichererRel(weg.startsWith('/datei/') ? weg.slice('/datei/'.length) : weg.slice(1));
          if (!r) throw nichtGefunden();
          const ordner = ERLAUBTE_ORDNER.find((o) => r.startsWith(o + '/'));
          if (!ordner && !ERLAUBTE_DATEIEN.includes(r)) throw nichtGefunden();
          const voll = p(root, ...r.split('/'));
          // Symlinks dürfen nicht aus dem erlaubten Ordner heraus zeigen
          if (!existiert(voll) || !liegtIn(ordner ? p(root, ...ordner.split('/')) : root, voll) || !fs.statSync(voll).isFile()) throw nichtGefunden();
          return sendeDatei(res, voll);
        }
        throw nichtGefunden();
      }

      // ----- Schreiben -----
      // v3: kein PUT mehr (Absatz-Bearbeiten im Browser entfällt)
      if (req.method !== 'POST') throw new HttpFehler(405, 'ungueltig', 'Diese Methode geht hier nicht.');

      if (weg === '/api/upload') {
        const erg = await upload(root, req, url.searchParams.get('name') || req.headers['x-dateiname']);
        entprellt();
        return sende(res, 200, erg);
      }
      if (!JSON_WEGE.has(weg)) throw nichtGefunden();
      const b = await leseJsonKoerper(req);
      let erg;
      if (weg === '/api/quelle') erg = aendereQuelle(root, b);
      else if (weg.startsWith('/api/termin')) erg = termin(root, weg, b);
      else if (weg === '/api/kapitel/status') erg = kapitelStatus(root, b);
      else if (weg === '/api/kapitel/freigeben') erg = kapitelStatus(root, b, { alias: true });
      else if (weg === '/api/zitat') erg = zitat(root, b);
      else if (weg === '/api/zitat/entfernen') erg = zitatEntfernen(root, b);
      else if (weg === '/api/editor') erg = editorUmschalten(root, b);
      else if (weg === '/api/pdf/oeffnen') erg = pdfOeffnen(root, b, frischerStand());
      else if (weg === '/api/pdf/bauen') {
        const r = pdfBau.starte();
        sseSenden('pdf', pdfBau.zustand());
        erg = { ok: true, laeuft: true, schon_gestartet: !r.gestartet, pdfBau: pdfBau.zustand() };
      } else if (weg === '/api/stop') {
        if (Number(b.pid) !== process.pid) throw new HttpFehler(403, 'verboten', 'Falsche Prozessnummer.');
        sende(res, 200, { ok: true });
        setTimeout(() => beenden(), 50);
        return;
      }
      entprellt();
      return sende(res, 200, erg);
    } catch (e) {
      return sendeFehler(res, root, e);
    }
  });
  server.on('clientError', (_e, socket) => { try { socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); } catch {} });

  // Port suchen: Wunschport, sonst die nächsten zehn
  await new Promise((resolve, reject) => {
    let versuch = 0;
    const probiere = () => {
      server.once('error', async (e) => {
        if (e.code === 'EADDRINUSE' && versuch < 10) {
          const r = await ping(portWunsch + versuch);
          if (r?.ok && gleicherRoot(r.root, root)) {
            console.log(`Dashboard läuft bereits: http://127.0.0.1:${portWunsch + versuch}/`);
            process.exit(0);
          }
          versuch++;
          probiere();
        } else reject(e);
      });
      server.listen(portWunsch + versuch, '127.0.0.1', () => { aktuellerPort = portWunsch + versuch; resolve(); });
    };
    probiere();
  });

  fs.writeFileSync(infoDatei(root), JSON.stringify({ port: aktuellerPort, pid: process.pid, root, start: new Date().toISOString() }));
  let erkennung = null;
  let beobachter = null;
  beenden = () => {
    try { if (laufInfo(root)?.pid === process.pid) fs.unlinkSync(infoDatei(root)); } catch {}
    try { erkennung?.stop(); beobachter?.stop(); pdfBau.stop(); } catch {}
    for (const r of clients) { try { r.end(); } catch {} }
    server.close();
    setTimeout(() => process.exit(0), 200).unref();
  };
  process.on('SIGINT', beenden);
  process.on('SIGTERM', beenden);

  // Änderungserkennung für kapitel/ und .arbeit/ (legt beim Start fehlende Schnappschüsse still an)
  erkennung = starteAenderungserkennung(root, { beiAenderung: entprellt, log: (t) => console.error(t) });
  aktualisiere();

  // Live-Aktualisierung: jede Änderung an beobachteten Dateien → SSE datei, Änderungserkennung, Stand neu
  beobachter = starteBeobachter(root, {
    log: (t) => console.error(t),
    beiDateien: (pfade) => {
      for (const r of pfade) erkennung.melde(r);
      sseSenden('datei', { pfade });
      entprellt();
    },
  });
  // Sicherheitsnetz: Stand-Version selten vergleichen (Git-Stand, Datumswechsel); Dateien meldet der Beobachter
  setInterval(aktualisiere, STAND_TAKT_MS).unref();
  setInterval(() => { for (const res of clients) { try { res.write(': ping\n\n'); } catch {} } }, 20000).unref();

  console.log(`Dashboard läuft: http://127.0.0.1:${aktuellerPort}/  (Projekt: ${root}, Beobachtung: ${beobachter.modus})`);
  return aktuellerPort;
}

// ---------- Stoppen ohne fremde Prozesse zu treffen ----------

async function stoppe(root) {
  const info = laufInfo(root);
  if (!info?.port) { console.log('Lief nicht.'); return; }
  const r = await ping(info.port);
  if (r?.ok && Number(r.pid) === Number(info.pid) && gleicherRoot(r.root, root)) {
    await anfrage(info.port, { methode: 'POST', weg: '/api/stop', koerper: { pid: r.pid }, timeout: 2000 });
    for (let i = 0; i < 20; i++) {
      await new Promise((ok) => setTimeout(ok, 100));
      if (!(await ping(info.port, 300))) { console.log('Dashboard gestoppt.'); return; }
    }
    console.log('Dashboard reagiert nicht auf Stopp. Bitte das Terminal mit dem Server schließen.');
    return;
  }
  // Veraltete Info-Datei: kein Server von uns auf dem Port. Nichts beenden, nur aufräumen.
  try { fs.unlinkSync(infoDatei(root)); } catch {}
  console.log('Lief nicht.');
}

// ---------- CLI ----------

async function main() {
  const args = process.argv.slice(2);
  const wert = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const root = wert('--root') ? path.resolve(wert('--root')) : findeRoot();

  if (args.includes('--statisch')) { schreibeStatisch(root); console.log('dashboard.html geschrieben.'); return; }
  if (args.includes('--stoppen')) { await stoppe(root); return; }
  if (args.includes('--starten')) {
    const r = await stelleServerSicher(root);
    console.log(`Dashboard ${r.gestartet ? 'gestartet' : 'läuft'}: ${r.url}`);
    if (args.includes('--oeffnen')) oeffneImBrowser(r.url);
    return;
  }
  const port = Number(wert('--port')) || wunschPort(root);
  await starteServer(root, port);
  if (args.includes('--oeffnen')) oeffneImBrowser(`http://127.0.0.1:${laufInfo(root)?.port || port}/`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`Fehler: ${e.message}`); process.exit(1); });
}
