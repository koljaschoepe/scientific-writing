// PDF-Bau auf Knopfdruck: node .claude/kit/werkzeuge/pdf.mjs entwurf --json im Hintergrund.

import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { p } from '../../werkzeuge/lib.mjs';
import { journal } from './basis.mjs';
import { leseAenderungen } from './aenderungen.mjs';

const ZEITLIMIT_MS = 10 * 60 * 1000;

export function erzeugePdfBau(root, { beiEnde } = {}) {
  const z = { laeuft: false, gestartet: null, fertig: null, ok: null, meldung: '', datei: 'Arbeit.pdf', seiten: null };
  let kind = null;

  // Zeitpunkt des letzten erfolgreichen Baus: aus diesem Serverlauf, sonst Änderungszeit von Arbeit.pdf
  const letzterErfolg = () => {
    if (z.ok && z.fertig) return Date.parse(z.fertig);
    try { return fs.statSync(p(root, z.datei)).mtimeMs; } catch { return null; }
  };

  const zustand = () => {
    const seit = letzterErfolg();
    const geaendert_seit = leseAenderungen(root)
      .filter((a) => String(a.datei || '').startsWith('kapitel/') && (seit === null || Date.parse(a.zeit) > seit)).length;
    return { ...z, geaendert_seit };
  };

  const starte = () => {
    if (z.laeuft) return { gestartet: false };
    const skript = p(root, '.claude', 'kit', 'werkzeuge', 'pdf.mjs');
    Object.assign(z, { laeuft: true, gestartet: new Date().toISOString(), fertig: null, ok: null, meldung: 'PDF wird gebaut.', seiten: null });
    const ende = (ok, meldung, erg) => {
      if (!z.laeuft) return;
      Object.assign(z, { laeuft: false, fertig: new Date().toISOString(), ok, meldung });
      if (ok && erg?.pdf) z.datei = erg.pdf;
      if (erg?.seiten) z.seiten = erg.seiten;
      kind = null;
      journal(root, 'pdf', ok ? `PDF-Entwurf im Dashboard gebaut${z.seiten ? ` (${z.seiten} Seiten)` : ''}` : `PDF-Bau im Dashboard gescheitert: ${meldung}`);
      beiEnde?.(zustand());
    };
    if (!fs.existsSync(skript)) { setImmediate(() => ende(false, 'Das PDF-Werkzeug fehlt (.claude/kit/werkzeuge/pdf.mjs). Sag Claude: /hilfe reparieren')); return { gestartet: true }; }
    let aus = ''; let err = '';
    try {
      kind = spawn(process.execPath, [skript, 'entwurf', '--json'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { setImmediate(() => ende(false, `PDF-Werkzeug startet nicht: ${e.message}`)); return { gestartet: true }; }
    kind.stdout.on('data', (c) => { if (aus.length < 5e6) aus += c; });
    kind.stderr.on('data', (c) => { if (err.length < 1e5) err += c; });
    const wecker = setTimeout(() => { try { kind?.kill(); } catch {} ende(false, 'Der PDF-Bau hat länger als 10 Minuten gedauert und wurde abgebrochen.'); }, ZEITLIMIT_MS);
    wecker.unref();
    kind.on('error', (e) => { clearTimeout(wecker); ende(false, `PDF-Werkzeug startet nicht: ${e.message}`); });
    kind.on('close', () => {
      clearTimeout(wecker);
      let erg = null;
      try { const a = aus.indexOf('{'); erg = JSON.parse(aus.slice(a)); } catch {}
      if (!erg) return ende(false, (err.trim().split('\n').pop() || 'Das PDF-Werkzeug hat kein Ergebnis geliefert.').slice(0, 500));
      if (erg.ok) return ende(true, `PDF gebaut${erg.seiten ? `, ${erg.seiten} Seiten` : ''}.`, erg);
      const f = (erg.fehler || [])[0];
      let meldung = f ? [f.erklaerung, f.meldung].filter(Boolean)[0] : '';
      if (!meldung && erg.fehlende_werkzeuge?.length) {
        meldung = `Zum PDF-Bau fehlt auf diesem Rechner: ${erg.fehlende_werkzeuge.join(', ')}.${erg.hinweise?.[0] ? ' ' + erg.hinweise[0] : ''}`;
      }
      if (!meldung && erg.hinweise?.length) meldung = String(erg.hinweise[0]);
      ende(false, (meldung || 'Das PDF konnte nicht gebaut werden. Sag Claude: /pdf entwurf').slice(0, 800), erg);
    });
    return { gestartet: true };
  };

  const stop = () => { try { kind?.kill(); } catch {} };
  return { zustand, starte, stop };
}
