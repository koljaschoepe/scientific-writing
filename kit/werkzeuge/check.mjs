#!/usr/bin/env node
// Systemcheck: Ist alles da, was das Kit braucht? Prüft nur, außer mit --reparieren.
// Genutzt von /hilfe und /start. Reparaturen führt Claude nach Rückfrage aus.
//
//   node kit/werkzeuge/check.mjs               Tabelle für Menschen
//   node kit/werkzeuge/check.mjs --json        für Claude und das Dashboard
//   node kit/werkzeuge/check.mjs --reparieren  beschädigte JSON-Dateien aus <datei>.bak wiederherstellen
//                                              (die kaputte Fassung bleibt als <datei>.kaputt-<zeit> liegen)
//
// Exit-Codes: 0 ok, 5 (nur --reparieren) mindestens eine Datei ist noch beschädigt.
//
// Ergebnis je Punkt: { name, ok, wichtig, wert, hinweis, reparatur }
//   ok: true | false | null (null = nicht prüfbar oder nur Hinweis)
//   wichtig: true = ohne das geht ein Kernteil nicht

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statfsSync, readdirSync, renameSync, copyFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pruefeJsonText, gitToplevelIstRoot } from './lib.mjs';

const MIN_EXTENSION = '2.1.284'; // ab hier sind Links mit Umlauten im Chat klickbar

const WIN = platform() === 'win32';
const MAC = platform() === 'darwin';

function lauf(befehl, args = [], opts = {}) {
  try {
    const r = spawnSync(befehl, args, { encoding: 'utf8', timeout: 15000, shell: WIN, windowsHide: true, ...opts });
    if (r.error) return { ok: false, out: '', err: r.error.message };
    return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
  } catch (e) {
    return { ok: false, out: '', err: e.message };
  }
}

function version(befehl, args = ['--version']) {
  const r = lauf(befehl, args);
  return r.ok ? (r.out || r.err).split('\n')[0] : null;
}

function installHinweis(winget, brew) {
  return WIN ? `winget install --id ${winget} -e --accept-source-agreements --accept-package-agreements` : MAC ? `brew install ${brew}` : `Paketmanager: ${brew}`;
}

// undefined = fehlt, null = beschädigt
function projektJson(root) {
  let t;
  try { t = readFileSync(join(root, 'arbeit', 'projekt.json'), 'utf8'); } catch { return undefined; }
  try { return JSON.parse(t.replace(/^\uFEFF/, '')); } catch { return null; }
}

