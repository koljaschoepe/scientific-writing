#!/usr/bin/env node
// Dashboard-Server. Nur Node-Built-ins, nur localhost.
//
//   node kit/dashboard/server.mjs [--root <pfad>] [--port <n>]   Server im Vordergrund
//   node kit/dashboard/server.mjs --starten [--oeffnen]            im Hintergrund starten (falls nötig), URL ausgeben
//   node kit/dashboard/server.mjs --statisch                       nur dashboard.html neu schreiben
//   node kit/dashboard/server.mjs --stoppen                        laufenden Server beenden
//
// Export: stelleServerSicher(root) → { url, port, gestartet }, laufInfo(root), schreibeStatisch(root)
//
// Endpunkte:
//   GET  /                         Dashboard
//   GET  /api/ping                 { ok, root, port, version }
//   GET  /api/stand                Lagebild (stand.mjs)
//   GET  /api/check                Systemcheck (kit/werkzeuge/check.mjs, falls vorhanden)
//   GET  /ereignisse               Server-Sent Events: "stand" bei jeder sichtbaren Änderung
//   GET  /anpassungen.css|.js      arbeit/dashboard-anpassungen.css|.js (eigene Anpassungen)
//   GET  /datei/<pfad>             PDFs, Abbildungen, Arbeit.pdf, docs (nur lesend, nur erlaubte Ordner)
//   POST /api/quelle               { id, status?, stern?, notiz?, markierungen?, kapitel? } → quellen/kandidaten.json
//   POST /api/upload?name=<datei>  Rohdaten → quellen/eingang/<datei>
//   POST /api/termin               { datum, titel, zeit?, art?, notiz? } → arbeit/plan.json
//   POST /api/termin/erledigt      { id, erledigt }
//   POST /api/termin/loeschen      { id }
//   POST /api/kapitel/freigeben    { nr } → arbeit/zustand.json

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  findeRoot, p, existiert, leseJson, schreibeJson, schreibeText, heute, parseDatum,
  QUELLEN_STATUS, MARKIERUNGEN, kitVersion,
} from '../werkzeuge/lib.mjs';
import { ladeStand } from '../werkzeuge/stand.mjs';
import { freigeben } from '../werkzeuge/zustand.mjs';
import { renderSeite } from './render.mjs';

const STANDARD_PORT = 4711;

// ---------- Laufzeitinfo (außerhalb des Repos, damit nichts synchronisiert wird) ----------

function infoDatei(root) {
  const h = crypto.createHash('sha1').update(path.resolve(root).toLowerCase()).digest('hex').slice(0, 10);
  return path.join(os.tmpdir(), `scientific-writing-dashboard-${h}.json`);
}
export function laufInfo(root) { return leseJson(infoDatei(root)); }

function wunschPort(root) {
  const pj = leseJson(p(root, 'arbeit', 'projekt.json'));
  return Number(pj?.dashboard?.port) || STANDARD_PORT;
}

function ping(port, timeout = 600) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/api/ping', timeout }, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

const gleicherRoot = (a, b) => path.resolve(a || '').toLowerCase() === path.resolve(b || '').toLowerCase();

// Läuft schon ein Server für dieses Projekt? Sonst im Hintergrund starten.
export async function stelleServerSicher(root) {
  const kandidaten = [laufInfo(root)?.port, wunschPort(root)].filter(Boolean);
  for (const port of kandidaten) {
    const r = await ping(port);
    if (r?.ok && gleicherRoot(r.root, root)) return { url: `http://127.0.0.1:${port}/`, port, gestartet: false };
  }
  const kind = spawn(process.execPath, [fileURLToPath(import.meta.url), '--root', root], {
    detached: true, stdio: 'ignore', windowsHide: true, cwd: root,
  });
  kind.unref();
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 150));
    const info = laufInfo(root);
    if (info?.port) {
      const r = await ping(info.port);
      if (r?.ok && gleicherRoot(r.root, root)) return { url: `http://127.0.0.1:${info.port}/`, port: info.port, gestartet: true };
    }
  }
  throw new Error('Dashboard-Server startet nicht. Prüfe mit: node kit/dashboard/server.mjs');
}

