#!/usr/bin/env node
// UserPromptSubmit-Hook: gibt Claude weiter, was die Person seit der letzten Antwort im Dashboard getan hat.
// Quelle: .lokal/journal.jsonl (vom Dashboard-Server geschrieben). Leer oder fehlend: keine Ausgabe, sofort exit 0.
// Nach dem Lesen ist das Journal leer. Nur Built-ins, keine Imports aus dem Kit (Tempo).
// Fail-open: endet immer mit exit 0.

import fs from 'node:fs';
import path from 'node:path';

const MAX_ZEILEN = 15;

function main() {
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const datei = path.join(root, '.lokal', 'journal.jsonl');
  let groesse = 0;
  try { groesse = fs.statSync(datei).size; } catch { return; }
  if (!groesse) return;

  // Erst umbenennen, dann lesen: was der Server danach anhängt, landet in einer neuen Datei und geht nicht verloren.
  const weg = `${datei}.${process.pid}.lesen`;
  try { fs.renameSync(datei, weg); } catch { return; }
  let roh = '';
  try { roh = fs.readFileSync(weg, 'utf8'); } catch {}
  try { fs.unlinkSync(weg); } catch {}

  const eintraege = [];
  for (const zeile of roh.split(/\r?\n/)) {
    if (!zeile.trim()) continue;
    try {
      const e = JSON.parse(zeile);
      if (e && typeof e.text === 'string' && e.text.trim()) eintraege.push(e);
    } catch { /* kaputte Zeile überspringen */ }
  }
  if (!eintraege.length) return;

  const uhr = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} `;
  };
  const zeigen = eintraege.length > MAX_ZEILEN ? eintraege.slice(-(MAX_ZEILEN - 1)) : eintraege;
  const rest = eintraege.slice(0, eintraege.length - zeigen.length);
  const zeilen = zeigen.map((e) => `- ${uhr(e.zeit)}${e.text.replace(/\s+/g, ' ').trim().slice(0, 200)}`);
  if (rest.length) {
    const arten = {};
    for (const e of rest) arten[e.aktion || 'sonstiges'] = (arten[e.aktion || 'sonstiges'] || 0) + 1;
    zeilen.unshift(`- (${rest.length} frühere Aktionen: ${Object.entries(arten).map(([a, n]) => `${n}x ${a}`).join(', ')})`);
  }
  const text = 'Seit deiner letzten Antwort im Dashboard:\n' + zeilen.join('\n') +
    '\nDateien sind die Wahrheit: bei Bedarf neu lesen, bevor du darauf aufbaust.';
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: text },
  }));
}

try { main(); } catch { /* fail-open */ }
process.exit(0);