function vergleicheVersion(a, b) {
  const pa = String(a).split('.').map((x) => parseInt(x, 10) || 0), pb = String(b).split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

const KONFLIKT = /^(<{7}|>{7})(\s|$)/m;
const rel = (root, f) => relative(root, f).split(sep).join('/');

// Alle JSON-Dateien in arbeit/ und quellen/ (ohne pdfs/ und eingang/), dazu Konfliktmarker in Text-Dateien.
export function pruefeDateien(root) {
  const json = [], konflikte = [];
  const lauf = (ordner, tiefe = 0) => {
    let eintraege = [];
    try { eintraege = readdirSync(ordner, { withFileTypes: true }); } catch { return; }
    for (const e of eintraege) {
      if (e.name.startsWith('.')) continue;
      const f = join(ordner, e.name);
      if (e.isDirectory()) { if (tiefe < 4 && !['pdfs', 'eingang', 'node_modules'].includes(e.name)) lauf(f, tiefe + 1); continue; }
      if (!e.isFile()) continue;
      if (e.name.endsWith('.json')) {
        let t = '';
        try { t = readFileSync(f, 'utf8'); } catch { continue; }
        const fehler = pruefeJsonText(t);
        if (fehler) {
          let bak = null;
          try { const b = readFileSync(f + '.bak', 'utf8'); bak = pruefeJsonText(b) ? 'kaputt' : 'gueltig'; } catch { bak = null; }
          json.push({ datei: rel(root, f), grund: fehler.grund, konfliktmarker: fehler.konfliktmarker, bak });
        }
      } else if (/\.(md|bib|txt|tex)$/.test(e.name)) {
        try { if (KONFLIKT.test(readFileSync(f, 'utf8'))) konflikte.push(rel(root, f)); } catch {}
      }
    }
  };
  lauf(join(root, 'arbeit'));
  lauf(join(root, 'quellen'));
  return { json, konflikte };
}

function zeitStempel() {
  const d = new Date(); const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`;
}

// Kaputte JSON-Datei aus .bak wiederherstellen, wenn die Sicherung gültig ist.
// Die kaputte Fassung wird nie gelöscht, sondern als <datei>.kaputt-<zeit> behalten.
export function repariere(root) {
  const { json, konflikte } = pruefeDateien(root);
  const ergebnis = { repariert: [], offen: [], konflikte };
  for (const k of json) {
    const f = join(root, ...k.datei.split('/'));
    if (k.bak !== 'gueltig') {
      ergebnis.offen.push({ ...k, hinweis: k.bak === 'kaputt' ? 'Auch die Sicherung (.bak) ist beschädigt.' : 'Es gibt keine Sicherung (.bak).' });
      continue;
    }
    const kaputtName = `${f}.kaputt-${zeitStempel()}`;
    try {
      renameSync(f, kaputtName);
      copyFileSync(f + '.bak', f);
      ergebnis.repariert.push({ datei: k.datei, kaputt_behalten: rel(root, kaputtName) });
    } catch (e) {
      ergebnis.offen.push({ ...k, hinweis: `Wiederherstellen fehlgeschlagen: ${e.message}` });
    }
  }
  return ergebnis;
}

async function dashboardErreichbar(port) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(`http://127.0.0.1:${port}/api/ping`, { signal: ctrl.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    return false;
  }
}

