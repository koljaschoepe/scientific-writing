// Baut die Dashboard-Seite. Eine Seite für beide Modi:
//   live     vom Server ausgeliefert, Schreibknöpfe aktiv, Live-Aktualisierung
//   statisch dashboard.html im Projektordner, Daten eingebettet, nur lesen
// Die eigentliche Darstellung macht app.js im Browser aus window.__STAND__.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const lies = (name) => { try { return fs.readFileSync(path.join(HIER, name), 'utf8'); } catch { return ''; } };
const liesOpt = (datei) => { try { return fs.readFileSync(datei, 'utf8'); } catch { return ''; } };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// JSON sicher in <script> einbetten
const jsonImSkript = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'));

export function renderSeite(stand, { statisch = false, port = 4711, root = stand.root } = {}) {
  const css = lies('style.css');
  const js = lies('app.js');
  const titel = stand.titel ? `${stand.titel} · Dashboard` : 'Scientific Writing · Dashboard';
  const modus = { statisch, port, url: `http://127.0.0.1:${port}/` };
  // Eigene Anpassungen: live per Link (immer frisch), statisch eingebettet
  const eigeneCss = statisch
    ? `<style id="anpassungen-css">${liesOpt(path.join(root, 'arbeit', 'dashboard-anpassungen.css'))}</style>`
    : '<link rel="stylesheet" href="/anpassungen.css">';
  const eigeneJs = statisch
    ? `<script>${liesOpt(path.join(root, 'arbeit', 'dashboard-anpassungen.js')).replace(/<\/script/gi, '<\\/script')}</script>`
    : '<script src="/anpassungen.js"></script>';
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%227%22 fill=%22%231F5FBF%22/%3E%3Cpath d=%22M9 22l5-12 4 8 2-4 3 8%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222.4%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E">
<title>${esc(titel)}</title>
<style>${css}</style>
${eigeneCss}
</head>
<body class="${statisch ? 'statisch' : 'live'}">
<a class="sprung" href="#inhalt">Zum Inhalt springen</a>
<div id="app">
  <header id="kopf"></header>
  <nav id="reiter" aria-label="Bereiche"></nav>
  <section id="konfig" aria-label="Auftrag an Claude"></section>
  <main id="inhalt" tabindex="-1"></main>
</div>
<div id="toast" role="status" aria-live="polite"></div>
<noscript><p style="padding:2rem">Das Dashboard braucht JavaScript.</p></noscript>
<script>window.__STAND__=${jsonImSkript(stand)};window.__MODUS__=${jsonImSkript(modus)};</script>
<script>${js.replace(/<\/script/gi, '<\\/script')}</script>
${eigeneJs}
</body>
</html>
`;
}