export function oeffneImBrowser(url) {
  const opt = { detached: true, stdio: 'ignore', windowsHide: true };
  if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], opt).unref();
  else if (process.platform === 'darwin') spawn('open', [url], opt).unref();
  else spawn('xdg-open', [url], opt).unref();
}

// ---------- Statische Kopie ----------

export function schreibeStatisch(root, port) {
  const stand = ladeStand(root);
  const html = renderSeite(stand, { statisch: true, port: port || laufInfo(root)?.port || wunschPort(root), root });
  schreibeText(p(root, 'dashboard.html'), html);
}

// ---------- Hilfen ----------

function sende(res, code, body, typ = 'application/json; charset=utf-8') {
  const daten = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': typ, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(daten);
}

function leseKoerper(req, max = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const teile = []; let groesse = 0;
    req.on('data', (c) => {
      groesse += c.length;
      if (groesse > max) { reject(new Error('zu gross')); req.destroy(); return; }
      teile.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(teile)));
    req.on('error', reject);
  });
}

async function leseJsonKoerper(req) {
  const b = await leseKoerper(req);
  return JSON.parse(b.toString('utf8') || '{}');
}

function sichererName(name) {
  let n = path.basename(String(name || 'datei')).normalize('NFC');
  n = n.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/^\.+/, '').trim();
  if (!n) n = 'datei';
  if (/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(n)) n = '_' + n;
  return n.slice(0, 180);
}

function freierName(ordner, name) {
  if (!existiert(path.join(ordner, name))) return name;
  const ext = path.extname(name); const basis = name.slice(0, name.length - ext.length);
  for (let i = 2; i < 1000; i++) {
    const n = `${basis}-${i}${ext}`;
    if (!existiert(path.join(ordner, n))) return n;
  }
  return `${basis}-${Date.now()}${ext}`;
}

const TYPEN = {
  '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.gif': 'image/gif', '.webp': 'image/webp', '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
};
const ERLAUBTE_ORDNER = ['quellen/pdfs', 'quellen/eingang', 'abbildungen', 'docs', 'arbeit'];

// ---------- Server ----------

