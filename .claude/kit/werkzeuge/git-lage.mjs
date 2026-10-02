// Lage des Git-Repos für Dashboard, Start-Hook und Systemcheck. Nur lesen, nie ändern.
//
// Zählt nur, wenn der Projektordner selbst die Wurzel des Repos ist. Liegt das Projekt
// in einem fremden Eltern-Repo (z. B. ~/ ist ein Repo), gilt es als "kein Repo" mit fremd: true,
// damit nie das Eltern-Repo gesichert wird.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gitToplevelIstRoot } from './lib.mjs';

function git(root, args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 5000 });
  return r.status === 0 ? (r.stdout || '').trim() : null;
}

// Zeitpunkt des letzten erfolgreichen /sync auf diesem Gerät (ISO) oder null.
// Quelle: .lokal/sync.json (ab v2.1), früher .git/scientific-writing-sync.
// Fallback: Datum des letzten Commits, der auf GitHub liegt.
export function letzterSync(root) {
  if (!gitToplevelIstRoot(root)) return null;
  try {
    const j = JSON.parse(readFileSync(join(root, '.lokal', 'sync.json'), 'utf8'));
    if (j && typeof j.zeit === 'string' && j.zeit) return j.zeit;
  } catch { /* noch nicht migriert oder nie synchronisiert */ }
  const gitDir = git(root, ['rev-parse', '--absolute-git-dir']);
  if (gitDir) {
    try {
      const wert = readFileSync(join(gitDir, 'scientific-writing-sync'), 'utf8').trim();
      if (wert) return wert;
    } catch { /* noch nie über /sync synchronisiert */ }
  }
  const zweig = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']) || 'main';
  return git(root, ['log', '-1', '--format=%cI', `origin/${zweig}`]);
}

// Kurzlage ohne Netzwerkzugriff: Repo? Remote? Wie viele ungesicherte Dateien?
export function gitLage(root) {
  if (git(root, ['rev-parse', '--is-inside-work-tree']) !== 'true') {
    return { repo: false, fremd: false, remote: null, ungesichert: 0, letzterSync: null };
  }
  if (!gitToplevelIstRoot(root)) {
    return { repo: false, fremd: true, remote: null, ungesichert: 0, letzterSync: null };
  }
  const status = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 5000 }).stdout || '';
  return {
    repo: true,
    fremd: false,
    remote: git(root, ['remote', 'get-url', 'origin']),
    ungesichert: status.split('\n').filter(Boolean).length,
    letzterSync: letzterSync(root),
  };
}

// Wie gitLage, aber höchstens alle maxAlterMs (Standard 60 s) wirklich abgefragt. Für Dashboard und Stand:
// git status kostet bei großen Ordnern spürbar, ein Stand entsteht aber bei jeder Dateiänderung neu.
const CACHE = new Map(); // root -> { zeit, wert }
export function gitLageGecached(root, maxAlterMs = 60000) {
  const c = CACHE.get(root);
  if (c && Date.now() - c.zeit < maxAlterMs) return c.wert;
  const wert = gitLage(root);
  CACHE.set(root, { zeit: Date.now(), wert });
  return wert;
}
// Nach einem eigenen Sync oder Commit: nächste Abfrage frisch
export function vergissGitLage(root) { CACHE.delete(root); }