export async function check(root = process.cwd()) {
  root = resolve(root);
  const e = [];
  const add = (x) => e.push({ ok: null, wichtig: false, wert: null, hinweis: '', reparatur: null, ...x });

  // Projektdateien lesbar? (JSON gültig, keine Konfliktmarker)
  const dateien = pruefeDateien(root);
  add({
    name: 'Projektdateien', wichtig: true, ok: dateien.json.length === 0,
    wert: dateien.json.length ? `beschädigt: ${dateien.json.map((x) => x.datei).join(', ')}` : 'alle JSON-Dateien lesbar',
    hinweis: dateien.json.length
      ? (dateien.json.some((x) => x.konfliktmarker) ? 'Konfliktmarker aus einem Sync. ' : '') +
        (dateien.json.every((x) => x.bak === 'gueltig') ? 'Eine gültige Sicherung (.bak) liegt daneben.' : 'Nicht für alle gibt es eine gültige Sicherung, dann von Hand reparieren.')
      : '',
    reparatur: dateien.json.length ? 'node kit/werkzeuge/check.mjs --reparieren' : null,
    dateien: dateien.json,
  });
  if (dateien.konflikte.length) {
    add({
      name: 'Konfliktmarker', wichtig: true, ok: false, wert: dateien.konflikte.join(', '),
      hinweis: 'In diesen Dateien stehen noch <<<<<<< / >>>>>>> aus einem Sync. Je Stelle entscheiden, welche Fassung bleibt.',
      reparatur: '/sync (Konflikt auflösen), danach node kit/werkzeuge/sync.mjs --abschliessen',
    });
  }

  // Node
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  add({
    name: 'Node.js', wichtig: true, ok: nodeMajor >= 20, wert: process.versions.node,
    hinweis: nodeMajor >= 20 ? 'für Dashboard, Werkzeuge und Browser-Zugriff' : 'Version 20 oder neuer nötig',
    reparatur: nodeMajor >= 20 ? null : installHinweis('OpenJS.NodeJS.LTS', 'node'),
  });

  // Git
  const gitV = version('git');
  const gitName = gitV ? lauf('git', ['config', '--get', 'user.name']).out : '';
  const gitMail = gitV ? lauf('git', ['config', '--get', 'user.email']).out : '';
  add({
    name: 'Git', wichtig: true, ok: !!gitV, wert: gitV,
    hinweis: gitV ? 'Versionsverwaltung, Grundlage für /sync' : 'fehlt, ohne Git kein Backup',
    reparatur: gitV ? null : installHinweis('Git.Git', 'git'),
  });
  if (gitV) {
    add({
      name: 'Git kennt deinen Namen', wichtig: true, ok: !!(gitName && gitMail), wert: gitName ? `${gitName} <${gitMail}>` : null,
      hinweis: gitName && gitMail ? '' : 'nötig, damit Sicherungen einen Autor haben',
      reparatur: gitName && gitMail ? null : 'git config --global user.name "Vorname Nachname" && git config --global user.email "adresse@beispiel.de"',
    });
  }

  // GitHub CLI
  const ghV = version('gh');
  let ghAuth = false, ghKonto = null;
  if (ghV) {
    const s = lauf('gh', ['auth', 'status']);
    ghAuth = s.ok;
    const m = (s.out + '\n' + s.err).match(/account (\S+)/);
    ghKonto = m ? m[1] : null;
  }
  add({
    name: 'GitHub-Anmeldung', wichtig: true, ok: ghV ? ghAuth : false,
    wert: ghV ? (ghAuth ? `angemeldet${ghKonto ? ' als ' + ghKonto : ''}` : 'nicht angemeldet') : null,
    hinweis: !ghV ? 'GitHub CLI fehlt' : ghAuth ? '' : 'für /sync nötig',
    reparatur: !ghV ? installHinweis('GitHub.cli', 'gh') : ghAuth ? null : 'gh auth login --web --git-protocol https',
  });

  // Git-Repo und Remote
  const inRepo = gitV && lauf('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root }).out === 'true';
  const istRepo = inRepo && gitToplevelIstRoot(root);
  const fremd = inRepo && !istRepo;
  const remote = istRepo ? lauf('git', ['remote', 'get-url', 'origin'], { cwd: root }) : { ok: false };
  add({
    name: 'Mit GitHub verbunden', wichtig: fremd, ok: istRepo && remote.ok, wert: remote.ok ? remote.out : null,
    hinweis: fremd ? 'Der Ordner liegt in einem fremden Git-Repo. /sync bricht deshalb ab und sichert nichts.'
      : !istRepo ? 'Ordner ist noch kein Git-Repo' : remote.ok ? '' : 'noch kein GitHub-Ziel, /sync richtet es ein',
    reparatur: istRepo && remote.ok ? null : fremd ? 'im Projektordner: git init, dann gh repo create <name> --private --source . --remote origin --push'
      : 'gh repo create <name> --private --source . --remote origin --push',
  });

  // letzter Sync
  if (istRepo) {
    try {
      const { letzterSync } = await import(pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), 'git-lage.mjs')).href);
      const ls = letzterSync(root);
      const tage = ls ? Math.floor((Date.now() - new Date(ls).getTime()) / 86400000) : null;
      add({
        name: 'Letzter Sync', ok: tage === null ? false : tage <= 2, wert: ls ? `vor ${tage} Tag${tage === 1 ? '' : 'en'}` : 'noch nie',
        hinweis: tage !== null && tage <= 2 ? '' : 'Arbeit nur auf diesem Rechner. /sync sichert sie auf GitHub.',
        reparatur: tage !== null && tage <= 2 ? null : '/sync',
      });
    } catch { /* git-lage fehlt */ }
  }

  // Pandoc
  const pandocV = version('pandoc');
  add({
    name: 'Pandoc', wichtig: true, ok: !!pandocV, wert: pandocV,
    hinweis: pandocV ? 'wandelt Kapitel in LaTeX um' : 'fehlt, /pdf braucht es',
    reparatur: pandocV ? null : installHinweis('JohnMacFarlane.Pandoc', 'pandoc'),
  });

  // LaTeX
  const lualatex = version('lualatex');
  const biber = version('biber');
  const tectonic = version('tectonic');
  const latexOk = !!(lualatex && biber) || !!tectonic;
  add({
    name: 'LaTeX', wichtig: true, ok: latexOk,
    wert: lualatex ? `${lualatex.slice(0, 40)}${biber ? ', biber da' : ', biber fehlt'}` : tectonic || null,
    hinweis: latexOk ? 'baut das PDF' : lualatex && !biber ? 'biber fehlt (Literaturverzeichnis)' : 'fehlt, /pdf braucht es',
    reparatur: latexOk ? null : WIN ? installHinweis('MiKTeX.MiKTeX', 'mactex-no-gui') + '  danach: initexmf --set-config-value [MPM]AutoInstall=1' : MAC ? 'brew install --cask mactex-no-gui' : 'TeX Live installieren',
  });

  // uv (Python)
  const uvV = version('uv');
  add({
    name: 'uv (Python)', ok: !!uvV, wert: uvV,
    hinweis: uvV ? 'für Code, Auswertungen und Plots' : 'nur nötig für den Code-Teil',
    reparatur: uvV ? null : installHinweis('astral-sh.uv', 'uv'),
  });

  // VS Code CLI und Claude-Extension
  const codeV = version('code');
  let extension = null, extVersion = null;
  if (codeV) {
    const l = lauf('code', ['--list-extensions', '--show-versions']);
    if (l.ok) {
      const zeile = l.out.split('\n').map((z) => z.trim()).find((z) => z.toLowerCase().startsWith('anthropic.claude-code@'));
      extension = !!zeile;
      extVersion = zeile ? zeile.split('@')[1] : null;
    }
  }
  if (extension === null) {
    // Ohne "code"-Befehl: Erweiterungsordner von VS Code (auch Insiders) und Cursor ansehen, höchste Version zählt.
    const versionen = [];
    for (const d of ['.vscode', '.vscode-insiders', '.cursor']) {
      try {
        for (const n of readdirSync(join(homedir(), d, 'extensions'))) {
          const m = /^anthropic\.claude-code-(\d+\.\d+\.\d+)/i.exec(n);
          if (m) versionen.push(m[1]);
        }
      } catch { /* Editor nicht installiert */ }
    }
    if (versionen.length) { extension = true; extVersion = versionen.sort(vergleicheVersion).pop(); }
  }
  const zuAlt = extension && extVersion ? vergleicheVersion(extVersion, MIN_EXTENSION) < 0 : false;
  add({
    name: 'VS Code', ok: codeV ? true : null, wert: codeV,
    hinweis: codeV ? '' : 'Befehl "code" nicht gefunden (kein Problem, wenn VS Code läuft)',
    reparatur: codeV ? null : installHinweis('Microsoft.VisualStudioCode', '--cask visual-studio-code'),
  });
  add({
    name: 'Claude-Erweiterung', ok: extension === null ? null : extension && !zuAlt,
    wert: extension === null ? 'nicht prüfbar' : extension ? `installiert${extVersion ? ' ' + extVersion : ''}` : 'fehlt',
    hinweis: extension === false ? 'nötig für die Knöpfe im Dashboard'
      : zuAlt ? `Version ${MIN_EXTENSION} oder neuer nötig, sonst sind Links zu Dateien mit Umlauten im Chat nicht klickbar` : '',
    reparatur: extension === false ? 'code --install-extension anthropic.claude-code'
      : zuAlt ? 'In VS Code: Erweiterungen, Claude Code, Aktualisieren (oder: code --install-extension anthropic.claude-code --force)' : null,
  });

  // Dashboard
  // Der Server weicht bei belegtem Port aus und merkt sich den echten Port.
  let port = projektJson(root)?.dashboard?.port || 4711;
  try {
    const { laufInfo } = await import(pathToFileURL(join(root, 'kit', 'dashboard', 'server.mjs')).href);
    port = laufInfo(root)?.port || port;
  } catch {}
  const dash = await dashboardErreichbar(port);
  add({
    name: 'Dashboard', ok: dash, wert: dash ? `http://127.0.0.1:${port}/` : 'läuft nicht',
    hinweis: dash ? '' : 'startet automatisch beim Öffnen, sonst /dashboard',
    reparatur: dash ? null : 'node kit/dashboard/server.mjs',
  });

  // Speicherplatz
  try {
    const s = statfsSync(root);
    const gb = (s.bavail * s.bsize) / 1024 ** 3;
    add({
      name: 'Freier Speicher', ok: gb >= 5, wert: `${gb.toFixed(1)} GB`,
      hinweis: gb >= 5 ? '' : 'knapp, LaTeX und PDFs brauchen Platz',
    });
  } catch { /* nicht überall verfügbar */ }

  // Synchronisierter Ordner (OneDrive, iCloud, Dropbox): zwei Sync-Systeme streiten sich
  const pfad = root.replace(/\\/g, '/');
  const cloud = /OneDrive|Mobile Documents|iCloud|Dropbox|Google Drive|GoogleDrive/i.exec(pfad);
  add({
    name: 'Speicherort', ok: cloud ? false : true, wert: root,
    hinweis: cloud ? `liegt in ${cloud[0]}. Das kann mit Git kollidieren (doppelte Dateien, Sperren). Besser ein lokaler Ordner, z. B. ${WIN ? 'C:\\Users\\<Name>\\Arbeit' : '~/Arbeit'}` : '',
  });

  // Projekt eingerichtet?
  const pj = projektJson(root);
  add(pj === null ? {
    name: 'Projekt eingerichtet', ok: false, wert: 'arbeit/projekt.json beschädigt',
    hinweis: 'Nicht neu einrichten, sonst gehen deine Angaben verloren. Erst reparieren.',
    reparatur: 'node kit/werkzeuge/check.mjs --reparieren',
  } : {
    name: 'Projekt eingerichtet', ok: pj ? !!pj.eingerichtet : false, wert: pj?.arbeit?.titel || null,
    hinweis: pj?.eingerichtet ? '' : 'noch nicht, starte mit /start',
    reparatur: pj?.eingerichtet ? null : '/start',
  });

  return e;
}