async function starteServer(root, portWunsch) {
  let version = '';
  let standCache = null;
  const clients = new Set();

  const berechne = () => {
    standCache = ladeStand(root);
    const { erzeugt, ...rest } = standCache;
    return crypto.createHash('sha1').update(JSON.stringify(rest)).digest('hex').slice(0, 12);
  };

  let aktuellerPort = portWunsch;
  const aktualisiere = () => {
    let v;
    try { v = berechne(); } catch (e) { console.error('Stand fehlerhaft:', e.message); return; }
    if (v === version) return;
    version = v;
    for (const res of clients) res.write(`event: stand\ndata: ${JSON.stringify({ version })}\n\n`);
    try { schreibeStatisch(root, aktuellerPort); } catch (e) { console.error('dashboard.html:', e.message); }
  };

  let timer = null;
  const entprellt = () => { clearTimeout(timer); timer = setTimeout(aktualisiere, 350); };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const weg = decodeURIComponent(url.pathname);
    // Nur Aufrufe von localhost-Seiten zulassen (Schutz gegen fremde Webseiten)
    const herkunft = req.headers.origin;
    if (req.method === 'POST' && herkunft && !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(herkunft) && herkunft !== 'null') {
      return sende(res, 403, { fehler: 'Nur vom Dashboard aus erlaubt.' });
    }
    try {
      if (req.method === 'GET' && (weg === '/' || weg === '/index.html')) {
        if (!standCache) berechne();
        return sende(res, 200, renderSeite(standCache, { statisch: false, port: aktuellerPort, root }), 'text/html; charset=utf-8');
      }
      if (req.method === 'GET' && weg === '/api/ping') {
        return sende(res, 200, { ok: true, root, port: aktuellerPort, version: kitVersion(root), pid: process.pid });
      }
      if (req.method === 'GET' && weg === '/api/stand') {
        berechne();
        return sende(res, 200, standCache);
      }
      if (req.method === 'GET' && weg === '/api/check') {
        const datei = p(root, 'kit', 'werkzeuge', 'check.mjs');
        if (!existiert(datei)) return sende(res, 200, { verfuegbar: false, ergebnisse: [] });
        const mod = await import(pathToFileURL(datei).href + `?t=${Date.now()}`);
        const ergebnisse = await (mod.check || mod.default)(root);
        return sende(res, 200, { verfuegbar: true, ergebnisse });
      }
      if (req.method === 'GET' && weg === '/ereignisse') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
        res.write(`event: stand\ndata: ${JSON.stringify({ version })}\n\n`);
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return;
      }
      if (req.method === 'GET' && (weg === '/anpassungen.css' || weg === '/anpassungen.js')) {
        const ext = path.extname(weg);
        const datei = p(root, 'arbeit', `dashboard-anpassungen${ext}`);
        const inhalt = existiert(datei) ? fs.readFileSync(datei) : '';
        return sende(res, 200, inhalt, TYPEN[ext]);
      }
      if (req.method === 'GET' && (weg.startsWith('/datei/') || weg === '/Arbeit.pdf')) {
        const rel = weg === '/Arbeit.pdf' ? 'Arbeit.pdf' : weg.slice('/datei/'.length);
        const voll = path.resolve(root, rel);
        const relNorm = path.relative(root, voll).split(path.sep).join('/');
        const erlaubt = relNorm === 'Arbeit.pdf' || ERLAUBTE_ORDNER.some((o) => relNorm.startsWith(o + '/'));
        if (!erlaubt || relNorm.startsWith('..') || !existiert(voll) || !fs.statSync(voll).isFile()) {
          return sende(res, 404, { fehler: 'Nicht gefunden' });
        }
        res.writeHead(200, { 'Content-Type': TYPEN[path.extname(voll).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        return fs.createReadStream(voll).pipe(res);
      }

      if (req.method === 'POST' && weg === '/api/quelle') {
        const b = await leseJsonKoerper(req);
        const datei = p(root, 'quellen', 'kandidaten.json');
        const k = leseJson(datei, { schema: 1, quellen: [] });
        const q = (k.quellen || []).find((x) => x.id === b.id || (b.id && x.bibkey === b.id));
        if (!q) return sende(res, 404, { fehler: 'Quelle nicht im Board. Nur Board-Einträge lassen sich hier ändern.' });
        if (b.status !== undefined) {
          if (!QUELLEN_STATUS.includes(b.status)) return sende(res, 400, { fehler: 'Unbekannter Status' });
          if (q.status !== b.status) q.entschieden = b.status === 'vorschlag' ? null : heute();
          q.status = b.status;
        }
        if (b.stern !== undefined) q.stern = Math.max(0, Math.min(3, Number(b.stern) || 0));
        if (b.notiz !== undefined) q.notiz = String(b.notiz).slice(0, 5000);
        if (b.markierungen !== undefined) {
          q.markierungen = [...new Set((Array.isArray(b.markierungen) ? b.markierungen : []).filter((m) => MARKIERUNGEN.includes(m)))];
        }
        if (b.kapitel !== undefined) q.kapitel = (Array.isArray(b.kapitel) ? b.kapitel : []).map(String).slice(0, 20);
        schreibeJson(datei, k);
        entprellt();
        return sende(res, 200, { ok: true, quelle: q });
      }
      if (req.method === 'POST' && weg === '/api/upload') {
        const name = sichererName(url.searchParams.get('name') || req.headers['x-dateiname']);
        const ordner = p(root, 'quellen', 'eingang');
        fs.mkdirSync(ordner, { recursive: true });
        const ziel = freierName(ordner, name);
        const daten = await leseKoerper(req, 300 * 1024 * 1024);
        fs.writeFileSync(path.join(ordner, ziel), daten);
        entprellt();
        return sende(res, 200, { ok: true, name: ziel, pfad: `quellen/eingang/${ziel}` });
      }
      if (req.method === 'POST' && weg.startsWith('/api/termin')) {
        const b = await leseJsonKoerper(req);
        const datei = p(root, 'arbeit', 'plan.json');
        const plan = leseJson(datei, { schema: 1, termine: [], tagesziel: { arbeitstage: ['mo', 'di', 'mi', 'do', 'fr'], woerter_manuell: null } });
        plan.termine ??= [];
        if (weg === '/api/termin') {
          if (!parseDatum(b.datum)) return sende(res, 400, { fehler: 'Datum fehlt oder ist ungültig (JJJJ-MM-TT).' });
          if (!String(b.titel || '').trim()) return sende(res, 400, { fehler: 'Titel fehlt.' });
          const art = ['betreuung', 'frist', 'labor', 'sonstiges'].includes(b.art) ? b.art : 'sonstiges';
          const t = { id: 't' + Date.now().toString(36), datum: String(b.datum).slice(0, 10), zeit: String(b.zeit || '').slice(0, 5),
            titel: String(b.titel).trim().slice(0, 200), art, notiz: String(b.notiz || '').slice(0, 2000), erledigt: false };
          plan.termine.push(t);
          schreibeJson(datei, plan);
          entprellt();
          return sende(res, 200, { ok: true, termin: t });
        }
        const t = plan.termine.find((x) => x.id === b.id);
        if (!t) return sende(res, 404, { fehler: 'Termin nicht gefunden' });
        if (weg === '/api/termin/erledigt') t.erledigt = !!b.erledigt;
        else if (weg === '/api/termin/loeschen') plan.termine = plan.termine.filter((x) => x.id !== b.id);
        else return sende(res, 404, { fehler: 'Unbekannt' });
        schreibeJson(datei, plan);
        entprellt();
        return sende(res, 200, { ok: true });
      }
      if (req.method === 'POST' && weg === '/api/kapitel/freigeben') {
        const b = await leseJsonKoerper(req);
        const k = freigeben(root, String(b.nr));
        entprellt();
        return sende(res, 200, { ok: true, kapitel: k });
      }
      return sende(res, 404, { fehler: 'Nicht gefunden' });
    } catch (e) {
      return sende(res, 500, { fehler: e.message });
    }
  });

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
  const aufraeumen = () => {
    try { if (laufInfo(root)?.pid === process.pid) fs.unlinkSync(infoDatei(root)); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', aufraeumen);
  process.on('SIGTERM', aufraeumen);

  aktualisiere();

  // Dateien beobachten. fs.watch rekursiv geht auf Windows und macOS; Abfrage alle 10 s als Rückfall.
  for (const ordner of ['arbeit', 'quellen', 'abbildungen']) {
    const voll = p(root, ordner);
    if (!existiert(voll)) continue;
    try { fs.watch(voll, { recursive: true }, (_ereignis, datei) => { if (!String(datei || '').endsWith('.tmp')) entprellt(); }); } catch {}
  }
  try { fs.watch(root, (_e, datei) => { if (datei === 'Arbeit.pdf') entprellt(); }); } catch {}
  setInterval(aktualisiere, 10000).unref();
  setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 25000).unref();

  console.log(`Dashboard läuft: http://127.0.0.1:${aktuellerPort}/  (Projekt: ${root})`);
  return aktuellerPort;
}

// ---------- CLI ----------

async function main() {
  const args = process.argv.slice(2);
  const wert = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const root = wert('--root') ? path.resolve(wert('--root')) : findeRoot();

  if (args.includes('--statisch')) { schreibeStatisch(root); console.log('dashboard.html geschrieben.'); return; }
  if (args.includes('--stoppen')) {
    const info = laufInfo(root);
    if (info?.pid) { try { process.kill(info.pid); console.log('Dashboard gestoppt.'); } catch { console.log('Lief nicht.'); } }
    else console.log('Lief nicht.');
    return;
  }
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
