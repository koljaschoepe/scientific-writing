#!/usr/bin/env node
// Sichern und mit GitHub abgleichen. Manuell ausgelöst über /sync.
//
// Prinzip (aus ksync übernommen): erst lokal sichern, dann holen, dann hochladen.
// Nie force, nie stillschweigend eine Fassung verwerfen.
//
// Aufruf:
//   node .claude/kit/werkzeuge/sync.mjs              normaler Sync
//   node .claude/kit/werkzeuge/sync.mjs --merge      nach Konflikt: Zusammenführen starten, Konflikte bleiben stehen
//   node .claude/kit/werkzeuge/sync.mjs --abschliessen  nach Auflösung: committen und hochladen
//   node .claude/kit/werkzeuge/sync.mjs --abbrechen  Zusammenführen abbrechen, alles wie vorher
//   node .claude/kit/werkzeuge/sync.mjs --status     nur Lage melden, nichts ändern
//   --json                                   maschinenlesbare Ausgabe
//
// Exit-Codes:
//   0 synchron   1 Fehler   3 Konflikt   4 kein Repo oder kein GitHub-Ziel
//   5 Anmeldung fehlt   6 halbfertiges Zusammenführen liegt vor   7 zu große Dateien
//   8 Projektordner liegt in einem fremden Git-Repo (Eltern-Repo), nichts wurde angefasst
//   9 lokale Änderungen würden überschrieben (vorher gesichert, nichts verloren)

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, statSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gitToplevelIstRoot, lokal, schreibeJson, findeRoot } from './lib.mjs';