// CLI
const istDirekt = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (istDirekt) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  if (process.argv.includes('--reparieren')) {
    const r = repariere(resolve(root));
    if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(r, null, 2) + '\n');
    else {
      if (!r.repariert.length && !r.offen.length) process.stdout.write('Alle JSON-Dateien sind lesbar. Nichts zu reparieren.\n');
      for (const x of r.repariert) process.stdout.write(`Wiederhergestellt: ${x.datei} aus der Sicherung. Die kaputte Fassung liegt als ${x.kaputt_behalten}.\n`);
      for (const x of r.offen) process.stdout.write(`Noch beschädigt: ${x.datei}. ${x.hinweis} Grund: ${x.grund}\n`);
      if (r.konflikte.length) process.stdout.write(`Konfliktmarker in: ${r.konflikte.join(', ')} (je Stelle entscheiden, dann /sync).\n`);
    }
    process.exit(r.offen.length ? 5 : 0);
  }
  const ergebnis = await check(root);
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(ergebnis, null, 2) + '\n');
  } else {
    const zeichen = (ok) => (ok === true ? 'OK   ' : ok === false ? 'FEHLT' : '  -  ');
    const breite = Math.max(...ergebnis.map((x) => x.name.length));
    for (const x of ergebnis) {
      const rest = [x.wert, x.hinweis].filter(Boolean).join(' · ');
      process.stdout.write(`${zeichen(x.ok)}  ${x.name.padEnd(breite)}  ${rest}\n`);
      if (x.ok === false && x.reparatur) process.stdout.write(`${' '.repeat(breite + 9)}Lösung: ${x.reparatur}\n`);
    }
    const kritisch = ergebnis.filter((x) => x.wichtig && x.ok === false);
    process.stdout.write(kritisch.length ? `\n${kritisch.length} wichtige Punkte fehlen.\n` : '\nAlles Wichtige ist da.\n');
  }
}
