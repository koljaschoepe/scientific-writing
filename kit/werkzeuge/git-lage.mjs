// Lage des Git-Repos für Dashboard, Start-Hook und Systemcheck. Nur lesen, nie ändern.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function git(root, args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? (r.stdout || '').trim() : null;
}

// Zeitpunkt des letzten erfolgreichen /sync auf diesem Gerät (ISO) oder null.
// Fallback: Datum des letzten Commits, der auf GitHub liegt.
export function letzterSync(root) {
  const gitDir = git(root, ['rev-parse', '--absolute-git-dir']);
  if (!gitDir) return null;
  try {
    const wert = readFileSync(join(gitDir, 'scientific-writing-sync'), 'utf8').trim();
    if (wert) return wert;
  } catch { /* noch nie über /sync synchronisiert */ }
  const zweig = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']) || 'main';
  return git(root, ['log', '-1', '--format=%cI', `origin/${zweig}`]);
}

// Kurzlage ohne Netzwerkzugriff: Repo? Remote? Wie viele ungesicherte Dateien?
export function gitLage(root) {
  if (git(root, ['rev-parse', '--is-inside-work-tree']) !== 'true') {
    return { repo: false, remote: null, ungesichert: 0, letzterSync: null };
  }
  const status = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).stdout || '';
  return {
    repo: true,
    remote: git(root, ['remote', 'get-url', 'origin']),
    ungesichert: status.split('\n').filter(Boolean).length,
    letzterSync: letzterSync(root),
  };
}