const ROOT = findeRoot(dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const ALS_JSON = argv.includes('--json');
const GRENZE_MB = 95;

function git(args, opts = {}) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', ...opts });
  return { ok: r.status === 0, code: r.status, roh: r.stdout || '', out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

function ende(code, ergebnis) {
  ergebnis.code = code;
  if (ALS_JSON) {
    process.stdout.write(JSON.stringify(ergebnis, null, 2) + '\n');
  } else {
    process.stdout.write(ergebnis.meldung + '\n');
    if (ergebnis.dateien?.length) process.stdout.write(ergebnis.dateien.map((d) => '  - ' + d).join('\n') + '\n');
    if (ergebnis.hinweis) process.stdout.write(ergebnis.hinweis + '\n');
  }
  process.exit(code);
}

function jetzt() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return { iso: d.toISOString(), lesbar: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}` };
}

// Letzter erfolgreicher Sync wird je Gerät in .lokal/sync.json vermerkt (gitignored), nicht in .arbeit/zustand.json.
// Grund: Ein Zeitstempel in einer synchronisierten Datei erzeugt bei zwei Geräten bei jedem
// Sync einen Konflikt. Die alte Datei .git/scientific-writing-sync wird dabei aufgeräumt.
// Lesen über .claude/kit/werkzeuge/git-lage.mjs.
function syncVermerken(iso) {
  try {
    schreibeJson(lokal(ROOT, 'sync.json'), { schema: 1, zeit: iso });
    const gitDir = git(['rev-parse', '--absolute-git-dir']).out;
    if (gitDir) { try { unlinkSync(join(gitDir, 'scientific-writing-sync')); } catch { /* gab es nicht */ } }
  } catch { /* nur Komfort */ }
}

function lokalSichern(nachricht) {
  const geaendert = geaenderteDateien();
  if (!geaendert.length) return { ok: true, neu: false };
  git(['add', '-A']);
  const c = git(['commit', '-m', nachricht || `Sync ${jetzt().lesbar}: ${zusammenfassung(geaendert)}`]);
  if (!c.ok) return { ok: false, err: c.err };
  return { ok: true, neu: true };
}

function ueberschreibFehler(text) {
  return /local changes to the following files would be overwritten|untracked working tree files would be overwritten|Your local changes would be overwritten|Please commit your changes or stash them/i.test(text);
}

function ueberschreibDateien(text) {
  const z = String(text).split(/\r?\n/);
  const aus = [];
  let an = false;
  for (const zeile of z) {
    if (/would be overwritten/i.test(zeile)) { an = true; continue; }
    if (an) { if (/^\s+\S/.test(zeile)) aus.push(zeile.trim()); else if (aus.length) break; }
  }
  return aus;
}

function zusammenfassung(pfade) {
  const bereiche = new Set();
  for (const p of pfade) {
    if (p.startsWith('kapitel/') || p.startsWith('.arbeit/plaene/')) bereiche.add('Kapitel');
    else if (p.startsWith('.arbeit/pruefung/')) bereiche.add('Prüfung');
    else if (p.startsWith('.arbeit/thema/') || p.startsWith('.arbeit/expose/') || p.startsWith('.arbeit/gliederung/')) bereiche.add('Konzept');
    else if (p.startsWith('.arbeit/betreuung/')) bereiche.add('Betreuung');
    else if (p === '.arbeit/plan.md') bereiche.add('Plan');
    else if (p === '.arbeit/einstellungen.md') bereiche.add('Einstellungen');
    else if (p.startsWith('quellen/')) bereiche.add('Quellen');
    else if (p.startsWith('code/') || p.startsWith('daten/')) bereiche.add('Code und Daten');
    else if (p.startsWith('abbildungen/')) bereiche.add('Abbildungen');
    else if (p.startsWith('.arbeit/latex/') || p === 'Arbeit.pdf') bereiche.add('PDF');
    else if (p.startsWith('.arbeit/')) bereiche.add('Notizen');
    else if (p.startsWith('.claude/') || p.startsWith('.vscode/')) bereiche.add('Kit');
    else bereiche.add('Sonstiges');
  }
  const liste = [...bereiche];
  return liste.length ? liste.join(', ') : 'Stand gesichert';
}

function geaenderteDateien() {
  const r = git(['status', '--porcelain', '-z', '--untracked-files=all']);
  if (!r.ok) return [];
  // Nicht trimmen: die erste Statusspalte kann ein Leerzeichen sein.
  return r.roh.split('\0').filter(Boolean).map((z) => z.slice(3));
}

function konfliktDateien() {
  const r = git(['diff', '--name-only', '--diff-filter=U']);
  return r.ok && r.out ? r.out.split('\n') : [];
}

function zuGrosseDateien(pfade) {
  const gross = [];
  for (const p of pfade) {
    try {
      const s = statSync(join(ROOT, p));
      if (s.isFile() && s.size > GRENZE_MB * 1024 * 1024) gross.push(`${p} (${Math.round(s.size / 1024 / 1024)} MB)`);
    } catch { /* gelöschte Datei */ }
  }
  return gross;
}

function laufendesZusammenfuehren() {
  const gitDir = git(['rev-parse', '--git-dir']).out;
  const abs = (n) => join(ROOT, gitDir, n);
  if (existsSync(abs('rebase-merge')) || existsSync(abs('rebase-apply'))) return 'rebase';
  if (existsSync(abs('MERGE_HEAD'))) return 'merge';
  return null;
}

function anmeldeFehler(text) {
  return /Authentication failed|could not read Username|Permission denied|403|terminal prompts disabled|Repository not found/i.test(text);
}

// ---------- Vorbedingungen ----------

if (!git(['rev-parse', '--is-inside-work-tree']).ok) {
  ende(4, {
    status: 'kein-repo',
    meldung: 'Dieser Ordner ist noch nicht mit Git verbunden.',
    hinweis: 'Claude kann das einrichten: git init, dann ein privates GitHub-Repo anlegen (gh repo create --private --source . --push).',
  });
}

// Nie ein Eltern-Repo sichern: der Projektordner selbst muss die Wurzel des Repos sein.
if (!gitToplevelIstRoot(ROOT)) {
  ende(8, {
    status: 'fremdes-repo', wurzel: git(['rev-parse', '--show-toplevel']).out,
    meldung: 'Dieser Projektordner liegt innerhalb eines anderen Git-Repos. /sync würde das falsche Repo sichern und bricht deshalb ab.',
    hinweis: 'Lösung: im Projektordner ein eigenes Repo anlegen (git init, dann gh repo create --private --source . --push) oder das Projekt aus dem fremden Repo herausverschieben.',
  });
}

// Gerätelokale Laufzeitdaten (.lokal/) gehören nie ins Repo, auch in Projekten von vor v2.1.
if (!argv.includes('--status')) try {
  const gi = join(ROOT, '.gitignore');
  const alt = existsSync(gi) ? readFileSync(gi, 'utf8') : '';
  if (!/^\/?\.lokal\/?\s*$/m.test(alt)) writeFileSync(gi, alt.replace(/\s*$/, '\n') + '\n# Gerätelokale Laufzeitdaten (Dashboard-Journal, PDF-Bau, letzter Sync)\n.lokal/\n', 'utf8');
} catch { /* nicht kritisch */ }

const zweig = git(['rev-parse', '--abbrev-ref', 'HEAD']).out || 'main';
const remote = git(['remote', 'get-url', 'origin']);
const offen = laufendesZusammenfuehren();

if (argv.includes('--abbrechen')) {
  if (offen === 'merge') git(['merge', '--abort']);
  else if (offen === 'rebase') git(['rebase', '--abort']);
  ende(0, { status: 'abgebrochen', meldung: 'Zusammenführen abgebrochen. Deine Dateien sind wie vor dem Versuch.' });
}

if (argv.includes('--status')) {
  const geaendert = geaenderteDateien();
  let hinter = 0, vor = 0;
  if (remote.ok && git(['fetch', '--quiet', 'origin']).ok) {
    const c = git(['rev-list', '--left-right', '--count', `HEAD...origin/${zweig}`]);
    if (c.ok) [vor, hinter] = c.out.split(/\s+/).map(Number);
  }
  ende(0, {
    status: 'lage', zweig, remote: remote.ok ? remote.out : null, offen,
    ungesichert: geaendert.length, nicht_hochgeladen: vor, neu_auf_github: hinter,
    meldung: `${geaendert.length} ungesicherte Änderungen, ${vor} lokale Sicherungen nicht hochgeladen, ${hinter} neue Stände auf GitHub.`,
  });
}

if (!remote.ok) {
  ende(4, {
    status: 'kein-remote',
    meldung: 'Es gibt noch kein GitHub-Ziel für diese Arbeit.',
    hinweis: 'Claude kann ein privates Repo anlegen: gh auth status prüfen, dann gh repo create <name> --private --source . --remote origin --push.',
  });
}

// ---------- Abschluss nach Konfliktlösung ----------

if (argv.includes('--abschliessen')) {
  // Aufgelöst ist eine Datei, sobald keine Konfliktmarkierungen mehr darin stehen.
  const kandidaten = [...new Set([...konfliktDateien(), ...geaenderteDateien()])];
  const markiert = kandidaten.filter((p) => {
    try { return /^<{7} |^>{7} /m.test(readFileSync(join(ROOT, p), 'utf8')); } catch { return false; }
  });
  if (markiert.length) {
    ende(3, { status: 'konflikt', meldung: 'In diesen Dateien stehen noch Konfliktmarkierungen (<<<<<<< / >>>>>>>):', dateien: markiert });
  }
  git(['add', '-A']);
  if (laufendesZusammenfuehren() === 'merge') {
    const c = git(['commit', '--no-edit']);
    if (!c.ok) ende(1, { status: 'fehler', meldung: 'Zusammenführen konnte nicht gesichert werden.', hinweis: c.err });
  }
  // danach normal weiter: push unten
}

// ---------- Zusammenführen nach Konflikt ----------

if (argv.includes('--merge')) {
  if (offen === 'merge') {
    ende(3, { status: 'konflikt', meldung: 'Zusammenführen läuft bereits. Offene Dateien:', dateien: konfliktDateien() });
  }
  // Vorher lokale Änderungen sichern, sonst verweigert git das Zusammenführen.
  const vorher = lokalSichern(`Sync ${jetzt().lesbar}: vor dem Zusammenführen gesichert`);
  if (!vorher.ok) {
    ende(1, { status: 'fehler', meldung: 'Deine lokalen Änderungen konnten vor dem Zusammenführen nicht gesichert werden. Nichts wurde zusammengeführt.', hinweis: vorher.err });
  }
  git(['fetch', '--quiet', 'origin']);
  const m = git(['merge', '--no-edit', `origin/${zweig}`]);
  if (m.ok) {
    // ohne Konflikt zusammengeführt, weiter zum Push
  } else if (ueberschreibFehler(m.err + '\n' + m.out)) {
    ende(9, {
      status: 'ueberschreiben', zweig, dateien: ueberschreibDateien(m.err + '\n' + m.out),
      meldung: 'Zusammenführen abgebrochen: Diese Dateien sind hier nicht gesichert und würden durch die GitHub-Fassung ersetzt. Nichts wurde verändert:',
      hinweis: 'Meist eine Datei, die git nicht sichern darf (z. B. in .gitignore) oder die ein anderes Programm gerade geöffnet hat. Datei schließen oder umbenennen, dann /sync noch einmal.',
    });
  } else {
    const dateien = konfliktDateien();
    ende(3, {
      status: 'konflikt', zweig, dateien,
      meldung: 'Beide Seiten haben dieselben Stellen geändert. Diese Dateien brauchen eine Entscheidung:',
      hinweis: 'Deine Fassung: git show :2:<datei> · GitHub-Fassung: git show :3:<datei>. Danach --abschliessen oder --abbrechen.',
    });
  }
} else if (offen && !argv.includes('--abschliessen')) {
  ende(6, {
    status: 'offen', art: offen, dateien: konfliktDateien(),
    meldung: 'Ein früheres Zusammenführen ist noch nicht abgeschlossen.',
    hinweis: 'Weiter mit --abschliessen (nach Auflösung) oder zurück mit --abbrechen.',
  });
}

// ---------- 1. Lokal sichern ----------

const zeit = jetzt();
let commitErstellt = false;
if (!argv.includes('--merge') && !argv.includes('--abschliessen')) {
  const geaendert = geaenderteDateien();
  const gross = zuGrosseDateien(geaendert);
  if (gross.length) {
    ende(7, {
      status: 'zu-gross', dateien: gross,
      meldung: `Diese Dateien sind größer als ${GRENZE_MB} MB. GitHub nimmt höchstens 100 MB pro Datei an:`,
      hinweis: 'Lösung: Datei verkleinern, außerhalb des Projekts ablegen oder in .gitignore eintragen. Nichts wurde gesichert.',
    });
  }
  if (geaendert.length) {
    const c = lokalSichern(`Sync ${zeit.lesbar}: ${zusammenfassung(geaendert)}`);
    if (!c.ok) {
      const ohneName = /Please tell me who you are|user\.email|user\.name/i.test(c.err);
      ende(1, {
        status: 'fehler',
        meldung: ohneName ? 'Git kennt deinen Namen noch nicht.' : 'Sichern hat nicht geklappt.',
        hinweis: ohneName ? 'Einmalig: git config --global user.name "Vorname Nachname" und git config --global user.email "adresse"' : c.err,
      });
    }
    commitErstellt = c.neu;
  }

  // ---------- 2. Holen ----------
  const f = git(['fetch', '--quiet', 'origin']);
  if (!f.ok) {
    ende(anmeldeFehler(f.err) ? 5 : 1, {
      status: anmeldeFehler(f.err) ? 'anmeldung' : 'fehler',
      meldung: anmeldeFehler(f.err)
        ? 'Lokal gesichert, aber GitHub lässt dich gerade nicht rein.'
        : 'Lokal gesichert, aber GitHub ist nicht erreichbar (Internet?).',
      hinweis: anmeldeFehler(f.err) ? 'Einmal neu anmelden: gh auth login --web, danach /sync wiederholen.' : f.err,
    });
  }
  const hatRemoteZweig = git(['rev-parse', '--verify', '--quiet', `origin/${zweig}`]).ok;
  if (hatRemoteZweig) {
    const r = git(['pull', '--rebase', '--autostash', 'origin', zweig]);
    if (!r.ok && ueberschreibFehler(r.err + '\n' + r.out)) {
      if (laufendesZusammenfuehren() === 'rebase') git(['rebase', '--abort']);
      ende(9, {
        status: 'ueberschreiben', zweig, dateien: ueberschreibDateien(r.err + '\n' + r.out),
        meldung: 'Lokal gesichert. Holen abgebrochen: Diese Dateien würden durch die GitHub-Fassung ersetzt. Nichts ist verloren:',
        hinweis: 'Meist eine Datei, die git nicht sichern darf (z. B. in .gitignore) oder die ein anderes Programm gerade geöffnet hat. Datei schließen oder umbenennen, dann /sync noch einmal.',
      });
    }
    if (!r.ok) {
      const dateien = konfliktDateien();
      git(['rebase', '--abort']);
      ende(3, {
        status: 'konflikt', zweig, dateien,
        meldung: 'Lokal gesichert. Auf GitHub gibt es einen neueren Stand, der dieselben Stellen ändert. Nichts ist verloren. Betroffen:',
        hinweis: 'Weiter mit: node .claude/kit/werkzeuge/sync.mjs --merge (Konflikte werden sichtbar, dann je Datei entscheiden).',
      });
    }
  }
}

// ---------- 3. Hochladen ----------

const hatUpstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']).ok;
const p = hatUpstream ? git(['push', 'origin', zweig]) : git(['push', '-u', 'origin', zweig]);
if (!p.ok) {
  const abgelehnt = /rejected|non-fast-forward|fetch first/i.test(p.err);
  ende(anmeldeFehler(p.err) ? 5 : abgelehnt ? 3 : 1, {
    status: anmeldeFehler(p.err) ? 'anmeldung' : abgelehnt ? 'konflikt' : 'fehler',
    meldung: anmeldeFehler(p.err)
      ? 'Lokal gesichert, Hochladen verweigert: Anmeldung fehlt oder ist abgelaufen.'
      : abgelehnt ? 'Auf GitHub ist inzwischen etwas Neues. Bitte /sync noch einmal starten.' : 'Lokal gesichert, Hochladen fehlgeschlagen.',
    hinweis: anmeldeFehler(p.err) ? 'gh auth login --web, danach /sync wiederholen.' : p.err,
  });
}

syncVermerken(zeit.iso);
const kurz = git(['log', '-1', '--format=%h %s']).out;
ende(0, {
  status: 'synchron', zweig, zeit: zeit.iso, neuer_commit: commitErstellt, letzter: kurz,
  meldung: argv.includes('--merge') || argv.includes('--abschliessen')
    ? `Beide Fassungen zusammengeführt und hochgeladen: ${kurz}`
    : commitErstellt ? `Gesichert und hochgeladen: ${kurz}` : 'Alles war schon gesichert. GitHub ist auf dem neuesten Stand.',
});
