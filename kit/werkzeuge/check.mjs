#!/usr/bin/env node
// Systemcheck: Ist alles da, was das Kit braucht? Nur prüfen, nie ändern.
// Genutzt von /hilfe und /start. Reparaturen führt Claude nach Rückfrage aus.
//
//   node kit/werkzeuge/check.mjs          Tabelle für Menschen
//   node kit/werkzeuge/check.mjs --json   für Claude und das Dashboard
//
// Ergebnis je Punkt: { name, ok, wichtig, wert, hinweis, reparatur }
//   ok: true | false | null (null = nicht prüfbar oder nur Hinweis)
//   wichtig: true = ohne das geht ein Kernteil nicht

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statfsSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

function projektJson(root) {
  try { return JSON.parse(readFileSync(join(root, 'arbeit', 'projekt.json'), 'utf8')); } catch { return null; }
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
  const istRepo = gitV && lauf('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root }).out === 'true';
  const remote = istRepo ? lauf('git', ['remote', 'get-url', 'origin'], { cwd: root }) : { ok: false };
  add({
    name: 'Mit GitHub verbunden', wichtig: false, ok: istRepo && remote.ok, wert: remote.ok ? remote.out : null,
    hinweis: !istRepo ? 'Ordner ist noch kein Git-Repo' : remote.ok ? '' : 'noch kein GitHub-Ziel, /sync richtet es ein',
    reparatur: istRepo && remote.ok ? null : 'gh repo create <name> --private --source . --remote origin --push',
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
  let extension = null;
  if (codeV) {
    const l = lauf('code', ['--list-extensions']);
    extension = l.ok ? l.out.toLowerCase().split('\n').includes('anthropic.claude-code') : null;
  } else {
    const extDir = join(homedir(), '.vscode', 'extensions');
    if (existsSync(extDir)) {
      try {
        const { readdirSync } = await import('node:fs');
        extension = readdirSync(extDir).some((d) => d.toLowerCase().startsWith('anthropic.claude-code'));
      } catch { /* egal */ }
    }
  }
  add({
    name: 'VS Code', ok: codeV ? true : null, wert: codeV,
    hinweis: codeV ? '' : 'Befehl "code" nicht gefunden (kein Problem, wenn VS Code läuft)',
    reparatur: codeV ? null : installHinweis('Microsoft.VisualStudioCode', '--cask visual-studio-code'),
  });
  add({
    name: 'Claude-Erweiterung', ok: extension, wert: extension === null ? 'nicht prüfbar' : extension ? 'installiert' : 'fehlt',
    hinweis: extension === false ? 'nötig für die Knöpfe im Dashboard' : '',
    reparatur: extension === false ? 'code --install-extension anthropic.claude-code' : null,
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
  add({
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
