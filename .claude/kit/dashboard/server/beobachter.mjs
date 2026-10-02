// Live-Aktualisierung: beobachtet alle Orte, deren Änderung das Dashboard betrifft, und meldet geänderte
// Dateien (relativ, Schrägstrich-Form) gebündelt an beiDateien(liste).
//
// fs.watch rekursiv je Ordner, dazu der Projektordner flach (Arbeit.pdf, neu angelegte Ordner) und
// .lokal/build flach (nur *.toc). Fehlende Ordner werden nachgezogen, sobald es sie gibt, tote Beobachter
// (Ordner gelöscht und neu angelegt) ersetzt. Sicherheitsnetz: Abfrage über mtime+size alle 10 s,
// ohne fs.watch (oder mit SW_DASHBOARD_ABFRAGE=1) alle 2 s.

import fs from 'node:fs';
import path from 'node:path';

export const ORDNER = ['kapitel', '.arbeit', 'quellen', 'abbildungen', 'daten', '.claude/skills'];
const WURZEL_DATEIEN = new Set(['Arbeit.pdf', 'Arbeit-neu.pdf', 'Expose.pdf', 'Expose-neu.pdf']);
const BUILD = '.lokal/build';
const BUENDEL_MS = 300;
const MAX_JE_EREIGNIS = 50;

const unwichtig = (rel) => {
  const name = rel.split('/').pop() || '';
  return !name || /\.(tmp|bak|swp|swx|crdownload|part)$/i.test(name) || /^\.~lock\./.test(name) || name.endsWith('~')
    || name === '.DS_Store' || name === 'Thumbs.db' || name === 'desktop.ini' || /\.kaputt-\d+$/.test(name) || name.startsWith('.#');
};
// Innerhalb der Ordner: versteckte Unterordner/Dateien ignorieren (außer der Ordner selbst ist versteckt, z. B. .arbeit)
const versteckt = (rel) => rel.split('/').slice(rel.startsWith('.claude/') ? 2 : 1).some((t) => t.startsWith('.') && t !== '.gitkeep');

export function relevant(rel) {
  if (!rel || unwichtig(rel)) return false;
  if (WURZEL_DATEIEN.has(rel)) return true;
  if (rel.startsWith(BUILD + '/')) return rel.endsWith('.toc') && rel.split('/').length === 3;
  const o = ORDNER.find((x) => rel === x || rel.startsWith(x + '/'));
  return !!o && !versteckt(rel);
}

function signaturen(root) {
  const sig = new Map();
  const merk = (voll) => {
    try { const st = fs.statSync(voll); if (st.isFile()) sig.set(path.relative(root, voll).split(path.sep).join('/'), `${st.mtimeMs}:${st.size}`); } catch {}
  };
  const lauf = (ordner, tiefe) => {
    if (tiefe > 8) return;
    let e = [];
    try { e = fs.readdirSync(ordner, { withFileTypes: true }); } catch { return; }
    for (const x of e) {
      const voll = path.join(ordner, x.name);
      if (x.name.startsWith('.') && x.name !== '.gitkeep') continue;
      if (x.isDirectory()) lauf(voll, tiefe + 1);
      else if (x.isFile()) merk(voll);
    }
  };
  for (const o of ORDNER) lauf(path.join(root, ...o.split('/')), 0);
  for (const n of WURZEL_DATEIEN) merk(path.join(root, n));
  try { for (const n of fs.readdirSync(path.join(root, ...BUILD.split('/')))) if (n.endsWith('.toc')) merk(path.join(root, ...BUILD.split('/'), n)); } catch {}
  for (const k of [...sig.keys()]) if (!relevant(k)) sig.delete(k);
  return sig;
}

export function starteBeobachter(root, { beiDateien, log = () => {} } = {}) {
  const erzwungen = process.env.SW_DASHBOARD_ABFRAGE === '1';
  let modus = erzwungen ? 'abfrage' : 'watch';
  const beobachter = new Map(); // rel-Ordner ('' = Wurzel) → { w, ino }
  const offen = new Set();
  let timer = null;
  let letzte = signaturen(root);

  const ausliefern = () => {
    timer = null;
    const liste = [...offen];
    offen.clear();
    for (let i = 0; i < liste.length; i += MAX_JE_EREIGNIS) {
      try { beiDateien?.(liste.slice(i, i + MAX_JE_EREIGNIS)); } catch (e) { log('Beobachter: ' + e.message); }
    }
  };
  const melde = (rel, { vonAbfrage = false } = {}) => {
    if (!relevant(rel)) return;
    // Vom Watcher gemeldet: Signatur gleich mitnehmen, damit die Abfrage dieselbe Änderung nicht noch einmal meldet
    if (!vonAbfrage) {
      try { const st = fs.statSync(path.join(root, ...rel.split('/'))); if (st.isFile()) letzte.set(rel, `${st.mtimeMs}:${st.size}`); } catch { letzte.delete(rel); }
    }
    offen.add(rel);
    if (!timer) timer = setTimeout(ausliefern, BUENDEL_MS);
  };

  const ino = (voll) => { try { return fs.statSync(voll).ino; } catch { return null; } };

  const beobachte = (relOrdner, rekursiv) => {
    const voll = relOrdner ? path.join(root, ...relOrdner.split('/')) : root;
    const i = ino(voll);
    const alt = beobachter.get(relOrdner);
    if (alt && alt.ino === i && !alt.tot) return;
    if (alt) { try { alt.w.close(); } catch {} beobachter.delete(relOrdner); }
    if (i === null) return;
    try {
      const eintrag = { ino: i, tot: false, w: null };
      eintrag.w = fs.watch(voll, { recursive: rekursiv }, (_ereignis, datei) => {
        const d = String(datei || '').split(path.sep).join('/');
        if (!d) { abfrage(); return; }
        const rel = relOrdner ? `${relOrdner}/${d}` : d;
        if (!relOrdner && ORDNER.includes(d)) { setTimeout(pruefeBeobachter, 50); }
        melde(rel);
      });
      eintrag.w.on('error', () => { eintrag.tot = true; try { eintrag.w.close(); } catch {} });
      beobachter.set(relOrdner, eintrag);
    } catch (e) {
      log(`fs.watch ${relOrdner || '.'}: ${e.message}`);
      if (relOrdner === '' || relOrdner === 'kapitel') modus = 'abfrage';
    }
  };

  const pruefeBeobachter = () => {
    if (modus === 'abfrage') return;
    beobachte('', false);
    for (const o of ORDNER) beobachte(o, true);
    beobachte(BUILD, false);
  };

  // Abfrage: vergleicht mtime+size, meldet Neues, Geändertes und Gelöschtes
  const abfrage = () => {
    const jetzt = signaturen(root);
    for (const [k, v] of jetzt) if (letzte.get(k) !== v) melde(k, { vonAbfrage: true });
    for (const k of letzte.keys()) if (!jetzt.has(k)) melde(k, { vonAbfrage: true });
    letzte = jetzt;
  };

  pruefeBeobachter();
  let takt = 0;
  const intervall = setInterval(() => {
    takt++;
    if (modus === 'abfrage' || takt % 5 === 0) abfrage();
    if (takt % 5 === 0) pruefeBeobachter();
  }, 2000);
  intervall.unref();

  return {
    get modus() { return modus; },
    abfrage,
    stop() { clearInterval(intervall); clearTimeout(timer); for (const b of beobachter.values()) { try { b.w.close(); } catch {} } },
  };
}
