// Werkzeugkasten: Skills aus .claude/skills/*/SKILL.md mit Frontmatter.

import fs from 'node:fs';
import { p, leseText } from '../../werkzeuge/lib.mjs';
import { liesFrontmatterDatei, leseJsonLocker, ungueltig, nichtGefunden, liegtIn } from './basis.mjs';

const GRUPPEN = ['arbeit', 'quellen', 'technik'];
const NAME = /^[a-z0-9][a-z0-9._-]{0,63}$/i;

// Dateien, die mit dem Kit kommen (.claude/kit/manifest.json). Fehlt das Manifest, gilt nichts als eigen.
function kitDateien(root) {
  const m = leseJsonLocker(p(root, '.claude', 'kit', 'manifest.json'), null);
  if (!m) return null;
  const liste = Array.isArray(m) ? m : Array.isArray(m.dateien) ? m.dateien : Array.isArray(m.files) ? m.files
    : (m.dateien && typeof m.dateien === 'object') ? Object.keys(m.dateien) : [];
  return new Set(liste.map((x) => String(typeof x === 'string' ? x : x?.pfad || x?.path || '').replace(/\\/g, '/')));
}

function istEigen(kit, name) {
  if (!kit) return false;
  return !kit.has(`.claude/skills/${name}/SKILL.md`);
}

function skillDatei(root, name) { return p(root, '.claude', 'skills', name, 'SKILL.md'); }

export function ladeSkills(root) {
  const ordner = p(root, '.claude', 'skills');
  let namen = [];
  try { namen = fs.readdirSync(ordner, { withFileTypes: true }).filter((e) => e.isDirectory() && NAME.test(e.name)).map((e) => e.name); } catch { return []; }
  const kit = kitDateien(root);
  const erg = [];
  for (const ordnerName of namen.sort()) {
    const datei = skillDatei(root, ordnerName);
    if (!fs.existsSync(datei)) continue;
    const { daten } = liesFrontmatterDatei(leseText(datei, ''));
    const gruppe = GRUPPEN.includes(daten.gruppe) ? daten.gruppe : 'eigene';
    erg.push({
      name: String(daten.name || ordnerName),
      ordner: ordnerName,
      beschreibung: String(daten.description || daten.beschreibung || ''),
      gruppe,
      slash: daten['user-invocable'] !== false,
      auto: daten['disable-model-invocation'] !== true,
      eigen: istEigen(kit, ordnerName),
      argument: String(daten['argument-hint'] || ''),
    });
  }
  return erg;
}

export function leseSkill(root, name) {
  if (!NAME.test(String(name || ''))) throw ungueltig('Unbekannter Skill-Name.');
  // name kann Ordnername oder Frontmatter-Name sein
  let ordner = name;
  if (!fs.existsSync(skillDatei(root, ordner))) {
    const s = ladeSkills(root).find((x) => x.name === name);
    if (!s) throw nichtGefunden(`Skill ${name} gibt es nicht.`);
    ordner = s.ordner;
  }
  const datei = skillDatei(root, ordner);
  if (!liegtIn(p(root, '.claude', 'skills'), datei)) throw nichtGefunden(`Skill ${name} gibt es nicht.`);
  const inhalt = leseText(datei, '');
  const { daten } = liesFrontmatterDatei(inhalt);
  return {
    name: String(daten.name || ordner),
    beschreibung: String(daten.description || daten.beschreibung || ''),
    inhalt,
    pfad: `.claude/skills/${ordner}/SKILL.md`,
    eigen: istEigen(kitDateien(root), ordner),
    gruppe: GRUPPEN.includes(daten.gruppe) ? daten.gruppe : 'eigene',
  };
}
