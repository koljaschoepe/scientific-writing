// Endpunkte für Editor und PDF-Programm: POST /api/editor (Einstellung technik.editor umschalten) und
// POST /api/pdf/oeffnen (Arbeit, Exposé oder Quellen-PDF im PDF-Programm des Systems öffnen).

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import * as lib from '../../werkzeuge/lib.mjs';
import { editorLage, normEditor, EDITOR_WERTE } from '../../werkzeuge/editor.mjs';
import { journal, ungueltig, nichtGefunden, liegtIn } from './basis.mjs';

export function editorUmschalten(root, b) {
  const wunsch = normEditor(b.editor);
  if (!wunsch) throw ungueltig(`Unbekannter Editor. Erlaubt: ${EDITOR_WERTE.join(', ')}.`);
  const vorher = lib.leseEinstellungen(root).editor || 'automatisch';
  lib.setzeEinstellung(root, 'technik.editor', wunsch);
  const lage = editorLage(wunsch);
  if (normEditor(vorher) !== wunsch) {
    journal(root, 'editor', `Editor im Dashboard auf „${wunsch === 'automatisch' ? 'automatisch (' + lage.editor_name + ')' : lage.editor_name}“ gestellt`);
  }
  return { ok: true, ...lage, vorher: { editor: normEditor(vorher) || 'automatisch' } };
}

// Öffnet eine Datei im Standardprogramm. Windows über explorer.exe (keine cmd-Auswertung des Pfads).
function oeffneSystem(abs) {
  const opt = { detached: true, stdio: 'ignore', windowsHide: true };
  if (process.platform === 'win32') spawn('explorer.exe', [abs], opt).unref();
  else if (process.platform === 'darwin') spawn('open', [abs], opt).unref();
  else spawn('xdg-open', [abs], opt).unref();
}

// Körper: { art: 'arbeit' | 'expose' } oder { datei: 'Arbeit.pdf' | 'Arbeit-neu.pdf' | 'Expose.pdf' | 'quellen/pdfs/x.pdf' }
// oder { bibkey } (PDF der Quelle, auch aus dem file-Feld der bib außerhalb des Projekts). Andere Dateien: 404.
export function pdfOeffnen(root, b, stand, { oeffnen = oeffneSystem } = {}) {
  const pdf = stand?.pdf || {};
  let abs = null, anzeige = null;
  if (b.art === 'arbeit' || b.art === 'expose') {
    const x = b.art === 'arbeit' ? pdf.arbeit : pdf.expose;
    if (!x) throw nichtGefunden(b.art === 'arbeit' ? 'Es gibt noch kein PDF der Arbeit. Erst bauen: /pdf' : 'Es gibt noch kein Exposé-PDF. Erst bauen: /pdf expose');
    abs = path.join(root, x.datei); anzeige = x.datei;
  } else if (typeof b.bibkey === 'string' && b.bibkey) {
    const q = (stand?.quellen?.liste || []).find((x) => x.bibkey === b.bibkey && x.pdf_vorhanden);
    if (!q) throw nichtGefunden('Zu dieser Quelle gibt es kein PDF.');
    abs = q.pdf ? path.join(root, ...q.pdf.split('/')) : String(q.pdf_abs || '').replace(/^\/(?=[A-Za-z]:)/, '');
    anzeige = q.pdf || path.basename(abs);
  } else if (typeof b.datei === 'string' && b.datei) {
    const r = b.datei.replace(/\\/g, '/');
    const erlaubt = ['Arbeit.pdf', 'Arbeit-neu.pdf', 'Expose.pdf', 'Expose-neu.pdf'].includes(r)
      || (/^quellen\/pdfs\/[^/]+\.pdf$/i.test(r) && !r.includes('..'));
    if (!erlaubt) throw nichtGefunden('Diese Datei lässt sich hier nicht öffnen.');
    abs = path.join(root, ...r.split('/')); anzeige = r;
    if (r.startsWith('quellen/') && fs.existsSync(abs) && !liegtIn(path.join(root, 'quellen', 'pdfs'), abs)) throw nichtGefunden('Diese Datei lässt sich hier nicht öffnen.');
  } else throw ungueltig('Welche Datei? art (arbeit, expose), datei oder bibkey angeben.');
  let st;
  try { st = fs.statSync(abs); } catch { throw nichtGefunden(`${anzeige} gibt es nicht.`); }
  if (!st.isFile() || !/\.pdf$/i.test(abs)) throw nichtGefunden('Das ist keine PDF-Datei.');
  oeffnen(abs);
  return { ok: true, datei: anzeige };
}
