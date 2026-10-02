/* Scientific Writing Dashboard, Browser-Teil. Kein Build, keine Abhängigkeiten zur Laufzeit.
   pdf.js (vendor/pdfjs) und KaTeX mit mhchem (vendor/katex) werden nur live und nur bei Bedarf nachgeladen.
   Daten: window.__STAND__, Modus: window.__MODUS__ ({ statisch, port, url, api, vendor }).
   Vertrag mit dem Server: .claude/kit/dashboard/API.md, Abschnitt v3.
   Eigene Erweiterungen gehören nach .arbeit/dashboard-anpassungen.js. Dort steht window.SW bereit:
   SW.stand(), SW.neuZeichnen(), SW.auftrag(cmd, text, sofort), SW.anhaengen(obj), SW.reiter(id), SW.toast(text, rueckgaengig), SW.panel(hash). */
(function () {
  'use strict';

  const MODUS = window.__MODUS__ || { statisch: true, port: 4711 };
  let S = window.__STAND__ || {};
  const LIVE = !MODUS.statisch;
  const VENDOR = LIVE && MODUS.vendor ? MODUS.vendor : null;
  const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const STRG = MAC ? '⌘' : 'Strg';

  // ---------- Feste Texte ----------
  // Die wichtigsten Befehle in Alltagssprache. Reihenfolge = Reihenfolge im Werkzeugkasten.
  const COMMANDS = [
    { cmd: 'weiter', gruppe: 'schreiben', titel: 'Weitermachen', kurz: 'Claude schaut, wo du stehst, und macht mit dir den nächsten Schritt.',
      wann: 'Jeden Tag zum Einstieg. Thema, Exposé, Gliederung, Kapitel: Claude führt dich der Reihe nach durch.', bsp: '/weiter' },
    { cmd: 'schreiben', gruppe: 'schreiben', titel: 'Kapitel schreiben', kurz: 'Ein Kapitel planen, schreiben oder überarbeiten.',
      wann: 'Wenn ein bestimmtes Kapitel dran ist. Hast du selbst etwas geschrieben, überarbeitet ihr es gemeinsam.', bsp: '/schreiben 2.1' },
    { cmd: 'pruefen', gruppe: 'schreiben', titel: 'Kapitel prüfen', kurz: 'Sprache, Zitate, Argumentation und Umfang prüfen lassen.',
      wann: 'Wenn ein Entwurf steht. Erst nach der Prüfung lässt sich ein Kapitel freigeben.', bsp: '/pruefen 2.1' },
    { cmd: 'start', gruppe: 'schreiben', titel: 'Einrichten', kurz: 'Projekt einrichten oder Angaben ändern.',
      wann: 'Einmal am Anfang. Später, wenn sich Abgabe, Umfang oder Betreuung ändern.', bsp: '/start' },
    { cmd: 'recherche', gruppe: 'quellen', titel: 'Literatur suchen', kurz: 'Claude sucht Fachliteratur und legt Vorschläge unter Quellen ab.',
      wann: 'Wenn dir Belege fehlen. Du entscheidest danach: nehmen, später oder verwerfen.', bsp: '/recherche Hydrierung von Nitroaromaten' },
    { cmd: 'quellen', gruppe: 'quellen', titel: 'Quellen verarbeiten', kurz: 'Genommene Quellen eintragen, PDFs holen und auswerten.',
      wann: 'Nachdem du Vorschläge genommen oder Dateien hochgeladen hast.', bsp: '/quellen' },
    { cmd: 'pdf', gruppe: 'sichern', titel: 'PDF bauen', kurz: 'Aus allen Kapiteln das PDF deiner Arbeit bauen.',
      wann: 'Wenn du das Ganze sehen oder an die Betreuung schicken willst. „entwurf“ baut auch mit Lücken.', bsp: '/pdf entwurf' },
    { cmd: 'sync', gruppe: 'sichern', titel: 'Sichern', kurz: 'Deinen Stand online sichern und mit anderen Geräten abgleichen.',
      wann: 'Am Ende jedes Arbeitstags.', bsp: '/sync' },
    { cmd: 'hilfe', gruppe: 'technik', titel: 'Hilfe', kurz: 'Wo stehe ich, was jetzt, etwas geht nicht.',
      wann: 'Wenn etwas hakt. Claude prüft die Technik und repariert, was geht.', bsp: '/hilfe das PDF baut nicht' },
    { cmd: 'update', gruppe: 'technik', titel: 'Aktualisieren', kurz: 'Neue Version dieses Werkzeugs holen.',
      wann: 'Wenn Claude eine neue Version meldet. Deine Texte und Quellen bleiben unberührt.', bsp: '/update' },
    { cmd: 'dashboard', gruppe: 'technik', titel: 'Dashboard', kurz: 'Diese Seite öffnen oder nach deinen Wünschen umbauen.',
      wann: 'Wenn die Seite nicht läuft oder dir etwas fehlt.', bsp: '/dashboard anpassen zeig die Quellen nach Kapitel' },
  ];
  const GRUPPEN = [['schreiben', 'Schreiben'], ['quellen', 'Quellen'], ['sichern', 'PDF und Sichern'], ['technik', 'Technik'], ['eigene', 'Eigene']];
  const REITER = [['uebersicht', 'Übersicht'], ['quellen', 'Quellen'], ['kapitel', 'Gliederung'], ['plan', 'Plan'], ['hilfe', 'Hilfe']];
  const KAPITEL_STATUS = ['offen', 'geplant', 'entwurf', 'geprueft', 'final'];
  const STATUS_NAME = { offen: 'Offen', geplant: 'Geplant', entwurf: 'Entwurf', geprueft: 'Geprüft', final: 'Freigegeben' };
  const MARKIERUNGEN = [['kernquelle', 'Kernquelle'], ['methodik', 'Methodik'], ['daten', 'Daten'], ['review', 'Übersicht'], ['kritisch', 'Kritisch'],
    ['definition', 'Definition'], ['gegenposition', 'Gegenposition']];
  const QFILTER = [['vorschlag', 'Vorschläge'], ['genommen', 'Genommen'], ['spaeter', 'Später'], ['verworfen', 'Verworfen']];
  const QSTATUS_TOAST = { genommen: 'Genommen', spaeter: 'Auf später gelegt', verworfen: 'Verworfen', vorschlag: 'Zurück bei den Vorschlägen' };
  const DOK_NAMEN = { 'befehle': 'Alle Befehle', 'dashboard': 'Das Dashboard', 'eigene-hochschule': 'Eigene Hochschule einrichten',
    'erste-schritte': 'Erste Schritte', 'fuer-betreuer': 'Für Betreuerinnen und Betreuer', 'github-und-sync': 'Sichern mit GitHub',
    'installation-mac': 'Installation auf dem Mac', 'installation-windows': 'Installation unter Windows', 'probleme': 'Wenn etwas nicht geht',
    'quellen-und-recherche': 'Quellen und Recherche' };
  const CHECK_ERKL = { 'Pandoc': 'macht aus deinen Kapiteln das PDF', 'LaTeX': 'setzt das PDF', 'uv (Python)': 'für Auswertungen und Diagramme',
    'Git': 'merkt sich jede Fassung deiner Arbeit', 'GitHub-Anmeldung': 'für die Online-Sicherung', 'Mit GitHub verbunden': 'Ziel der Online-Sicherung',
    'Letzter Sync': 'wann zuletzt online gesichert', 'Claude-Erweiterung': 'Claude im Editor', 'Speicherort': 'Cloud-Ordner machen Probleme' };
  const faq = () => [
    ['Wie schicke ich Claude etwas?',
      `Schreib oben in die Eingabe, was Claude tun soll, oder tipp / und wähl einen Befehl. Der Kreis links an einer Zeile legt ein Kapitel, eine Quelle oder einen Termin als Bezug dazu. Enter öffnet Claude in ${ED()} mit dem fertigen Text, dort drückst du noch einmal Enter.`],
    ['Ich drücke Enter, aber Claude öffnet sich nicht.',
      `Dann blockiert der Browser den Sprung nach ${ED()}. Die Nachricht liegt nach etwa 1,5 Sekunden automatisch in der Zwischenablage. Öffne in ${ED()} das Claude-Fenster und füge sie mit ${STRG}+V ein.`],
    ['Was bedeutet der Regler „Rückfragen“?',
      'Bei 0 arbeitet Claude selbstständig und fragt nicht nach. Bei 1 bis 5 stellt Claude dir höchstens so viele Fragen, bevor es loslegt. Die Einstellung merkt sich die Seite.'],
    ['Ich will etwas rückgängig machen.',
      'Im Dashboard: „Rückgängig“ im Hinweis unten rechts oder die Taste Z. In Claude: /rewind setzt Gespräch und Dateiänderungen zurück. Ältere Stände holt Claude aus der Online-Sicherung (/sync).'],
    ['Oben steht „Keine Verbindung“.',
      'Das Dashboard-Programm läuft nicht mehr, zum Beispiel nach einem Neustart. Gib in Claude /dashboard ein. Die Seite verbindet sich danach von selbst wieder.'],
    ['Wie ändere ich Abgabe, Umfang oder Zitierstil?',
      `Alle Angaben stehen in einer Datei. Klick in der Übersicht unter „Angaben“ auf einen Wert, dann öffnet sie sich in ${ED()}. Oder sag es Claude, zum Beispiel: „Die Arbeit soll 70 bis 90 Seiten haben.“`],
    ['Ich komme nicht an ein Paper (Login der Bibliothek).',
      'Sag Claude, welches Paper du brauchst. Es öffnet einen Browser, du meldest dich selbst bei der Bibliothek an, danach lädt Claude den Volltext. Passwörter gibst du nie an Claude weiter.'],
  ];

  // ---------- UI-Zustand (pro Browser gemerkt, nie wichtig) ----------
  const UI_SCHLUESSEL = 'sw-dashboard-ui-4';
  const ui = Object.assign({ reiter: 'uebersicht', filter: 'vorschlag', qabgleich: '', suche: '', sortierung: 'relevanz', offen: [], anhaenge: [], text: '', bausteineAuf: false },
    (() => { try { return JSON.parse(localStorage.getItem(UI_SCHLUESSEL) || '{}'); } catch { return {}; } })());
  if (!Array.isArray(ui.offen)) ui.offen = [];
  if (!Array.isArray(ui.anhaenge)) ui.anhaenge = [];
  if (typeof ui.text !== 'string') ui.text = '';
  if (!REITER.some(([id]) => id === ui.reiter)) ui.reiter = 'uebersicht';
  const merke = () => { try { localStorage.setItem(UI_SCHLUESSEL, JSON.stringify(ui)); } catch {} };
  // Rückfragen 0 bis 5 und Darstellung: eigene Schlüssel, damit sie einen Wechsel des UI-Formats überstehen
  const RF_SCHLUESSEL = 'sw-dashboard-rueckfragen';
  let rueckfragen = (() => { try { const r = localStorage.getItem(RF_SCHLUESSEL); const v = Number(r); return r !== null && Number.isInteger(v) && v >= 0 && v <= 5 ? v : 2; } catch { return 2; } })();
  const THEMA_SCHLUESSEL = 'sw-dashboard-thema';
  let thema = (() => { try { const t = localStorage.getItem(THEMA_SCHLUESSEL); return t === 'dunkel' || t === 'hell' ? t : 'system'; } catch { return 'system'; } })();
  function setzeThema(t) {
    thema = t;
    if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t === 'hell' ? 'light' : 'dark';
    try { localStorage.setItem(THEMA_SCHLUESSEL, t); } catch {}
  }
  setzeThema(thema);

  let offline = false;
  let verbunden = false;
  let checkErgebnis = null;
  let hervorheben = null;
  let sperreBis = 0;

  // ---------- Hilfen ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (x) => { const v = Number(x); return Number.isFinite(v) ? v : 0; };
  const hat = (x) => x !== null && x !== undefined && x !== '' && Number.isFinite(Number(x));
  const zahl = (x) => (hat(x) ? Number(x).toLocaleString('de-DE') : '–');
  const dez = (x) => (hat(x) ? Number(x).toLocaleString('de-DE', { maximumFractionDigits: 1 }) : '–');
  const plural = (n, eins, viele) => `${zahl(n)} ${num(n) === 1 ? eins : viele}`;
  const zwei = (n) => String(n).padStart(2, '0');
  const isoTag = (d) => `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
  const parseTag = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const MONATE = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
  const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const datumDe = (s) => { const d = parseTag(s); return d ? `${d.getDate()}. ${MONATE[d.getMonth()]} ${d.getFullYear()}` : String(s || ''); };
  const datumMitTag = (s) => { const d = parseTag(s); return d ? `${WT[d.getDay()]}, ${d.getDate()}. ${MONATE[d.getMonth()]} ${d.getFullYear()}` : String(s || ''); };
  const reduziert = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const warte = (ms) => new Promise((r) => setTimeout(r, reduziert() ? 0 : ms));
  const cssEsc = (s) => (window.CSS && CSS.escape ? CSS.escape(String(s)) : String(s).replace(/["\\]/g, '\\$&'));
  const dateiName = (rel) => String(rel || '').split('/').pop();
  const kapSlug = (nr) => String(nr).replace(/\./g, '-');

  function relTage(t) {
    if (!hat(t)) return '';
    t = Number(t);
    if (t === 0) return 'heute';
    if (t === 1) return 'morgen';
    if (t === -1) return 'gestern';
    return t > 0 ? `in ${t} Tagen` : `vor ${-t} Tagen`;
  }
  function uhrzeit(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    const zeit = `${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
    const heute = isoTag(new Date()); const tag = isoTag(d);
    const gestern = new Date(); gestern.setDate(gestern.getDate() - 1);
    return tag === heute ? `heute, ${zeit}` : tag === isoTag(gestern) ? `gestern, ${zeit}` : `${datumDe(tag)}, ${zeit}`;
  }
  function relZeit(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    const s = (Date.now() - d.getTime()) / 1000;
    if (s < 50) return 'gerade eben';
    if (s < 3600) return `vor ${Math.max(1, Math.round(s / 60))} Min.`;
    if (s < 6 * 3600) { const n = Math.round(s / 3600); return `vor ${n} ${n === 1 ? 'Stunde' : 'Stunden'}`; }
    return uhrzeit(iso);
  }
  function autorKurz(q) {
    const a = Array.isArray(q.autoren) ? q.autoren : [];
    const nach = (x) => String(x).split(',')[0].trim();
    if (!a.length) return '';
    return a.length === 1 ? nach(a[0]) : a.length === 2 ? `${nach(a[0])} und ${nach(a[1])}` : `${nach(a[0])} et al.`;
  }
  function sichereUrl(u) {
    try { const x = new URL(String(u || '')); return x.protocol === 'http:' || x.protocol === 'https:' ? x.href : ''; } catch { return ''; }
  }
  // Editor (VS Code oder Cursor, API v3.1): Name und Link-Präfixe kommen aus dem Stand
  const ED = () => S.editor_name || 'VS Code';
  const imEditor = (zusatz = '') => `In ${ED()} öffnen${zusatz}`;
  // Datei an einer Zeile öffnen (API v3: stand.vscode + encodeURI(abs) + ':' + zeile)
  function absVon(rel) {
    const basis = String(S.root_abs || ('/' + String(S.root || '').replace(/\\/g, '/').replace(/^\/+/, ''))).replace(/\/+$/, '');
    return `${basis}/${String(rel || '').replace(/\\/g, '/').replace(/^\/+/, '')}`;
  }
  function vscode(abs, zeile) {
    if (!abs) return '';
    return (S.vscode || 'vscode://file') + encodeURI(abs).replace(/#/g, '%23').replace(/\?/g, '%3F') + ':' + (num(zeile) || 1);
  }
  const vscodeRel = (rel, zeile) => vscode(absVon(rel), zeile);
  const textLink = (rel, zeile, text, abs) => `<a href="${h(abs ? vscode(abs, zeile) : vscodeRel(rel, zeile))}" title="${h(imEditor())}">${h(text)}</a>`;
  const dateiLink = (rel, zeile, text, abs) => `<a class="datei-link" href="${h(abs ? vscode(abs, zeile) : vscodeRel(rel, zeile))}" title="${h(imEditor(zeile ? ', Zeile ' + num(zeile) : ''))}">${h(text || dateiName(rel))}${num(zeile) > 1 ? `:${num(zeile)}` : ''}</a>`;

  const ICONS = {
    senden: '<path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    terminal: '<path d="M4 5h16v14H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 10l2.5 2L8 14M13 14.5h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    thema: '<circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 4.5a7.5 7.5 0 0 1 0 15z" fill="currentColor"/>',
    extern: '<path d="M14 5h5v5M19 5l-8 8M17 14v5H5V7h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    eingabe: '<path d="M5 7l4 4-4 4M11 17h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    kopieren: '<rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    klammer: '<path d="M20 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    haken: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    stern: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="currentColor"/>',
    x: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    muell: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    buch: '<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z M12 6v13.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    code: '<path d="M9 7l-5 5 5 5M15 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    pfeil: '<path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    minus: '<path d="M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    breite: '<path d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    neu: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    zitat: '<path d="M6 17c-1-1-1.5-2.3-1.5-4 0-3 2-5.5 5-6.5l.5 1.3C8.4 8.6 7.5 10 7.5 11h2.5v6zm8 0c-1-1-1.5-2.3-1.5-4 0-3 2-5.5 5-6.5l.5 1.3c-1.6.8-2.5 2.2-2.5 3.2H18v6z" fill="currentColor"/>',
    claude: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3h0a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    anhaengen: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 7.5v6M9 10.5h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    pruefen: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
    stift: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  };
  const icon = (name, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"${extra}>${ICONS[name] || ''}</svg>`;
  const ikLink = (href, ic, label, extra = '') => `<a class="ik" href="${h(href)}" title="${h(label)}" aria-label="${h(label)}"${extra}>${icon(ic)}</a>`;

  // ---------- Hinweise unten rechts (gestapelt, mit Rückgängig) ----------
  const toasts = [];
  let toastNr = 0;
  function toast(text, rueckgaengig, dauer) {
    const box = $('#toast'); if (!box) return;
    const t = { id: ++toastNr, zurueck: typeof rueckgaengig === 'function' ? rueckgaengig : null };
    const d = dauer || (t.zurueck ? 8000 : 4500);
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.setProperty('--dauer-toast', d + 'ms');
    el.innerHTML = `<span class="toast-text">${h(text)}</span>`
      + (t.zurueck ? `<button type="button" class="knopf klein" data-a="toast-zurueck" data-t="${t.id}" title="Rückgängig (Taste Z)">Rückgängig</button>` : '')
      + `<button type="button" class="icon-knopf" data-a="toast-zu" data-t="${t.id}" aria-label="Hinweis schließen">${icon('x')}</button>`
      + (t.zurueck ? '<i class="countdown" aria-hidden="true"></i>' : '');
    box.appendChild(el);
    t.el = el;
    toasts.push(t);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('an')));
    t.timer = setTimeout(() => entferneToast(t.id), d);
    while (toasts.length > 4) entferneToast(toasts[0].id);
  }
  function entferneToast(id) {
    const i = toasts.findIndex((x) => x.id === id); if (i < 0) return;
    const t = toasts[i]; toasts.splice(i, 1); clearTimeout(t.timer);
    t.el.classList.remove('an'); t.el.classList.add('weg');
    setTimeout(() => t.el.remove(), reduziert() ? 0 : 200);
  }
  function macheRueckgaengig(id) {
    const t = id ? toasts.find((x) => x.id === id) : [...toasts].reverse().find((x) => x.zurueck);
    if (!t || !t.zurueck) return false;
    const f = t.zurueck; t.zurueck = null; entferneToast(t.id);
    Promise.resolve().then(f).then(() => toast('Rückgängig gemacht.', null, 2500)).catch((e) => toast(e.message));
    return true;
  }

  // ---------- Netz ----------
  const NICHT_ERREICHBAR = 'Keine Verbindung zum Dashboard. Gib in Claude /dashboard ein, dann geht es weiter.';
  function setzeOffline(an) {
    if (offline === an) return;
    offline = an;
    document.body.classList.toggle('offline', an);
    zeichneKopf();
    zeichneOfflineHinweis();
    $$('.schreibt').forEach((b) => { b.disabled = an; });
  }
  async function anfrage(methode, pfad, daten, extra) {
    let r;
    try {
      r = await fetch(pfad, methode === 'GET' ? { cache: 'no-store' }
        : Object.assign({ method: methode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(daten ?? {}) }, extra));
    } catch {
      setzeOffline(true);
      const e = new Error(NICHT_ERREICHBAR); e.code = 'offline'; throw e;
    }
    setzeOffline(false);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(j.fehler || `Das Dashboard meldet einen Fehler (${r.status}).`);
      e.code = j.code || ''; e.status = r.status; throw e;
    }
    return j;
  }
  const post = (pfad, daten, extra) => anfrage('POST', pfad, daten, extra);
  const holeJson = (pfad) => anfrage('GET', pfad);

  async function kopiereText(text) {
    try {
      const ok = await Promise.race([navigator.clipboard.writeText(text).then(() => true), new Promise((r) => setTimeout(() => r(false), 800))]);
      if (ok) return true;
    } catch {}
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.className = 'unsichtbar';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {}
    ta.remove();
    return ok;
  }

  // ---------- Bausteine: worauf sich die Nachricht bezieht ----------
  // Kapitel, Quelle, Termin, Absatz, Textstelle oder Datei. Der Kreis links an einer Zeile legt sie in die Eingabe.
  function aKapitel(k) {
    return { key: 'kapitel:' + k.nr, art: 'Kapitel', label: `${k.nr} ${k.titel || ''}`.trim(),
      prompt: `Kapitel ${k.nr}${k.titel ? ` „${k.titel}“` : ''} ([${dateiName(k.datei)}](${k.datei}))` };
  }
  function aQuelle(q) {
    const wer = [autorKurz(q), q.jahr].filter(Boolean).join(', ');
    return { key: 'quelle:' + q.id, art: 'Quelle', label: q.titel || q.id,
      prompt: `Quelle ${q.bibkey || q.doi || q.id}: „${q.titel || ''}“${wer ? ` (${wer})` : ''}` };
  }
  function aDatei(pfad, label) { return { key: 'datei:' + pfad, art: 'Datei', label: label || dateiName(pfad), prompt: `Datei [${dateiName(pfad)}](${pfad})` }; }
  function aTermin(z) {
    const art = z.art === 'meilenstein' ? 'Meilenstein' : z.art === 'abgabe' ? 'Abgabe' : 'Termin';
    const kap = z.art === 'meilenstein' && (z.kapitel || []).length && !(z.kapitel || []).includes('alle') ? `, Kapitel ${z.kapitel.join(', ')} bis „${STATUS_NAME[z.status] || z.status || ''}“` : '';
    return { key: 'termin:' + z.id, art, label: z.text,
      prompt: `${art} „${z.text}“ am ${datumDe(z.datum)}${z.zeit ? ', ' + z.zeit + ' Uhr' : ''}${kap}` };
  }
  function aAbsatz(datei, a) {
    const anfang = String(a.text || '').replace(/\s+/g, ' ').replace(/^#+\s*/, '').slice(0, 60);
    const nr = absatzNr(a);
    return { key: `absatz:${datei}:${a.i}`, art: 'Absatz', label: `${dateiName(datei)}, ${nr ? 'Absatz ' + nr : 'Überschrift'}`,
      prompt: `${nr ? 'Absatz ' + nr : 'Überschrift'} in [${dateiName(datei)}](${datei}), Zeile ${num(a.zeile) || '?'}, beginnt mit „${anfang}${String(a.text || '').length > 60 ? ' …' : ''}“` };
  }
  function aPdfStelle(quelle, seite, text) {
    const kurz = String(text).replace(/\s+/g, ' ').slice(0, 300);
    const wo = quelle ? quelle.bibkey || quelle.id : 'Arbeit.pdf';
    return { key: `pdf:${wo}:${seite}:${kurz.slice(0, 20)}`, art: 'Textstelle', label: `${wo}, S. ${seite}`,
      prompt: `${quelle ? 'Quelle ' + wo : 'Arbeit.pdf'}, Seite ${seite}: „${kurz}${text.length > 300 ? ' …' : ''}“` };
  }
  const istGewaehlt = (key) => ui.anhaenge.some((x) => x.key === key);
  // Kreis: gefüllt, wenn die Zeile in der Eingabe liegt. Mehrere gleichzeitig möglich.
  function kreis(b) {
    if (!b) return '<span class="kreis-platz" aria-hidden="true"></span>';
    const an = istGewaehlt(b.key);
    return `<button type="button" class="kreis${an ? ' an' : ''}" data-a="kreis" data-key="${h(b.key)}" data-b="${h(JSON.stringify(b))}" aria-pressed="${an}"
      title="${an ? 'Aus der Eingabe nehmen' : 'In die Eingabe übernehmen'}" aria-label="Als Bezug in die Eingabe: ${h(b.label)}"></button>`;
  }
  function markiereKreise() {
    const an = new Set(ui.anhaenge.map((x) => x.key));
    $$('[data-a="kreis"]').forEach((k) => {
      const ja = an.has(k.dataset.key);
      k.classList.toggle('an', ja); k.setAttribute('aria-pressed', String(ja));
      k.title = ja ? 'Aus der Eingabe nehmen' : 'In die Eingabe übernehmen';
      k.closest('.zeile')?.classList.toggle('gewaehlt', ja);
    });
  }
  function bausteinSchalten(b) {
    const i = ui.anhaenge.findIndex((x) => x.key === b.key);
    if (i >= 0) ui.anhaenge.splice(i, 1); else ui.anhaenge.push(b);
    merke(); zeichneBausteine(); markiereKreise();
  }
  function anhaengen(b, text) {
    if (!istGewaehlt(b.key)) ui.anhaenge.push(b);
    if (text && !String(ui.text || '').trim()) setzeText(text);
    merke(); zeichneBausteine(); markiereKreise(); fokusEingabe();
  }

  // ---------- Nachricht bauen und an Claude geben ----------
  const rueckfragenSatz = (n = rueckfragen) => (n === 0 ? 'Arbeite selbstständig ohne Rückfragen.'
    : `Stell mir bis zu ${n} ${n === 1 ? 'Rückfrage' : 'Rückfragen'} mit dem Interview-Tool.`);
  const rueckfragenWort = (n = rueckfragen) => (n === 0 ? 'keine' : `bis ${n}`);
  function baueNachricht(text = ui.text, bausteine = ui.anhaenge) {
    let t = String(text || '').trim();
    if (bausteine.length) t += (t ? '\n\n' : '') + 'Bezug:\n' + bausteine.map((b, i) => `${i + 1}. ${b.prompt}`).join('\n');
    return t ? `${t}\n\n${rueckfragenSatz()}` : '';
  }
  function oeffneClaude(prompt) {
    const a = document.createElement('a');
    a.href = (S.claude_uri || 'vscode://anthropic.claude-code/open?prompt=') + encodeURIComponent(prompt);
    a.rel = 'noopener'; a.className = 'unsichtbar';
    document.body.appendChild(a); a.click(); a.remove();
  }
  async function senden(prompt) {
    if (!prompt) return false;
    if (prompt.length > 2000) {
      const ok = await kopiereText(prompt);
      toast(ok ? `Die Nachricht ist lang und liegt deshalb in der Zwischenablage. In Claude mit ${STRG}+V einfügen.` : 'Kopieren ging nicht. Markiere die Nachricht und kopiere sie selbst.', null, 7000);
      return true;
    }
    let reagiert = false;
    const gesehen = () => { reagiert = true; };
    window.addEventListener('blur', gesehen, { once: true });
    document.addEventListener('visibilitychange', gesehen, { once: true });
    oeffneClaude(prompt);
    toast(`Claude öffnet sich in ${ED()}. Dort Enter drücken.`);
    setTimeout(async () => {
      window.removeEventListener('blur', gesehen);
      document.removeEventListener('visibilitychange', gesehen);
      if (reagiert) return;
      const ok = await kopiereText(prompt);
      toast(ok ? `Öffnet sich nichts? Die Nachricht liegt in der Zwischenablage. In Claude mit ${STRG}+V einfügen.` : `Öffnet sich nichts? Öffne Claude in ${ED()} und schreib die Nachricht dort.`, null, 7000);
    }, 1500);
    return true;
  }
  // Eingabe abschicken: Text, Bausteine und Rückfragen-Satz. Danach ist die Eingabe leer.
  function sendeEingabe() {
    const p = baueNachricht();
    if (!p) { fokusEingabe(); toast('Schreib, was Claude tun soll, oder tipp / für einen Befehl.'); return; }
    senden(p);
    ui.text = ''; ui.anhaenge = []; ui.bausteineAuf = false; merke();
    const feld = $('#prompt'); if (feld) { feld.value = ''; passeHoeheAn(feld); }
    zeichneBausteine(); markiereKreise(); schliesseWahl();
  }
  // Terminal-Icon an einer Zeile: startet sofort, ohne die Eingabe anzufassen
  const starte = (prompt) => senden(baueNachricht(prompt, []));
  function auftrag(cmd, text = '', sofort = false) {
    cmd = String(cmd || '').replace(/^\//, '');
    const p = ((cmd ? '/' + cmd + ' ' : '') + (text || '')).trim();
    if (sofort) { starte(p); return; }
    setzeText(p ? p + ' ' : ''); fokusEingabe();
  }
  function skills() {
    const vonServer = Array.isArray(S.skills) && S.skills.length ? S.skills : COMMANDS.map((c) => ({ name: c.cmd, beschreibung: c.kurz, slash: true }));
    const liste = vonServer.filter((s) => s.slash !== false).map((s) => {
      const c = COMMANDS.find((x) => x.cmd === s.name);
      return { ...s, gruppe: c ? c.gruppe : 'eigene', titel: c?.titel || s.name, kurz: c?.kurz || s.beschreibung || '', wann: c?.wann || '', bsp: c?.bsp || '' };
    });
    const pos = (s) => { const i = COMMANDS.findIndex((c) => c.cmd === s.name); return i < 0 ? 99 : i; };
    return liste.sort((a, b) => pos(a) - pos(b) || a.name.localeCompare(b.name));
  }

  // ---------- Die eine Eingabe (oben auf jedem Reiter) ----------
  const BAUSTEINE_SICHTBAR = 3;
  function baueKonfig() {
    const box = $('#konfig');
    box.setAttribute('aria-label', 'Nachricht an Claude');
    box.innerHTML = `<div class="konfig-innen">
      <div class="eingabe" id="eingabe">
        <div class="bausteine" id="bausteine" aria-label="Bezüge"></div>
        <div class="eingabe-zeile">
          <span class="prompt-zeichen" aria-hidden="true">›</span>
          <textarea id="prompt" rows="1" placeholder="Was soll Claude tun?   / für Befehle" aria-label="Nachricht an Claude" aria-autocomplete="list" aria-controls="wahl-liste" aria-expanded="false" spellcheck="true"></textarea>
        </div>
        <div class="eingabe-fuss">
          <button type="button" class="ik" data-a="datei-menue" title="Datei anhängen" aria-label="Datei anhängen" aria-haspopup="listbox">${icon('klammer')}</button>
          <label class="rueckfragen" title="Wie viele Fragen Claude dir höchstens stellt, bevor es loslegt. 0 heißt: selbstständig arbeiten.">
            <span class="rf-name">Rückfragen</span>
            <input type="range" id="rueckfragen" min="0" max="5" step="1" value="${rueckfragen}">
            <output id="rf-wert" for="rueckfragen">${rueckfragenWort()}</output>
          </label>
          <button type="button" class="ik text" data-a="befehle" aria-haspopup="listbox" title="Befehl wählen (/)"><span class="mono">/</span><span class="ik-wort">Befehl</span></button>
          <span class="luecke"></span>
          <span class="eingabe-hilfe">Enter senden · Shift+Enter neue Zeile</span>
          <button type="button" class="senden" data-a="senden" title="An Claude in ${h(ED())} geben (Enter)" aria-label="An Claude in ${h(ED())} geben">${icon('senden')}</button>
        </div>
      </div>
      <div class="wahl" id="wahl" hidden>
        <input type="search" id="wahl-suche" autocomplete="off" aria-label="Suchen" aria-controls="wahl-liste">
        <ul id="wahl-liste" role="listbox" aria-label="Auswahl"></ul>
      </div>
      <input type="file" id="datei-wahl" multiple hidden>
    </div>`;
    const p = $('#prompt');
    p.value = ui.text || '';
    passeHoeheAn(p);
    p.addEventListener('input', () => { ui.text = p.value; merke(); passeHoeheAn(p); pruefeSlash(); });
    p.addEventListener('keydown', eingabeTaste);
    const r = $('#rueckfragen');
    const male = () => {
      r.style.setProperty('--anteil', (rueckfragen / 5 * 100) + '%');
      r.setAttribute('aria-valuetext', rueckfragen === 0 ? 'keine Rückfragen, Claude arbeitet selbstständig' : `bis zu ${rueckfragen} Rückfragen`);
      $('#rf-wert').textContent = rueckfragenWort();
      r.closest('.rueckfragen').classList.toggle('null', rueckfragen === 0);
    };
    r.addEventListener('input', () => { rueckfragen = Number(r.value); try { localStorage.setItem(RF_SCHLUESSEL, String(rueckfragen)); } catch {} male(); });
    male();
    const s = $('#wahl-suche');
    s.addEventListener('input', () => { wahl.filter = s.value; wahl.zeiger = 0; zeichneWahl(); });
    s.addEventListener('keydown', wahlTaste);
    zeichneBausteine();
  }
  function zeichneKonfig() {
    const p = $('#prompt');
    if (p && p.value !== (ui.text || '')) { p.value = ui.text || ''; passeHoeheAn(p); }
    zeichneBausteine();
  }
  function zeichneBausteine() {
    const box = $('#bausteine'); if (!box) return;
    const n = ui.anhaenge.length;
    box.hidden = !n;
    const auf = ui.bausteineAuf || n <= BAUSTEINE_SICHTBAR + 1;
    const sichtbar = auf ? ui.anhaenge : ui.anhaenge.slice(0, BAUSTEINE_SICHTBAR);
    box.innerHTML = sichtbar.map((b, i) => `<div class="baustein" title="${h(b.prompt)}"><span class="b-nr">${i + 1}</span>
        <span class="b-label">${h(b.label)}</span><span class="b-art">${h(b.art)}</span>
        <button type="button" class="ik klein" data-a="baustein-weg" data-i="${i}" aria-label="Entfernen: ${h(b.label)}" title="Entfernen">${icon('x')}</button></div>`).join('')
      + (n > 1 ? `<div class="b-fuss">${n > BAUSTEINE_SICHTBAR + 1 ? `<button type="button" class="link-knopf" data-a="bausteine-auf">${ui.bausteineAuf ? 'weniger zeigen' : `+${n - BAUSTEINE_SICHTBAR} weitere`}</button>` : ''}
        <button type="button" class="link-knopf" data-a="bausteine-weg">alle entfernen</button></div>` : '');
  }
  function passeHoeheAn(p) { p.style.height = 'auto'; p.style.height = Math.min(180, p.scrollHeight) + 'px'; }
  function setzeText(t) {
    ui.text = t; merke();
    const p = $('#prompt'); if (p) { p.value = t; passeHoeheAn(p); }
  }
  function fokusEingabe() {
    const p = $('#prompt'); if (!p) return;
    requestAnimationFrame(() => { p.focus({ preventScroll: true }); p.setSelectionRange(p.value.length, p.value.length); });
  }

  // ---------- Auswahlliste: Befehle (/) und Dateien (Büroklammer) ----------
  const wahl = { art: null, tippen: false, filter: '', zeiger: 0, eintraege: [] };
  const GRUPPE_NAME = Object.fromEntries(GRUPPEN);
  function wahlEintraege() {
    const f = String(wahl.filter || '').trim().toLowerCase();
    const passt = (...t) => !f || t.join(' ').toLowerCase().includes(f);
    if (wahl.art === 'befehl') {
      // Treffer im Befehlsnamen zuerst, dann im Titel, dann in der Beschreibung
      const rang = (s) => (!f ? 0 : s.name.toLowerCase().startsWith(f) ? 0 : s.name.toLowerCase().includes(f) ? 1 : s.titel.toLowerCase().includes(f) ? 2 : 3);
      return skills().filter((s) => passt(s.name, s.titel, s.kurz)).map((s, i) => ({ s, i })).sort((a, b) => rang(a.s) - rang(b.s) || a.i - b.i).map((x) => x.s)
        .map((s) => ({ typ: 'befehl', name: s.name, titel: s.titel, kurz: s.kurz, arg: s.argument || '', gruppe: GRUPPE_NAME[s.gruppe] || 'Eigene' }));
    }
    const dateien = [];
    const dazu = (pfad, titel, gruppe) => { if (pfad && !dateien.some((d) => d.pfad === pfad)) dateien.push({ typ: 'datei', pfad, titel, gruppe }); };
    (S.kapitel || []).filter((k) => k.datei && k.vorhanden !== false).forEach((k) => dazu(k.datei, `${k.nr} ${k.titel || ''}`.trim(), 'Kapitel'));
    const d = S.dokumente || {};
    [['thema', 'Thema'], ['expose', 'Exposé'], ['gliederung', 'Gliederung'], ['stil', 'Dein Stil'], ['tagebuch', 'Tagebuch']].forEach(([id, n]) => dazu(d[id]?.pfad, n, 'Dokumente'));
    dazu(S.einstellungen?.pfad, 'Einstellungen', 'Dokumente');
    dazu(S.plan?.pfad, 'Plan', 'Dokumente');
    (S.quellen?.liste || []).filter((q) => q.rel?.notiz).forEach((q) => dazu(q.rel.notiz, `Notiz: ${q.titel || q.bibkey}`, 'Quellen-Notizen'));
    (S.quellen?.eingang || []).forEach((e) => dazu(e.pfad || 'quellen/eingang/' + e.name, e.name, 'Eingang'));
    const liste = dateien.filter((x) => passt(x.titel, x.pfad));
    return (LIVE && passt('hochladen computer pdf') ? [{ typ: 'upload', titel: 'Vom Computer hochladen …', kurz: 'landet in quellen/eingang', gruppe: 'Neu' }] : []).concat(liste);
  }
  function oeffneWahl(art, tippen) {
    wahl.art = art; wahl.tippen = !!tippen; wahl.zeiger = 0;
    wahl.filter = tippen ? (String(ui.text || '').match(/^\/(\S*)/) || [])[1] || '' : '';
    const box = $('#wahl'); box.hidden = false; box.classList.toggle('getippt', !!tippen);
    const s = $('#wahl-suche');
    s.value = wahl.filter; s.placeholder = art === 'befehl' ? 'Befehl suchen' : 'Datei suchen';
    s.hidden = !!tippen;
    $('#prompt').setAttribute('aria-expanded', 'true');
    zeichneWahl();
    if (!tippen) requestAnimationFrame(() => s.focus({ preventScroll: true }));
  }
  function schliesseWahl(fokus) {
    const box = $('#wahl'); if (!box || box.hidden) return;
    box.hidden = true; wahl.art = null;
    $('#prompt')?.setAttribute('aria-expanded', 'false');
    $('#prompt')?.removeAttribute('aria-activedescendant');
    if (fokus) fokusEingabe();
  }
  function zeichneWahl() {
    const liste = $('#wahl-liste'); if (!liste) return;
    wahl.eintraege = wahlEintraege();
    wahl.zeiger = Math.max(0, Math.min(wahl.zeiger, wahl.eintraege.length - 1));
    let gruppe = '';
    liste.innerHTML = wahl.eintraege.map((e, i) => {
      const kopf = e.gruppe !== gruppe ? `<li class="w-gruppe" role="presentation">${h((gruppe = e.gruppe))}</li>` : '';
      const an = i === wahl.zeiger;
      if (e.typ === 'befehl') {
        return `${kopf}<li role="option" id="wahl-${i}" class="w-eintrag" data-a="wahl-nimm" data-i="${i}" aria-selected="${an}">
          <span class="w-zeile"><span class="w-cmd">/${h(e.name)}</span><span class="w-titel">${h(e.titel)}</span>${e.arg ? `<span class="w-arg">${h(e.arg)}</span>` : ''}</span>
          ${e.kurz ? `<span class="w-kurz">${h(e.kurz)}</span>` : ''}</li>`;
      }
      return `${kopf}<li role="option" id="wahl-${i}" class="w-eintrag" data-a="wahl-nimm" data-i="${i}" aria-selected="${an}">
        <span class="w-zeile"><span class="w-titel">${h(e.titel)}</span><span class="w-arg">${h(e.typ === 'upload' ? e.kurz : e.pfad)}</span></span></li>`;
    }).join('') || `<li class="w-leer" role="presentation">${wahl.art === 'befehl' ? 'Kein Befehl passt. Enter schickt den Text so, wie er ist.' : 'Keine Datei passt.'}</li>`;
    const akt = $('#wahl-' + wahl.zeiger);
    if (akt) { $('#prompt').setAttribute('aria-activedescendant', akt.id); akt.scrollIntoView({ block: 'nearest' }); }
  }
  function nimmWahl(i) {
    const e = wahl.eintraege[i]; if (!e) return;
    if (e.typ === 'befehl') {
      const rest = String(ui.text || '').replace(/^\/\S*\s*/, '');
      setzeText(`/${e.name} ${rest}`);
      schliesseWahl(true);
    } else if (e.typ === 'upload') {
      schliesseWahl(false); $('#datei-wahl')?.click();
    } else {
      schliesseWahl(true); anhaengen(aDatei(e.pfad, e.titel));
    }
  }
  function pruefeSlash() {
    const t = String(ui.text || '');
    if (/^\/\S*$/.test(t)) { if (wahl.art !== 'befehl' || !wahl.tippen) oeffneWahl('befehl', true); else { wahl.filter = t.slice(1); wahl.zeiger = 0; zeichneWahl(); } }
    else if (wahl.tippen) schliesseWahl(false);
  }
  function wahlBewegen(d) { if (!wahl.eintraege.length) return; wahl.zeiger = (wahl.zeiger + d + wahl.eintraege.length) % wahl.eintraege.length; zeichneWahl(); }
  function eingabeTaste(e) {
    const offen = wahl.art && !$('#wahl').hidden;
    if (offen && wahl.tippen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); wahlBewegen(1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); wahlBewegen(-1); return; }
      if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey && !e.isComposing && wahl.eintraege.length) { e.preventDefault(); nimmWahl(wahl.zeiger); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); schliesseWahl(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendeEingabe(); }
  }
  function wahlTaste(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); wahlBewegen(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); wahlBewegen(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); nimmWahl(wahl.zeiger); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); schliesseWahl(true); }
  }

  // ---------- Kopf und Reiter ----------
  function ueberfaellig() { return ((S.plan && S.plan.zeitleiste) || []).filter((z) => z.ueberfaellig && !z.erledigt); }
  const THEMA_TEXT = { system: 'Darstellung wie das System', dunkel: 'Darstellung dunkel', hell: 'Darstellung hell' };
  // Editor-Schalter: Automatisch / VS Code / Cursor (POST /api/editor). Automatisch zeigt, was erkannt wurde.
  function editorWahlHtml() {
    const e = S.editor_einstellung || 'automatisch';
    const erkannt = S.editor_quelle === 'standard' ? `${ED()}, Standard` : ED();
    const opt = [['automatisch', `automatisch · ${erkannt}`], ['vscode', 'VS Code'], ['cursor', 'Cursor']];
    const tip = e === 'automatisch' ? `Links öffnen in ${ED()} (${S.editor_quelle === 'standard' ? 'nichts erkannt, Standard' : 'erkannt'}). Hier festlegen.` : `Links öffnen in ${ED()} (fest eingestellt).`;
    if (!LIVE) return `<span class="editor-wahl" title="${h(tip)}"><span class="ew-name">Editor</span><span>${h(ED())}</span></span>`;
    return `<label class="editor-wahl" title="${h(tip)}"><span class="ew-name">Editor</span>
      <select id="editor-wahl" class="schreibt" aria-label="Editor für Links und Claude">${opt.map(([v, n]) => `<option value="${v}"${v === e ? ' selected' : ''}>${h(n)}</option>`).join('')}</select></label>`;
  }
  async function setzeEditor(wert, ohneToast) {
    const vorher = S.editor_einstellung || 'automatisch';
    if (wert === vorher) return;
    try {
      const r = await post('/api/editor', { editor: wert });
      for (const f of ['editor', 'editor_name', 'editor_quelle', 'editor_einstellung', 'vscode', 'claude_uri']) if (r && r[f] !== undefined) S[f] = r[f];
      if (S.einstellungen) S.einstellungen.editor = S.editor_einstellung;
      zeichneAlles();
      if (!ohneToast) toast(`Links öffnen jetzt in ${ED()}${S.editor_einstellung === 'automatisch' ? ' (automatisch erkannt)' : ''}.`, () => setzeEditor(r?.vorher?.editor || vorher, true));
      holeStand();
    } catch (e) { zeichneKopf(); toast(e.message); }
  }
  function zeichneKopf() {
    // Ein offenes Auswahlmenü im Kopf nicht unter der Hand neu bauen
    if (document.activeElement && document.activeElement.id === 'editor-wahl' && $('#kopf').contains(document.activeElement)) return;
    const zustand = !LIVE ? 'kopie' : offline ? 'offline' : verbunden ? 'live' : 'verbinde';
    const zText = { kopie: 'Nur-Lese-Kopie', offline: 'Keine Verbindung', live: 'aktuell', verbinde: 'verbinde …' }[zustand];
    const uf = ueberfaellig().length;
    const titel = S.titel || (S.eingerichtet ? 'Titel noch offen' : 'Deine wissenschaftliche Arbeit');
    $('#kopf').innerHTML = `<div class="kopf-innen">
      <span class="kopf-titel" title="${h(titel)}">${h(titel)}</span>
      <span class="kopf-rechts">
        ${uf ? `<button type="button" class="link-knopf rot" data-a="reiter" data-v="plan">${uf === 1 ? '1 Frist überfällig' : `${uf} Fristen überfällig`}</button>` : ''}
        <span class="verbindung ${zustand}" title="${zustand === 'live' ? 'Die Seite aktualisiert sich selbst.' : ''}" role="status"><span class="punkt"></span>${zText}</span>
        ${editorWahlHtml()}
        <button type="button" class="ik klein" data-a="thema" title="${h(THEMA_TEXT[thema])} (klicken zum Wechseln)" aria-label="${h(THEMA_TEXT[thema])}, wechseln">${icon('thema')}</button>
      </span></div>`;
  }
  function pulsiere() { const p = $('.verbindung .punkt'); if (!p) return; p.classList.remove('puls'); void p.offsetWidth; p.classList.add('puls'); }

  function zeichneReiter() {
    const nav = $('#reiter');
    const fokus = document.activeElement && nav.contains(document.activeElement);
    const neuQ = num(S.quellen?.zaehler?.vorschlag);
    nav.innerHTML = `<div class="reiter-innen" role="tablist">${REITER.map(([id, name]) => {
      const an = ui.reiter === id;
      const zusatz = id === 'quellen' && neuQ ? `<span class="zaehl" aria-label="${plural(neuQ, 'Vorschlag', 'Vorschläge')}">${zahl(neuQ)}</span>` : '';
      return `<button type="button" role="tab" id="tab-${id}" aria-controls="inhalt" aria-selected="${an}" tabindex="${an ? 0 : -1}" data-a="reiter" data-v="${id}">${name}${zusatz}</button>`;
    }).join('')}</div>`;
    const main = $('#inhalt');
    main.setAttribute('role', 'tabpanel');
    main.setAttribute('aria-labelledby', 'tab-' + ui.reiter);
    if (fokus) $('#tab-' + ui.reiter)?.focus({ preventScroll: true });
  }
  function waehleReiter(id, fokus) {
    if (!REITER.some(([r]) => r === id)) return;
    ui.reiter = id; merke(); zeichneReiter(); zeichneInhalt({ oben: true });
    window.scrollTo(0, 0);
    if (fokus) $('#tab-' + id)?.focus();
  }

  // ---------- Zeilen: eine Sprache für alle Listen ----------
  // Kreis links (Bezug in die Eingabe), das Wichtigste, Rest grau, Terminal-Icon rechts (startet sofort).
  const istOffen = (key) => ui.offen.includes(key);
  function los(prompt, was) {
    if (!prompt) return '<span class="los-platz" aria-hidden="true"></span>';
    return `<button type="button" class="ik los" data-a="start" data-p="${h(prompt)}" title="Claude starten: ${h(prompt)}" aria-label="Claude starten: ${h(was || prompt)}">${icon('terminal')}</button>`;
  }
  function zeile({ key, baustein, vor = '', titel, titelHtml = '', meta = '', rechts = '', start = '', startWas = '', details = null, klasse = '', titelKlick = '', ende = '' }) {
    const auf = typeof details === 'function';
    const offen = auf && istOffen(key);
    const gewaehlt = baustein && istGewaehlt(baustein.key);
    const titelEl = titelHtml || (auf ? `<button type="button" class="zeile-titel zeile-auf" data-auf="${h(key)}" aria-expanded="${offen}">${h(titel)}</button>`
      : titelKlick ? `<button type="button" class="zeile-titel" ${titelKlick}>${h(titel)}</button>` : `<span class="zeile-titel">${h(titel)}</span>`);
    return `<li class="zeile${offen ? ' offen' : ''}${gewaehlt ? ' gewaehlt' : ''}${auf ? ' klappt' : ''}${klasse ? ' ' + klasse : ''}" data-zeile="${h(key)}">
      <div class="zeile-kopf"${auf ? ` data-a="auf" data-id="${h(key)}"` : ''}>
        ${kreis(baustein)}${vor ? `<span class="zeile-vor">${vor}</span>` : ''}
        <span class="zeile-haupt">${titelEl}${meta ? `<span class="zeile-meta">${meta}</span>` : ''}</span>
        ${rechts ? `<span class="zeile-rechts">${rechts}</span>` : ''}
        ${ende || los(start, startWas)}
      </div>${offen ? `<div class="details">${details()}</div>` : ''}</li>`;
  }
  const liste = (zeilen, klasse = '') => `<ul class="liste${klasse ? ' ' + klasse : ''}">${zeilen.join('')}</ul>`;
  const leer = (text) => `<p class="leer">${text}</p>`;
  function abschnitt(id, titel, inhalt, rechts = '') {
    return `<section class="abschnitt" data-abschnitt="${h(id)}"><h2><span>${h(titel)}</span>${rechts ? `<span class="rechts">${rechts}</span>` : ''}</h2>${inhalt}</section>`;
  }
  const feld = (lbl, wert) => `<div class="feld"><span class="lbl">${lbl}</span><div class="wert">${wert}</div></div>`;
  const STATUS_KLEIN = { offen: 'offen', geplant: 'geplant', entwurf: 'Entwurf', geprueft: 'geprüft', final: 'freigegeben' };
  function statusHtml(status) { return `<span class="status">${h(STATUS_KLEIN[status] || status)}</span>`; }
  // Umfang: „ca. 14 von 18–24 S.“
  function bereich(min, max, einheit) {
    if (!hat(min) && !hat(max)) return '';
    if (hat(min) && hat(max) && Number(min) !== Number(max)) return `${dez(min)}–${dez(max)}${einheit}`;
    return `${dez(hat(max) ? max : min)}${einheit}`;
  }
  function seitenText(s) {
    if (!s) return '';
    const echt = s.quelle === 'pdf' && hat(s.echt);
    const wert = echt ? s.echt : s.schaetzung;
    const ziel = bereich(s.ziel_min, s.ziel_max, ' S.');
    return `${echt ? '' : 'ca. '}${dez(wert)}${ziel ? ' von ' + ziel : ' S.'}`;
  }
  const kurzDatum = (s) => { const d = parseTag(s); return d ? `${WT[d.getDay()]} ${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.` : String(s || ''); };
  const kurzDatumJahr = (s) => { const d = parseTag(s); return d ? `${kurzDatum(s)}${String(d.getFullYear()).slice(2)}` : String(s || ''); };

  // ---------- Hinweise (nur rot, wenn wirklich etwas kaputt ist) ----------
  function hinweiseHtml() {
    const k = Array.isArray(S.kaputt) ? S.kaputt : [];
    if (!k.length) return '';
    return `<div class="hinweis rot" role="alert"><span class="text">${k.length === 1 ? 'Die Datei' : 'Die Dateien'} ${k.map((x) => `<span class="mono">${h(x)}</span>`).join(', ')} ${k.length === 1 ? 'ist' : 'sind'} beschädigt. Das Dashboard ändert dort nichts, bis Claude sie repariert hat.</span>
      ${los('/hilfe reparieren', 'beschädigte Datei reparieren')}</div>`;
  }
  function zeichneOfflineHinweis() {
    let el = $('#offline-hinweis');
    if (!offline || !LIVE) { el?.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'offline-hinweis';
      el.className = 'hinweis rot';
      el.setAttribute('role', 'alert');
      el.innerHTML = `<span class="text">Keine Verbindung zum Dashboard. Die Anzeige ist eingefroren, Ändern ist gesperrt. Gib in Claude <span class="mono">/dashboard</span> ein, die Seite verbindet sich danach von selbst.</span>
        <button type="button" class="link-knopf" data-a="neu-verbinden">Erneut versuchen</button>`;
    }
    const main = $('#inhalt'); if (main && el.parentElement !== main) main.prepend(el);
  }

  // ---------- Übersicht: was ist, was bald kommt, was möglich ist ----------
  function uebersicht() {
    const teile = [hinweiseHtml()];
    if (!S.eingerichtet) {
      teile.push(`<section class="abschnitt kopfbereich" data-abschnitt="willkommen"><p class="einleitung">Hier entsteht deine Arbeit. Diese Seite zeigt dir Kapitel, Quellen, Termine und Umfang. Claude arbeitet in ${h(ED())} mit dir und hält alles aktuell.</p>
        <p class="einleitung grau">Zum Start: Einrichtung starten, in ${h(ED())} Enter drücken und die Fragen beantworten. Das dauert etwa zehn Minuten.</p></section>`);
      teile.push(abschnitt('vorschlaege', 'Vorschläge', liste([
        vorschlagZeile({ text: 'Einrichtung starten', hinweis: 'Claude fragt dich alles Nötige', prompt: '/start' }),
        vorschlagZeile({ text: 'Erst einmal lesen, wie es funktioniert', hinweis: 'Hilfe', reiter: 'hilfe' }),
      ])));
      return teile.join('');
    }
    teile.push(`<section class="abschnitt kopfbereich" data-abschnitt="kopf"><p class="meta-zeile">${metaZeile()}</p>${syncZeile()}</section>`);
    teile.push(abschnitt('bald', 'Demnächst', baldHtml(), '<button type="button" class="link-knopf" data-a="reiter" data-v="plan">ganzer Plan</button>'));
    teile.push(abschnitt('aenderungen', 'Zuletzt geändert', aenderungenHtml()));
    teile.push(abschnitt('pdf', 'PDF', pdfZeilenHtml()));
    teile.push(abschnitt('vorschlaege', 'Vorschläge', liste(vorschlaege().map(vorschlagZeile))));
    teile.push(angabenHtml());
    return teile.join('');
  }
  function metaZeile() {
    const ab = S.abgabe || {}; const u = S.umfang || {}; const K = S.kapitel || []; const Q = S.quellen || {};
    const teile = [];
    if (!ab.datum) teile.push('Abgabe noch offen');
    else if (num(ab.tage) < 0) teile.push(`<span class="rot">Abgabe ${h(relTage(ab.tage))}</span>`);
    else teile.push(`<span title="${h(datumMitTag(ab.datum))}">${num(ab.tage) === 0 ? 'Abgabe heute' : `${zahl(ab.tage)} ${num(ab.tage) === 1 ? 'Tag' : 'Tage'} bis Abgabe`}</span>`);
    if (hat(u.seiten)) teile.push(`${u.quelle === 'pdf' ? '' : 'ca. '}${dez(u.seiten)}${bereich(u.seiten_min, u.seiten_max, '') ? ' von ' + bereich(u.seiten_min, u.seiten_max, ' S.') : ' S.'}`);
    if (K.length) teile.push(`${zahl(K.filter((k) => k.status === 'geprueft' || k.status === 'final').length)}/${zahl(K.length)} Kapitel geprüft`);
    teile.push(plural(Q.zaehler?.genommen || 0, 'Quelle', 'Quellen'));
    return teile.join('<span class="trenner"> · </span>');
  }
  function syncZeile() {
    const s = S.sync; if (!s) return '';
    const tage = s.tage == null ? null : num(s.tage);
    const arbeit = num(S.umfang?.woerter) > 0 || num(s.ungesichert) > 0;
    const rot = arbeit && (tage === null || tage > 2);
    const wann = tage === null ? 'noch nie' : relTage(-tage) || 'heute';
    return `<p class="meta-zeile sync${rot ? ' wichtig' : ''}"><span>Zuletzt gesichert: ${h(wann)}${num(s.ungesichert) ? ` · ${plural(s.ungesichert, 'Änderung', 'Änderungen')} nur auf diesem Gerät` : ''}</span>${los('/sync', 'jetzt sichern')}</p>`;
  }
  function terminPrompt(z) {
    if (z.art === 'meilenstein') {
      const k = (z.kapitel || []).filter((x) => x !== 'alle');
      return k.length === 1 ? `/schreiben ${k[0]}` : `/weiter Meilenstein „${z.text}“ bis ${datumDe(z.datum)}`;
    }
    if (z.art === 'abgabe') return `/weiter Was fehlt bis zur Abgabe am ${datumDe(z.datum)}?`;
    return `Hilf mir, den Termin „${z.text}“ am ${datumDe(z.datum)} vorzubereiten.`;
  }
  function zeitStatus(z) {
    if (z.erledigt) return `<span class="status">${z.art === 'meilenstein' ? 'erreicht' : 'erledigt'}</span>`;
    if (z.ueberfaellig) return `<span class="status rot">überfällig, ${h(relTage(z.tage))}</span>`;
    return hat(z.tage) ? `<span class="status">${h(relTage(z.tage))}</span>` : '';
  }
  function baldHtml() {
    const zl = (S.plan?.zeitleiste || []).filter((z) => !z.erledigt).slice(0, 5);
    if (!zl.length) return leer('Keine offenen Termine. <button type="button" class="link-knopf" data-a="reiter" data-v="plan">Termin eintragen</button>');
    return liste(zl.map((z) => zeile({ key: 'z:' + z.id, baustein: aTermin(z), vor: h(kurzDatum(z.datum)), titel: z.text,
      meta: [z.zeit ? h(z.zeit) : '', z.art === 'meilenstein' ? 'Meilenstein' : z.art === 'abgabe' ? 'Abgabe' : ''].filter(Boolean).join(' · '),
      rechts: zeitStatus(z), start: terminPrompt(z), startWas: z.text })));
  }
  function findeKapitelZuDatei(datei) { return (S.kapitel || []).find((k) => k.datei === datei); }
  function textHash(datei, absatz) {
    const k = findeKapitelZuDatei(datei);
    return (k ? `#kapitel/${kapSlug(k.nr)}` : `#text/${encodeURIComponent(datei)}`) + (absatz != null ? `/a${num(absatz)}` : '');
  }
  function aenderungenHtml() {
    const l = (Array.isArray(S.aenderungen) ? S.aenderungen : []).slice(0, 5);
    if (!l.length) return leer(LIVE ? 'Noch nichts geändert. Sobald Claude oder du etwas speichert, steht es hier.' : 'Die Änderungen zeigt die Live-Ansicht.');
    return liste(l.map((a, idx) => {
      const abs = (Array.isArray(a.absaetze) ? a.absaetze : []).map(num);
      const d = num(a.woerter_delta);
      const delta = d === 0 ? '' : d > 0 ? `+${plural(d, 'Wort', 'Wörter')}` : `−${plural(-d, 'Wort', 'Wörter')}`;
      const titel = a.titel || dateiName(a.datei);
      return zeile({ key: 'ae:' + idx, baustein: aDatei(a.datei, titel),
        titelHtml: LIVE ? `<a class="zeile-titel" href="${h(textHash(a.datei, abs[0]))}" title="Lesen">${h(titel)}</a>` : `<span class="zeile-titel">${h(titel)}</span>`,
        meta: `${dateiLink(a.datei, 0, dateiName(a.datei), a.pfad_abs)}${abs.length || delta ? ' · ' + [abs.length ? plural(abs.length, 'Absatz', 'Absätze') : '', delta].filter(Boolean).join(', ') : ''}`,
        rechts: `<span class="status" data-zeit="${h(a.zeit)}">${h(relZeit(a.zeit))}</span>` });
    }));
  }
  // Neutrale Möglichkeiten, keine Reihenfolge, die man abarbeiten muss
  function vorschlaege() {
    const v = [];
    const K = S.kapitel || [];
    const Q = S.quellen || {};
    const ns = String(S.naechster_schritt || '').trim();
    if (ns) {
      const m = ns.match(/(\/[a-z][\w-]*(?:[ \t]+[^\n]*)?)$/i);
      const text = ns.replace(/[:\s]*\/[a-z][\w-]*(?:[ \t]+[^\n]*)?$/i, '').trim() || ns;
      v.push({ text, hinweis: 'aus deinem Stand', prompt: m ? m[1].trim() : String(S.naechster_command || '/weiter') });
    }
    const eingang = Q.eingang || [];
    if (eingang.length) v.push({ text: `${plural(eingang.length, 'Datei', 'Dateien')} aus dem Eingang einsortieren`, hinweis: eingang.map((d) => d.name).slice(0, 3).join(', '), prompt: '/quellen' });
    if (num(Q.zaehler?.vorschlag)) v.push({ text: `${plural(Q.zaehler.vorschlag, 'Quellenvorschlag', 'Quellenvorschläge')} ansehen`, hinweis: 'nehmen, später oder verwerfen', reiter: 'quellen' });
    v.push({ text: 'Weitere Literatur suchen', hinweis: 'geht jederzeit, auch kurz vor Schluss', prompt: '/recherche' });
    const ent = K.find((k) => k.status === 'entwurf');
    if (ent) v.push({ text: `Kapitel ${ent.nr} prüfen lassen`, hinweis: ent.titel || '', prompt: `/pruefen ${ent.nr}` });
    v.push({ text: 'Überlegen, was gerade passt', hinweis: 'Claude schaut auf deinen Stand', prompt: '/weiter' });
    const gesehen = new Set();
    return v.filter((x) => { const k = x.prompt || 'reiter:' + x.reiter; if (gesehen.has(k)) return false; gesehen.add(k); return true; }).slice(0, 6);
  }
  function vorschlagZeile(x, i) {
    if (x.reiter) {
      return zeile({ key: 'v:' + (i ?? x.reiter), titel: x.text, titelKlick: `data-a="reiter" data-v="${h(x.reiter)}"`, meta: h(x.hinweis || ''), rechts: '<span class="status">ansehen</span>' });
    }
    return zeile({ key: 'v:' + (i ?? x.prompt), titel: x.text, titelKlick: `data-a="in-eingabe" data-p="${h(x.prompt)}" title="In die Eingabe legen und anpassen"`,
      meta: h(x.hinweis || ''), rechts: `<span class="befehl">${h(x.prompt)}</span>`, start: x.prompt, startWas: x.text });
  }
  // PDF der Arbeit und des Exposés (API v3.1: stand.pdf.arbeit / stand.pdf.expose)
  const PDF_ART = { arbeit: { datei: 'Arbeit.pdf', hash: '#arbeit' }, expose: { datei: 'Expose.pdf', hash: '#expose' } };
  function pdfInfo(art) {
    const p = S.pdf || {};
    if (p[art] !== undefined) return p[art] || null;
    // ältere Server: nur vorhanden/geaendert
    return art === 'arbeit' && p.vorhanden ? { datei: p.datei || 'Arbeit.pdf', url: '/datei/' + (p.datei || 'Arbeit.pdf'), zeit: p.geaendert, seiten: S.pdfBau?.seiten || null } : null;
  }
  const externKnopf = (daten, label) => `<button type="button" class="ik los nur-live" data-a="pdf-extern" ${daten} title="${h(label)}" aria-label="${h(label)}">${icon('extern')}</button>`;
  function pdfZeile(art) {
    const d = pdfInfo(art); if (!d) return '';
    const veraltet = !!d.veraltet;
    const seit = Array.isArray(d.geaendert_seit) ? d.geaendert_seit : [];
    const meta = [d.zeit ? `<span data-zeit-prefix="gebaut " data-zeit="${h(d.zeit)}">gebaut ${h(relZeit(d.zeit))}</span>` : '', hat(d.seiten) ? `${zahl(d.seiten)} S.` : ''].filter(Boolean).join(' · ');
    const rechts = [veraltet ? `<span class="status" title="${h(seit.length ? 'Seit dem Bau geändert: ' + seit.join(', ') : 'Seit dem Bau hat sich etwas geändert.')}">veraltet</span>` : '',
      d.ausweich ? `<span class="status" title="${h(d.datei + ': Die alte Datei war beim Bau gesperrt. PDF-Programm schließen und neu bauen.')}">${h(d.datei)}</span>` : ''].filter(Boolean).join(' ');
    const titel = PDF_ART[art].datei;
    return zeile({ key: 'pdf:' + art, baustein: aDatei(d.datei, titel), klasse: veraltet ? 'veraltet' : '',
      titelHtml: VENDOR ? `<a class="zeile-titel" href="${PDF_ART[art].hash}" title="Im Dashboard ansehen">${h(titel)}</a>` : d.pfad_abs ? `<a class="zeile-titel" href="${h(vscode(d.pfad_abs, 1))}" title="${h(imEditor())}">${h(titel)}</a>` : `<span class="zeile-titel">${h(titel)}</span>`,
      meta, rechts, ende: LIVE ? externKnopf(`data-art="${art}"`, 'Im PDF-Programm öffnen') : '' });
  }
  function pdfZeilenHtml() {
    const z = [pdfZeile('arbeit'), pdfZeile('expose')].filter(Boolean);
    if (z.length) return liste(z);
    const b = { key: 'aufgabe:pdf', art: 'Aufgabe', label: 'PDF bauen', prompt: 'Bau das PDF der Arbeit (/pdf entwurf), auch wenn noch Lücken drin sind.' };
    return liste([zeile({ key: 'pdf:keins', baustein: b, titel: 'Noch kein PDF', klasse: 'leise', meta: 'PDF bauen zeigt, wie die Arbeit gesetzt aussieht', start: '/pdf entwurf', startWas: 'PDF bauen' })]);
  }
  async function pdfExtern(daten) {
    if (!LIVE) { toast('Das geht nur in der Live-Ansicht.'); return; }
    try { const r = await post('/api/pdf/oeffnen', daten); toast(`${dateiName(r?.datei || 'PDF')} öffnet sich im PDF-Programm.`, null, 3000); }
    catch (e) { toast(e.message); }
  }
  function angabenHtml() {
    const e = S.einstellungen;
    if (!e) return '';
    const z = e.zeilen || {};
    const ziel = e.pfad_abs || absVon(e.pfad);
    const wert = (schl, text) => text ? `<a class="wert-link" href="${h(vscode(ziel, z[schl]))}" title="In ${h(ED())} ändern">${h(text)}</a>` : '';
    const werte = [
      wert('arbeit.typ', e.typ ? e.typ.charAt(0).toUpperCase() + e.typ.slice(1) : ''),
      wert('arbeit.fachgebiet', e.fachgebiet),
      wert('arbeit.abgabe', e.abgabe ? 'Abgabe ' + datumDe(e.abgabe) : ''),
      wert('arbeit.seiten', bereich(e.seiten?.min, e.seiten?.max, ' Seiten')),
      wert('hochschule.name', e.hochschule),
      wert('hochschule.betreuer', e.betreuer),
      wert('zitieren.stil', e.zitierstil ? 'Zitierstil ' + e.zitierstil : ''),
    ].filter(Boolean);
    return abschnitt('einstellungen', 'Angaben', `<p class="angaben">${werte.join('<span class="trenner"> · </span>') || '<span class="grau">noch nichts eingetragen</span>'}</p>`,
      e.pfad ? dateiLink(e.pfad, 1, 'einstellungen.md', e.pfad_abs) : '');
  }

  // ---------- Quellen ----------
  const findeQuelle = (id) => (S.quellen?.liste || []).find((q) => q.id === id);
  const quelleHash = (q, seite, label) => `#quelle/${encodeURIComponent(q.id)}${seite ? '/s' + num(seite) : ''}${label ? '/p' + encodeURIComponent(label) : ''}`;
  const pdfRel = (q) => (q.rel && q.rel.pdf) || q.pdf || '';
  const qSchluessel = (q) => q.bibkey || q.doi || q.id;

  function quelleZeile(q) {
    const stern = num(q.stern);
    const meta = [h([autorKurz(q), q.jahr].filter(Boolean).join(' ')), stern ? `<span aria-label="${stern} von 3 Sternen">${'★'.repeat(stern)}</span>` : ''].filter(Boolean).join(' · ');
    let rechts = '';
    if (q.status === 'vorschlag' && q.herkunft !== 'bib') {
      rechts = `<span class="entscheid nur-live">
        <button type="button" class="text-knopf schreibt" data-a="q-status" data-id="${h(q.id)}" data-v="genommen">nehmen</button>
        <button type="button" class="text-knopf schreibt" data-a="q-status" data-id="${h(q.id)}" data-v="spaeter">später</button>
        <button type="button" class="text-knopf schreibt" data-a="q-status" data-id="${h(q.id)}" data-v="verworfen">verwerfen</button></span>`;
    } else if (q.status === 'genommen') {
      rechts = `<span class="status">${[q.pdf_vorhanden ? 'PDF' : 'kein PDF', num(q.zitate) ? plural(q.zitate, 'Zitat', 'Zitate') : 'nicht ausgewertet', q.zitiert?.length ? `${q.zitiert.length}× zitiert` : ''].filter(Boolean).join(' · ')}</span>`;
    }
    if (LIVE && q.pdf_vorhanden && q.bibkey) rechts += `<button type="button" class="ik klein nur-live" data-a="pdf-extern" data-bibkey="${h(q.bibkey)}" title="PDF im PDF-Programm öffnen" aria-label="PDF im PDF-Programm öffnen: ${h(q.titel || q.bibkey)}">${icon('extern')}</button>`;
    return zeile({ key: 'q:' + q.id, baustein: aQuelle(q), titel: q.titel || q.id, meta, rechts,
      start: `/quellen ${qSchluessel(q)}`, startWas: q.titel || q.id, details: () => quelleDetails(q) });
  }

  function quelleDetails(q) {
    const nurBib = q.herkunft === 'bib';
    const n = q.notiz || null;
    const teile = [];
    if (n && n.kern) {
      teile.push(feld('Kernaussage', `<p class="kern">${h(n.kern)}</p>${q.pfade?.notiz ? `<div class="zitat-meta">${textLink(q.rel?.notiz, n.zeile_kern, 'Notiz öffnen', q.pfade.notiz)}</div>` : ''}`));
    } else if (q.kurz || q.warum) {
      teile.push(feld('Worum es geht', `${h(q.kurz || '')}${q.warum ? `<div class="grau">Warum vorgeschlagen: ${h(q.warum)}</div>` : ''}`));
    }
    const zitate = (n && Array.isArray(n.zitate)) ? n.zitate : [];
    if (zitate.length) {
      teile.push(feld('Zitate', `<ul class="unterliste">${zitate.map((z) => {
        const pdfSeite = num(z.seite_pdf) || (/^\d+$/.test(String(z.seite || '')) ? Number(z.seite) : 0);
        const seiteTxt = z.seite ? `S. ${z.seite}` : pdfSeite ? `PDF-Seite ${pdfSeite}` : 'Seite fehlt';
        const zum = LIVE && VENDOR && q.pdf_vorhanden
          ? `<a href="${h(quelleHash(q, z.seite_pdf ? z.seite_pdf : 0, z.seite_pdf ? '' : z.seite))}" title="Im PDF an dieser Stelle öffnen">${h(seiteTxt)}</a>`
          : `<span>${h(seiteTxt)}</span>`;
        return `<li><div class="zitat-text">${h(z.original || z.paraphrase || '')}</div>
          <div class="zitat-meta">${zum}${(z.kapitel || []).length ? `<span>für Kapitel ${h([].concat(z.kapitel).join(', '))}</span>` : ''}${q.pfade?.notiz ? textLink(q.rel?.notiz, z.zeile, 'in der Notiz', q.pfade.notiz) : ''}</div></li>`;
      }).join('')}</ul>`));
    }
    if (q.zitiert?.length) {
      teile.push(feld('Wo zitiert', `<ul class="unterliste">${q.zitiert.map((z) => `<li>${z.kapitel ? `Kapitel ${h(z.kapitel)} · ` : ''}${dateiLink(z.datei, z.zeile)}${z.seite ? ` <span class="grau">(${h(z.seite)})</span>` : ''}</li>`).join('')}</ul>`));
    }
    const doiUrl = q.doi ? sichereUrl('https://doi.org/' + encodeURI(String(q.doi))) : sichereUrl(q.url);
    const pdf = q.pdf_vorhanden && pdfRel(q)
      ? (LIVE && VENDOR ? `<a href="${h(quelleHash(q))}">${h(dateiName(pdfRel(q)))}</a> <span class="grau">öffnet rechts</span>` : dateiLink(pdfRel(q), 0, dateiName(pdfRel(q)), q.pfade?.pdf))
      : q.pdf_vorhanden ? `<span class="grau">liegt außerhalb des Projekts${q.pdf_herkunft === 'bib' ? ' (Pfad aus der Bib)' : ''}</span>`
      : `<span class="grau">noch kein PDF${q.open_access ? ', frei verfügbar' : ''}</span>`;
    const pdfExt = LIVE && q.pdf_vorhanden && q.bibkey ? ` <span class="trenner">·</span> <button type="button" class="link-knopf" data-a="pdf-extern" data-bibkey="${h(q.bibkey)}">im PDF-Programm</button>` : '';
    teile.push(feld('Volltext', `${pdf}${pdfExt}${doiUrl ? ` <span class="trenner">·</span> <a href="${h(doiUrl)}" target="_blank" rel="noopener">beim Verlag</a>` : ''}`));
    if (!nurBib) {
      const stern = num(q.stern);
      const mk = q.markierungen || [];
      teile.push(feld('Bewertung', `<span class="sterne">${[1, 2, 3].map((s) => `<button type="button" class="${stern >= s ? 'an ' : ''}schreibt" data-a="q-stern" data-id="${h(q.id)}" data-v="${stern === s ? 0 : s}" aria-label="${s} von 3 Sternen" aria-pressed="${stern >= s}">${icon('stern')}</button>`).join('')}</span>
        ${hat(q.relevanz) && num(q.relevanz) ? `<span class="grau">Claude schätzt ${zahl(q.relevanz)} von 5</span>` : ''}`));
      teile.push(feld('Markierungen', `<span class="marken">${MARKIERUNGEN.map(([m, name]) => `<button type="button" class="marke schreibt" data-a="q-marke" data-id="${h(q.id)}" data-v="${m}" aria-pressed="${mk.includes(m)}">${name}</button>`).join('')}</span>`));
      teile.push(`<div class="feld"><label class="lbl" for="notiz-${h(q.id)}">Deine Notiz</label><div class="wert"><textarea id="notiz-${h(q.id)}" data-notiz="${h(q.id)}" rows="2" placeholder="Wofür du sie nutzen willst …" ${LIVE ? '' : 'readonly'}>${h(q.eigene_notiz ?? (typeof q.notiz === 'string' ? q.notiz : '') ?? '')}</textarea>
        <div class="speicher-status" data-notiz-status="${h(q.id)}" aria-live="polite"></div></div></div>`);
      if (q.status !== 'vorschlag') {
        teile.push(`<div class="feld nur-live"><span class="lbl">Entscheidung</span><div class="wert entscheid">${QFILTER.filter(([s]) => s !== q.status).map(([s]) => `<button type="button" class="text-knopf schreibt" data-a="q-status" data-id="${h(q.id)}" data-v="${s}">${{ genommen: 'nehmen', spaeter: 'auf später', verworfen: 'verwerfen', vorschlag: 'zurück zu den Vorschlägen' }[s]}</button>`).join('')}</div></div>`);
      }
    } else {
      teile.push(feld('Herkunft', '<span class="grau">direkt im Literaturverzeichnis eingetragen, zum Beispiel aus Zotero</span>'));
    }
    return teile.join('');
  }

  // Abgleich Kapitel gegen Bib (API v3.1: quellen.abgleich). Drei Gruppen wirken als Filter auf die Liste.
  const ABGLEICH = {
    nicht_in_bib: { titel: 'Zitiert, fehlt im Literaturverzeichnis', filter: false,
      satz: (k) => `Bib-Einträge für fehlende Schlüssel anlegen: ${k}`, cmd: (k) => `/quellen Bib-Einträge anlegen für ${k}` },
    nie_zitiert: { titel: 'Im Literaturverzeichnis, nirgends zitiert', filter: true,
      satz: (k) => `Diese Einträge in literatur.bib werden nirgends zitiert: ${k}. Prüfe, wo sie passen, oder ob sie raus können`, cmd: (k) => `/quellen Nie zitierte Einträge prüfen: ${k}` },
    ohne_notiz: { titel: 'Zitiert, ohne Notiz', filter: true,
      satz: (k) => `Notizen anlegen für zitierte Quellen ohne Notiz: ${k}`, cmd: (k) => `/quellen Notizen anlegen für ${k}` },
    ohne_pdf: { titel: 'Zitiert, ohne PDF', filter: true,
      satz: (k) => `PDFs besorgen für zitierte Quellen ohne PDF: ${k}`, cmd: (k) => `/quellen PDF besorgen für ${k}` },
  };
  const abgleichKeys = (art) => { const l = S.quellen?.abgleich?.[art]; return Array.isArray(l) ? l.map((x) => (typeof x === 'string' ? x : x.key)).filter(Boolean) : []; };
  function stellenHtml(stellen) {
    return (stellen || []).map((z) => `${z.kapitel ? `<span class="grau">Kapitel ${h(z.kapitel)}</span> ` : ''}${dateiLink(z.datei, z.zeile)}`).join('<span class="trenner"> · </span>');
  }
  function abgleichHtml() {
    const A = S.quellen?.abgleich; if (!A) return '';
    const zeilen = Object.entries(ABGLEICH).map(([art, def]) => {
      const keys = abgleichKeys(art); if (!keys.length) return '';
      const liste1 = keys.join(', ');
      const b = { key: 'abgleich:' + art, art: 'Aufgabe', label: def.satz(keys.length > 3 ? keys.slice(0, 3).join(', ') + ' …' : liste1), prompt: def.satz(liste1)
        + (art === 'nicht_in_bib' ? ` (zitiert in ${(A.nicht_in_bib || []).flatMap((x) => (x.stellen || []).map((z) => `${z.datei}:${z.zeile}`)).join(', ')})` : '') };
      const an = ui.qabgleich === art;
      const titelKlick = def.filter ? `data-a="q-abgleich" data-v="${art}" aria-pressed="${an}" title="${an ? 'Filter aufheben' : 'Nur diese Quellen zeigen'}"` : '';
      const details = art === 'nicht_in_bib' ? () => `<ul class="unterliste">${(A.nicht_in_bib || []).map((x) => `<li><span class="mono">${h(x.key)}</span> <span class="trenner">·</span> ${stellenHtml(x.stellen)}</li>`).join('')}</ul>` : null;
      return zeile({ key: 'ab:' + art, baustein: b, titel: def.titel, titelKlick: details ? '' : titelKlick, details, klasse: `abgleich-zeile${an ? ' aktiv' : ''}`,
        meta: `<span class="mono">${h(keys.length > 4 ? keys.slice(0, 4).join(', ') + ' …' : liste1)}</span>`,
        rechts: `<span class="status">${an ? 'Filter an · ' : ''}${zahl(keys.length)}</span>`, start: def.cmd(liste1), startWas: def.satz(liste1) });
    }).filter(Boolean);
    if (!zeilen.length) return '';
    return abschnitt('abgleich', 'Abgleich mit den Kapiteln', liste(zeilen), `<span class="grau mono">${plural(A.zitiert || 0, 'Schlüssel', 'Schlüssel')} zitiert</span>`);
  }
  function quellenGefiltert() {
    const such = String(ui.suche || '').trim().toLowerCase();
    const ab = ui.qabgleich && ABGLEICH[ui.qabgleich] ? new Set(abgleichKeys(ui.qabgleich)) : null;
    let l = (S.quellen?.liste || []).filter((q) => (ab ? ab.has(q.bibkey) : q.status === ui.filter));
    if (such) {
      l = l.filter((q) => [q.titel, (q.autoren || []).join(' '), q.venue, q.eigene_notiz, q.notiz?.kern, q.bibkey, q.warum, q.jahr,
        (q.markierungen || []).join(' '), (q.kapitel || []).join(' ')].join(' ').toLowerCase().includes(such));
    }
    const sort = {
      relevanz: (a, b) => (num(b.stern) - num(a.stern)) || (num(b.relevanz) - num(a.relevanz)),
      jahr: (a, b) => num(b.jahr) - num(a.jahr),
      neu: (a, b) => String(b.hinzugefuegt || '').localeCompare(String(a.hinzugefuegt || '')),
    }[ui.sortierung] || (() => 0);
    return l.sort(sort);
  }
  function quellenListeHtml() {
    const l = quellenGefiltert();
    if (l.length) return liste(l.map(quelleZeile));
    const such = String(ui.suche || '').trim();
    if (such) return leer(`Keine Treffer für „${h(such)}“. <button type="button" class="link-knopf" data-a="suche-leeren">Suche löschen</button>`);
    if (ui.qabgleich) return leer('Keine Quelle in dieser Gruppe. <button type="button" class="link-knopf" data-a="q-abgleich" data-v="">Filter aufheben</button>');
    const t = { vorschlag: 'Keine offenen Vorschläge.', genommen: 'Noch keine Quelle genommen.', spaeter: 'Nichts auf später gelegt.', verworfen: 'Nichts verworfen.' }[ui.filter];
    return leer(`${t}${ui.filter === 'vorschlag' ? ' <button type="button" class="link-knopf" data-a="in-eingabe" data-p="/recherche ">Literatur suchen</button>' : ''}`);
  }
  function quellen() {
    const Q = S.quellen || {};
    const z = Q.zaehler || {};
    const eingang = Q.eingang || [];
    const meta = [plural(z.genommen || 0, 'Quelle genommen', 'Quellen genommen'), plural(Q.bib_anzahl || 0, 'Eintrag', 'Einträge') + ' im Literaturverzeichnis', zahl(Q.ausgewertet || 0) + ' ausgewertet'];
    return `${hinweiseHtml()}
      <section class="abschnitt kopfbereich" data-abschnitt="kopf"><p class="meta-zeile">${meta.join('<span class="trenner"> · </span>')}</p></section>
      ${abgleichHtml()}
      ${eingang.length ? `<section class="abschnitt" data-abschnitt="eingang">${liste([zeile({ key: 'eingang', titel: `${plural(eingang.length, 'Datei', 'Dateien')} im Eingang`,
        meta: h(eingang.map((d) => d.name).join(', ')), rechts: '<span class="befehl">/quellen</span>', start: '/quellen', startWas: 'Eingang einsortieren' })])}</section>` : ''}
      <div class="leiste">
        <div class="filter" role="group" aria-label="Quellen filtern">${QFILTER.map(([id, name]) => `<button type="button" data-a="filter" data-v="${id}" aria-pressed="${!ui.qabgleich && ui.filter === id}">${name}<span class="zahl">${zahl(z[id] || 0)}</span></button>`).join('')}</div>
        <span class="luecke"></span>
        <input type="search" id="suche" placeholder="Suchen" value="${h(ui.suche)}" aria-label="Quellen durchsuchen" autocomplete="off">
        <select id="sortierung" aria-label="Sortierung">${[['relevanz', 'Wichtigste zuerst'], ['jahr', 'Neueste Jahre'], ['neu', 'Zuletzt hinzugefügt']].map(([v, n]) => `<option value="${v}"${ui.sortierung === v ? ' selected' : ''}>${n}</option>`).join('')}</select>
      </div>
      ${ui.qabgleich && ABGLEICH[ui.qabgleich] ? `<p class="filter-hinweis">Gefiltert: ${h(ABGLEICH[ui.qabgleich].titel)} <span class="trenner">·</span> <button type="button" class="link-knopf" data-a="q-abgleich" data-v="">Filter aufheben</button></p>` : ''}
      <section class="abschnitt eng" data-abschnitt="quellen-liste" id="quellen-liste">${quellenListeHtml()}</section>
      <p class="fussnote nur-live" id="drop">Eigene PDFs auf die Seite ziehen oder mit der Büroklammer oben anhängen. Sie landen in <span class="mono">quellen/eingang</span>, Claude sortiert sie ein.</p>`;
  }
  function zeichneQuellenListe() { const box = $('#quellen-liste'); if (box) box.innerHTML = quellenListeHtml(); }

  // ---------- Kapitel ----------
  function erlaubteStatus(k) {
    if (Array.isArray(k.status_erlaubt)) return k.status_erlaubt;
    const i = KAPITEL_STATUS.indexOf(k.status);
    return KAPITEL_STATUS.filter((s, j) => j !== i && (j < i || j === i + 1));
  }
  const kapSeiten = (k) => (k.seiten ? (k.seiten.quelle === 'pdf' && hat(k.seiten.echt) ? '' : 'ca. ') + dez(k.seiten.quelle === 'pdf' && hat(k.seiten.echt) ? k.seiten.echt : k.seiten.schaetzung) + ' S.' : plural(k.woerter || 0, 'Wort', 'Wörter'));
  function kapitelZeile(k, vor, tiefe) {
    const meta = [statusHtml(k.status), num(k.offene_punkte) ? plural(k.offene_punkte, 'offener Punkt', 'offene Punkte') : '', k.vorhanden ? '' : 'noch keine Datei'].filter(Boolean).join(' · ');
    return zeile({ key: 'k:' + k.nr, baustein: aKapitel(k), vor: vor || `<span class="nr">${h(k.nr)}</span>`, titel: k.titel || 'ohne Titel', meta,
      rechts: `<span class="status" title="${h(seitenText(k.seiten) || '')}">${h(kapSeiten(k))}</span>`, start: `/schreiben ${k.nr}`, startWas: `Kapitel ${k.nr} schreiben`,
      klasse: `${vor ? `baum-zeile einheit-zeile${tiefe === 0 ? ' wurzel' : ''}` : ''}${k.status === 'final' ? ' fertig' : ''}`.trim(), details: () => kapitelDetails(k) });
  }
  function kapitelDetails(k) {
    const erlaubt = new Set(erlaubteStatus(k));
    const s = k.seiten || {};
    const stufen = `<div class="stufen" role="group" aria-label="Status von Kapitel ${h(k.nr)}">${KAPITEL_STATUS.map((st) => {
      const an = st === k.status;
      return `<button type="button" class="schreibt" data-a="k-status" data-nr="${h(k.nr)}" data-v="${st}" aria-pressed="${an}"${!an && !erlaubt.has(st) ? ' disabled' : ''}>${STATUS_NAME[st]}</button>`;
    }).join('')}</div>
      <div class="grau">${k.status === 'entwurf' ? 'Freigeben geht erst nach der Prüfung durch Claude.' : k.status === 'geprueft' ? 'Geprüft. Wenn du zufrieden bist, gib das Kapitel frei.' : 'Vorwärts geht es einen Schritt, zurück jederzeit.'}</div>`;
    const umfang = k.seiten ? `${h(seitenText(s))}${s.quelle === 'pdf' && hat(s.echt) ? ' aus dem letzten PDF' : ', geschätzt'}${num(k.anteil) ? `, ${zahl(k.anteil)} % der Arbeit` : ''}
      <div class="grau">${plural(k.woerter || 0, 'Wort', 'Wörter')}, ${plural(k.abbildungen || 0, 'Abbildung', 'Abbildungen')}, ${plural(k.tabellen || 0, 'Tabelle', 'Tabellen')}, ${plural(k.formeln || 0, 'Formel', 'Formeln')}</div>` : plural(k.woerter || 0, 'Wort', 'Wörter');
    const befehl = (p) => `<button type="button" class="link-knopf mono" data-a="in-eingabe" data-p="${h(p)} " title="In die Eingabe legen">${h(p)}</button>`;
    return [
      `<div class="feld nur-live"><span class="lbl">Status</span><div class="wert">${stufen}</div></div>`,
      feld('Umfang', umfang),
      feld('Datei', `${k.datei ? dateiLink(k.datei, 1, k.datei, k.pfad_abs) : '<span class="grau">noch keine</span>'}${LIVE && k.vorhanden ? ` <span class="trenner">·</span> <a href="#kapitel/${h(kapSlug(k.nr))}">lesen</a>` : ''}${k.geaendert ? ` <span class="grau">· geändert ${h(relZeit(k.geaendert))}</span>` : ''}`),
      k.pruefung ? feld('Prüfbericht', dateiLink(k.pruefung, 1, dateiName(k.pruefung))) : '',
      feld('Befehle', `${befehl('/schreiben ' + k.nr)} <span class="trenner">·</span> ${befehl('/pruefen ' + k.nr)}`),
    ].join('');
  }
  function pdfStatusHtml() {
    const b = S.pdfBau || {};
    if (b.laeuft) return '<span class="grau" data-pdfstatus>PDF wird gebaut …</span>';
    const teile = [];
    if (b.fertig && b.ok === false) teile.push('<span class="wichtig">Der letzte Bau hat nicht geklappt.</span> <button type="button" class="link-knopf" data-a="pdf-reparieren">beheben lassen</button>');
    else if (S.pdf?.vorhanden) { const d = pdfInfo('arbeit') || {}; const sn = num(d.seiten) || num(b.seiten); teile.push(`Stand ${h(uhrzeit(d.zeit || S.pdf.geaendert || b.fertig))}${sn ? ', ' + plural(sn, 'Seite', 'Seiten') : ''}${d.veraltet && !num(b.geaendert_seit) ? ', veraltet' : ''}`); }
    const n = num(b.geaendert_seit);
    if (n && S.pdf?.vorhanden) teile.push(`${plural(n, 'Änderung', 'Änderungen')} seither`);
    else if (!S.pdf?.vorhanden && !b.fertig) teile.push('noch kein PDF');
    return `<span class="grau" data-pdfstatus>${teile.join(', ')}</span>`;
  }
  function aktualisierePdfStatus() {
    $$('[data-pdfstatus]').forEach((el) => { el.outerHTML = pdfStatusHtml(); });
    $$('[data-a="pdf-bauen"]').forEach((b) => { b.classList.toggle('laeuft', !!S.pdfBau?.laeuft); b.setAttribute('aria-busy', String(!!S.pdfBau?.laeuft)); });
  }
  // ---------- Gliederung als Baum (API v3.1: kapitel[].ebene/abschnitte, gruppen[]) ----------
  // Knoten: Gruppe (nur Nummer, keine Datei), Einheit (Datei mit Status) und Abschnitt (Überschrift in der Datei).
  // Aufgeklappt-Zustand je Knoten in localStorage, eigener Schlüssel. Standard: Knoten mit Untereinheiten offen, sonst zu.
  const BAUM_SCHLUESSEL = 'sw-dashboard-baum';
  const baumZustand = (() => { try { const x = JSON.parse(localStorage.getItem(BAUM_SCHLUESSEL) || '{}'); return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; } catch { return {}; } })();
  const merkeBaum = () => { try { localStorage.setItem(BAUM_SCHLUESSEL, JSON.stringify(baumZustand)); } catch {} };
  const nrTeile = (nr) => String(nr).split('.').map((x) => Number(x));
  function nrVergleich(a, b) {
    const x = nrTeile(a); const y = nrTeile(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] ?? -1) - (y[i] ?? -1); if (d) return d; }
    return 0;
  }
  function baueBaum(K) {
    const knoten = new Map();
    for (const g of S.gruppen || []) knoten.set(String(g.nr), { nr: String(g.nr), gruppe: g, einheit: null, kinder: [] });
    for (const k of K) {
      const nr = String(k.nr); const n = knoten.get(nr) || { nr, gruppe: null, einheit: null, kinder: [] };
      n.einheit = k; knoten.set(nr, n);
    }
    // Eltern = längstes vorhandenes Präfix der Nummer
    const wurzeln = [];
    for (const n of [...knoten.values()].sort((a, b) => nrVergleich(a.nr, b.nr))) {
      const t = n.nr.split('.'); let eltern = null;
      for (let i = t.length - 1; i > 0 && !eltern; i--) eltern = knoten.get(t.slice(0, i).join('.')) || null;
      (eltern ? eltern.kinder : wurzeln).push(n);
    }
    return wurzeln;
  }
  // Abschnitte einer Datei nach ebene verschachteln
  function abschnittBaum(liste) {
    const wurzel = { kinder: [], ebene: -1 }; const stapel = [wurzel];
    for (const a of liste || []) {
      const n = { a, kinder: [], ebene: num(a.ebene) };
      while (stapel.length > 1 && stapel[stapel.length - 1].ebene >= n.ebene) stapel.pop();
      stapel[stapel.length - 1].kinder.push(n); stapel.push(n);
    }
    return wurzel.kinder;
  }
  const baumKey = (id) => 'b:' + id;
  function baumOffen(id, standard) { return Object.prototype.hasOwnProperty.call(baumZustand, id) ? !!baumZustand[id] : standard; }
  function einzug(tiefe) { return `<span class="einzug" style="--tiefe:${tiefe}" aria-hidden="true"></span>`; }
  function twisty(id, offen, hatKinder, name, standard) {
    if (!hatKinder) return '<span class="twisty-platz" aria-hidden="true"></span>';
    return `<button type="button" class="twisty${offen ? ' offen' : ''}" data-a="baum" data-id="${h(id)}" data-std="${standard ? 1 : 0}" aria-expanded="${offen}" aria-label="${h((offen ? 'Zuklappen: ' : 'Aufklappen: ') + name)}" title="${offen ? 'Zuklappen' : 'Aufklappen'}">${icon('pfeil')}</button>`;
  }
  function aGruppe(g, einheiten) {
    return { key: 'gruppe:' + g.nr, art: 'Kapitel', label: `${g.nr} ${g.titel || ''}`.trim(),
      prompt: `Kapitel ${g.nr}${g.titel ? ` „${g.titel}“` : ''} mit ${einheiten.map((k) => `[${dateiName(k.datei)}](${k.datei})`).join(', ')}` };
  }
  function aAbschnitt(k, a) {
    return { key: `abschnitt:${k.nr}:${a.zeile}`, art: 'Abschnitt', label: `${a.nr ? a.nr + ' ' : ''}${a.titel}`,
      prompt: `Abschnitt ${a.nr ? a.nr + ' ' : ''}„${a.titel}“ in [${dateiName(k.datei)}](${k.datei}), Zeile ${num(a.zeile) || '?'}` };
  }
  function abgleichHinweise(k) {
    const h1 = [];
    if (k.kopf_fehlt) h1.push({ id: 'kopf', text: 'Datei beginnt nicht mit einer Überschrift', satz: `Die Datei [${dateiName(k.datei)}](${k.datei}) von Kapitel ${k.nr} beginnt nicht mit einer Kopfüberschrift. Bitte abgleichen.` });
    if (k.titel_abweichung) h1.push({ id: 'titel', text: `Titel weicht vom Plan ab: „${k.titel_zustand || ''}“`, satz: `Kapitel ${k.nr}: Die Kopfüberschrift „${k.titel}“ weicht vom Titel im Stand („${k.titel_zustand || ''}“) ab. Bitte abgleichen.` });
    if (k.datei_umbenannt) h1.push({ id: 'datei', text: `Datei umbenannt, im Stand noch ${dateiName(k.datei_zustand || '')}`, satz: `Kapitel ${k.nr}: Im Stand steht ${k.datei_zustand || 'eine andere Datei'}, gefunden wurde [${dateiName(k.datei)}](${k.datei}). Bitte abgleichen.` });
    return h1;
  }
  function baumZeilen(K) {
    const aus = [];
    const zeileVon = (o) => zeile(Object.assign({ klasse: '' }, o, { klasse: `baum-zeile ${o.klasse || ''}`.trim() }));
    const seitenWert = (sei) => (sei ? (hat(sei.echt) && sei.quelle === 'pdf' ? sei.echt : hat(sei.aktuell) ? sei.aktuell : sei.schaetzung) : 0);
    const besuche = (n, tiefe) => {
      const k = n.einheit; const g = n.gruppe;
      const id = 'k:' + n.nr;
      const hatKinder = n.kinder.length > 0 || (k && (k.abschnitte || []).length > 0);
      const offen = baumOffen(n.nr, n.kinder.length > 0);
      const vor = `${einzug(tiefe)}${twisty(n.nr, offen, hatKinder, `${n.nr} ${(k || g).titel || ''}`, n.kinder.length > 0)}<span class="nr">${h(n.nr)}</span>`;
      if (k) {
        aus.push(kapitelZeile(k, vor, tiefe));
        for (const x of abgleichHinweise(k)) {
          const b = { key: `abgleich:${k.nr}:${x.id}`, art: 'Bitte abgleichen', label: `${k.nr}: ${x.text}`, prompt: x.satz };
          aus.push(zeileVon({ key: `hinweis:${k.nr}:${x.id}`, baustein: b, vor: `${einzug(tiefe + 1)}<span class="twisty-platz"></span>`, titel: x.text, klasse: 'hinweis-zeile',
            start: `/hilfe ${x.satz}`, startWas: 'abgleichen lassen' }));
        }
      } else {
        const einheiten = K.filter((x) => (g.einheiten || []).includes(String(x.nr)));
        aus.push(zeileVon({ key: id, baustein: aGruppe(g, einheiten), vor, titel: g.titel || 'Kapitel ' + g.nr, klasse: `gruppe-zeile${tiefe === 0 ? ' wurzel' : ''}`,
          titelKlick: `data-a="baum" data-id="${h(n.nr)}" data-std="1"`, meta: statusHtml(g.status),
          rechts: `<span class="status" title="${h(seitenText(Object.assign({}, g.seiten, { quelle: 'schaetzung', schaetzung: seitenWert(g.seiten) })))}">ca. ${dez(Math.round(seitenWert(g.seiten) * 10) / 10)} S.</span>`,
          start: `/schreiben ${g.nr}`, startWas: `Kapitel ${g.nr} schreiben` }));
      }
      if (!offen) return;
      if (k) {
        const abschnitt1 = (an, t) => {
          const a = an.a; const sub = an.kinder.length > 0; const aid = `${k.nr}@${a.zeile}`;
          const auf = baumOffen(aid, false);
          aus.push(zeileVon({ key: 'a:' + aid, baustein: aAbschnitt(k, a), klasse: 'abschnitt-zeile',
            vor: `${einzug(t)}${twisty(aid, auf, sub, a.titel, false)}<span class="nr">${h(a.nr || '')}</span>`,
            titelHtml: `<a class="zeile-titel" href="${h(k.pfad_abs ? vscode(k.pfad_abs, a.zeile) : vscodeRel(k.datei, a.zeile))}" title="${h(imEditor(', Zeile ' + num(a.zeile)))}">${h(a.titel)}</a>`,
            rechts: `<span class="status">${plural(sub ? a.woerter_gesamt : a.woerter, 'Wort', 'Wörter')}</span>`,
            start: `/schreiben ${k.nr} Abschnitt ${a.nr || '„' + a.titel + '“'}`, startWas: `Abschnitt ${a.nr || a.titel} schreiben` }));
          if (auf) an.kinder.forEach((x) => abschnitt1(x, t + 1));
        };
        abschnittBaum(k.abschnitte).forEach((x) => abschnitt1(x, tiefe + 1));
      }
      n.kinder.forEach((x) => besuche(x, tiefe + 1));
    };
    baueBaum(K).forEach((n) => besuche(n, 0));
    return aus;
  }
  function baumKnoepfe() {
    return '<button type="button" class="link-knopf leise" data-a="baum-alle" data-v="1">alle auf</button><span class="trenner"> · </span><button type="button" class="link-knopf leise" data-a="baum-alle" data-v="0">alle zu</button>';
  }
  function baumAlle(auf) {
    const ids = [];
    const sammle = (n) => { ids.push(n.nr); const k = n.einheit; if (k) { const geh = (an) => { if (an.kinder.length) ids.push(`${k.nr}@${an.a.zeile}`); an.kinder.forEach(geh); }; abschnittBaum(k.abschnitte).forEach(geh); } n.kinder.forEach(sammle); };
    baueBaum(S.kapitel || []).forEach(sammle);
    ids.forEach((id) => { baumZustand[id] = !!auf; });
    merkeBaum(); zeichneInhalt();
  }
  function kapitel() {
    const K = S.kapitel || [];
    const u = S.umfang || {};
    const doks = S.dokumente || {};
    const dokZeilen = [['thema', 'Thema'], ['expose', 'Exposé'], ['gliederung', 'Gliederung'], ['stil', 'Dein Stil']].filter(([id]) => doks[id]?.pfad)
      .map(([id, name]) => zeile({ key: 'dok:' + id, baustein: aDatei(doks[id].pfad, name),
        titelHtml: LIVE ? `<a class="zeile-titel" href="${h(textHash(doks[id].pfad))}">${h(name)}</a>` : `<span class="zeile-titel">${h(name)}</span>`,
        meta: dateiLink(doks[id].pfad, 1), rechts: hat(doks[id].woerter) ? `<span class="status">${plural(doks[id].woerter, 'Wort', 'Wörter')}</span>` : '' }));
    const pdfAktionen = `${S.pdf?.vorhanden ? `<a href="${h(VENDOR ? '#arbeit' : vscodeRel(pdfInfo('arbeit')?.datei || 'Arbeit.pdf'))}">${h(pdfInfo('arbeit')?.datei || 'Arbeit.pdf')}</a><span class="trenner"> · </span>` : ''}
      ${LIVE ? `<button type="button" class="link-knopf schreibt${S.pdfBau?.laeuft ? ' laeuft' : ''}" data-a="pdf-bauen">${S.pdf?.vorhanden ? 'PDF neu bauen' : 'PDF bauen'}</button><span class="trenner"> · </span>${pdfStatusHtml()}` : ''}`;
    if (!K.length) {
      return `${hinweiseHtml()}<section class="abschnitt kopfbereich"><p class="einleitung">Die Kapitel entstehen, sobald die Gliederung steht. Bis dahin geht es um Thema, Recherche und Exposé, in der Reihenfolge, die für dich passt.</p></section>
        ${abschnitt('vorschlaege', 'Vorschläge', liste([vorschlagZeile({ text: 'Gliederung mit Claude entwickeln', hinweis: 'Claude schaut, was schon da ist', prompt: '/weiter Gliederung' })]))}
        ${dokZeilen.length ? abschnitt('dokumente', 'Dokumente', liste(dokZeilen)) : ''}`;
    }
    const zeilen = baumZeilen(K);
    const ohne = (S.kapitelOhneEintrag || []).map((d) => zeile({ key: 'ohne:' + d.name, baustein: aDatei('kapitel/' + d.name),
      titelHtml: `<span class="zeile-titel">${dateiLink('kapitel/' + d.name, 1)}</span>`, rechts: `<span class="status">${plural(d.woerter || 0, 'Wort', 'Wörter')}, zählt nicht mit</span>` }));
    const ziel = S.einstellungen?.zeilen?.['arbeit.seiten'] ? ` <a class="wert-link" href="${h(vscode(S.einstellungen.pfad_abs || absVon(S.einstellungen.pfad), S.einstellungen.zeilen['arbeit.seiten']))}" title="Ziel in ${h(ED())} ändern">Ziel ${h(bereich(u.seiten_min, u.seiten_max, ' S.'))}</a>` : '';
    return `${hinweiseHtml()}
      <section class="abschnitt kopfbereich" data-abschnitt="umfang">
        <p class="meta-zeile" title="${h(u.erklaerung || '')}">${u.quelle === 'pdf' ? '' : 'ca. '}${dez(u.seiten)} S.<span class="trenner"> · </span>${plural(u.woerter || 0, 'Wort', 'Wörter')}<span class="trenner"> · </span>${ziel || 'Ziel offen'}</p>
        <p class="meta-zeile">${pdfAktionen}</p>
      </section>
      ${abschnitt('gliederung', 'Gliederung', liste(zeilen, 'baum'), baumKnoepfe())}
      ${ohne.length ? abschnitt('weitere', 'Weitere Texte', liste(ohne)) : ''}
      ${dokZeilen.length ? abschnitt('dokumente', 'Dokumente', liste(dokZeilen)) : ''}
      <p class="fussnote">Seiten geschätzt aus Wörtern (300 je Seite), Abbildungen, Tabellen und Formeln. Nach dem PDF-Bau gelten die echten Seiten, solange das Kapitel unverändert ist.</p>`;
  }

  // ---------- Plan ----------
  function plan() {
    const P = S.plan || {};
    const zl = P.zeitleiste || [];
    const heute = S.heute || isoTag(new Date());
    let heuteDa = false;
    const punkte = [];
    for (const z of zl) {
      if (!heuteDa && String(z.datum) >= heute) { heuteDa = true; punkte.push(heuteHtml()); }
      punkte.push(zeitpunktHtml(z, P));
    }
    if (!heuteDa) punkte.push(heuteHtml());
    return `${hinweiseHtml()}
      <section class="abschnitt kopfbereich nur-live" data-abschnitt="termin-neu">
        <form class="formular" id="termin-form" autocomplete="off">
          <input type="text" name="text" required maxlength="200" placeholder="Neuer Termin, zum Beispiel Betreuung Dr. Müller" aria-label="Was steht an?" class="titel-feld">
          <input type="date" name="datum" required aria-label="Datum">
          <input type="time" name="zeit" aria-label="Uhrzeit, optional">
          <button type="submit" class="knopf schreibt">Eintragen</button>
        </form></section>
      ${abschnitt('zeitleiste', 'Zeitleiste', zl.length ? liste(punkte, 'zeitleiste') : leer('Noch keine Termine und Meilensteine. Trag oben einen Termin ein oder bitte Claude um einen Zeitplan bis zur Abgabe.'), P.pfad ? dateiLink(P.pfad, 1, 'plan.md', P.pfad_abs) : '')}
      <p class="fussnote">Meilensteine gelten als erreicht, sobald die genannten Kapitel den Status haben. Sie pflegt Claude, sag zum Beispiel: „Verschiebe den Meilenstein Methodik auf den 20. November.“</p>`;
  }
  function heuteHtml() { return `<li class="heute-marke" aria-label="Heute"><span>heute · ${h(kurzDatumJahr(S.heute || isoTag(new Date())))}</span></li>`; }
  function terminHaken(t) {
    return `<input type="checkbox" class="haken schreibt" data-a="t-erledigt" data-id="${h(t.id)}" ${t.erledigt ? 'checked' : ''} aria-label="Erledigt: ${h(t.text)}" title="abhaken" ${LIVE && !offline ? '' : 'disabled'}>`;
  }
  function zeitpunktHtml(z, P) {
    const unter = [];
    if (z.zeit) unter.push(h(z.zeit));
    if (z.art === 'meilenstein') unter.push(`Meilenstein · ${(z.kapitel || []).some((x) => x === 'alle') || !(z.kapitel || []).length ? 'alle Kapitel' : 'Kapitel ' + h(z.kapitel.join(', '))} ${h(STATUS_KLEIN[z.status] || z.status || '')}`);
    if (z.art === 'abgabe') unter.push('Abgabetermin');
    const pfad = z.pfad || P.pfad;
    if (pfad && z.zeile) unter.push(dateiLink(pfad, z.zeile, dateiName(pfad)));
    const loeschen = z.art === 'termin' && LIVE
      ? `<button type="button" class="ik klein schreibt" data-a="t-loeschen" data-id="${h(z.id)}" title="Termin löschen" aria-label="Termin löschen: ${h(z.text)}">${icon('muell')}</button>` : '';
    const marke = z.art === 'termin' ? terminHaken(z) : `<span class="marke-punkt ${z.art === 'abgabe' ? 'abgabe' : ''}" aria-hidden="true"></span>`;
    return zeile({ key: 'z:' + z.id, baustein: aTermin(z), vor: `${marke}<span class="datum">${h(kurzDatumJahr(z.datum))}</span>`, titel: z.text,
      meta: unter.join(' · '), rechts: zeitStatus(z) + loeschen, start: z.erledigt ? '' : terminPrompt(z), startWas: z.text, klasse: z.erledigt ? 'fertig' : '' });
  }

  // ---------- Hilfe ----------
  function hilfe() {
    const sys = !LIVE ? leer('Die Technikprüfung gibt es in der Live-Ansicht.')
      : !checkErgebnis ? '<div class="skelett"></div><div class="skelett kurz"></div>'
      : !checkErgebnis.verfuegbar ? leer('Die Technikprüfung ist noch nicht installiert. Tipp oben /hilfe ein.')
      : checkListe(checkErgebnis.ergebnisse || []);
    function checkZeile(e) {
      const status = e.ok ? '<span class="status">in Ordnung</span>' : e.ok === false ? '<span class="status wichtig">Problem</span>' : '<span class="status">nicht geprüft</span>';
      const det = e.wert || e.reparatur || (e.hinweis && e.ok !== true);
      return zeile({ key: 'c:' + e.name, titel: e.name, meta: h(e.ok === false && e.hinweis ? e.hinweis : CHECK_ERKL[e.name] || ''), rechts: status,
        start: e.ok === false ? `/hilfe ${e.name} reparieren` : '', startWas: e.name + ' reparieren',
        details: det ? () => `${e.hinweis ? feld('Hinweis', h(e.hinweis)) : ''}${e.wert ? feld('Wert', `<span class="mono">${h(String(e.wert))}</span>`) : ''}${e.reparatur ? feld('Reparatur', `<span class="mono">${h(e.reparatur)}</span>`) : ''}` : null });
    }
    function checkListe(alle) {
      const gut = alle.filter((e) => e.ok === true);
      const rest = alle.filter((e) => e.ok !== true);
      return liste(rest.map(checkZeile)) + (gut.length ? `<details class="check-gut"><summary>${gut.length === 1 ? '1 Punkt in Ordnung' : `${gut.length} Punkte in Ordnung`}<span class="grau"> · ${h(gut.map((e) => e.name).join(', '))}</span></summary>${liste(gut.map(checkZeile))}</details>` : '');
    }
    const docs = S.dokumente?.docs || [];
    const alle = skills();
    const befehle = GRUPPEN.map(([g, name]) => {
      const l = alle.filter((s) => s.gruppe === g);
      return l.length ? `<li class="gruppe-kopf"><span>${h(name)}</span></li>` + l.map((s) => zeile({ key: 's:' + s.name, vor: `<span class="befehl">/${h(s.name)}</span>`,
        titelHtml: `<a class="zeile-titel" href="#skill/${h(encodeURIComponent(s.name))}" title="Wann hilft das?">${h(s.titel)}</a>`, meta: h(s.kurz), start: '/' + s.name, startWas: s.titel })).join('') : '';
    }).join('');
    return `
      <section class="abschnitt kopfbereich" data-abschnitt="so"><ul class="so">
        <li><span class="so-nr">1</span><span>Oben schreibst du, was Claude tun soll. Mit <span class="mono">/</span> wählst du einen Befehl.</span></li>
        <li><span class="so-nr">2</span><span>Der Kreis links an einer Zeile legt Kapitel, Quellen oder Termine als Bezug dazu. Das Terminal-Zeichen rechts startet sofort.</span></li>
        <li><span class="so-nr">3</span><span>Enter öffnet Claude in ${h(ED())} mit dem fertigen Text. Dort drückst du noch einmal Enter.</span></li>
        <li><span class="so-nr">4</span><span>Ein Klick auf einen Dateinamen öffnet die Datei in ${h(ED())} an der richtigen Zeile. Am Ende des Tages sichern: <span class="mono">/sync</span>.</span></li>
      </ul></section>
      ${abschnitt('werkzeugkasten', 'Befehle', liste([befehle]), '<button type="button" class="link-knopf" data-a="skill-neu">eigenen Befehl anlegen</button>')}
      ${abschnitt('faq', 'Wenn es hakt', `<div class="faq">${faq().map(([f, a]) => `<details class="faq-punkt"><summary>${h(f)}</summary><p>${h(a)}</p></details>`).join('')}</div>`)}
      ${docs.length ? abschnitt('anleitungen', 'Anleitungen', `<p class="angaben">${docs.map((d) => { const slug = String(d.name).replace(/\.md$/, ''); return `<a href="${h(vscodeRel('.claude/kit/docs/' + d.name))}">${h(DOK_NAMEN[slug] || slug.replace(/-/g, ' '))}</a>`; }).join('<span class="trenner"> · </span>')}</p>`) : ''}
      ${abschnitt('technik', 'Technik', sys, `<span class="nur-live"><button type="button" class="link-knopf" data-a="check-neu">neu prüfen</button></span>`)}
      <p class="fussnote mono">Version ${h(S.version || '?')}</p>`;
  }
  async function ladeCheck(neu) {
    if (!LIVE || (checkErgebnis && !neu)) return;
    try { checkErgebnis = await holeJson('/api/check'); } catch { checkErgebnis = { verfuegbar: false, ergebnisse: [] }; }
    if (ui.reiter === 'hilfe' && darfNeuZeichnen()) zeichneInhalt();
  }

  // ---------- Zeichnen, ohne dass etwas springt ----------
  function ankerMerken() {
    const obenH = $('#oben')?.getBoundingClientRect().bottom || 0;
    for (const el of $$('#inhalt [data-zeile], #inhalt [data-abschnitt]')) {
      const r = el.getBoundingClientRect();
      if (r.bottom > obenH + 4 && r.height > 0) {
        const attr = el.dataset.zeile != null ? 'data-zeile' : 'data-abschnitt';
        return { sel: `[${attr}="${cssEsc(el.getAttribute(attr))}"]`, top: r.top };
      }
    }
    return null;
  }
  function ankerWieder(a) {
    if (!a) return;
    const el = $('#inhalt ' + a.sel); if (!el) return;
    const d = el.getBoundingClientRect().top - a.top;
    if (Math.abs(d) > 1) window.scrollBy(0, d);
  }
  function fokusMerken(wurzel) {
    const el = document.activeElement;
    if (!el || el === document.body || !wurzel.contains(el)) return null;
    let sel = el.id ? '#' + cssEsc(el.id) : [el.tagName.toLowerCase(), ...['data-a', 'data-id', 'data-v', 'data-nr', 'data-auf', 'name', 'href']
      .filter((a) => el.hasAttribute(a)).map((a) => `[${a}="${cssEsc(el.getAttribute(a))}"]`)].join('');
    return { sel, start: el.selectionStart, ende: el.selectionEnd };
  }
  function fokusWieder(f, wurzel) {
    if (!f) return;
    let el = null; try { el = $(f.sel, wurzel); } catch {}
    if (!el) return;
    el.focus({ preventScroll: true });
    if (f.start != null && typeof el.setSelectionRange === 'function') { try { el.setSelectionRange(f.start, f.ende); } catch {} }
  }
  function zeichneInhalt({ oben = false } = {}) {
    const main = $('#inhalt');
    const a = oben ? null : ankerMerken();
    const f = oben ? null : fokusMerken(main);
    const fn = { uebersicht, quellen, kapitel, plan, hilfe }[ui.reiter] || uebersicht;
    main.innerHTML = fn();
    zeichneOfflineHinweis();
    if (offline || !LIVE) $$('.schreibt', main).forEach((b) => { b.disabled = true; });
    if (hervorheben) { const el = $(`[data-zeile="${cssEsc(hervorheben)}"]`, main); if (el) el.classList.add('blitz'); hervorheben = null; }
    if (a) ankerWieder(a);
    if (f) fokusWieder(f, main);
    if (ui.reiter === 'hilfe') ladeCheck(false);
    nachladenAusstehend = false;
  }
  function zeichneAlles() { zeichneKopf(); zeichneReiter(); zeichneKonfig(); zeichneInhalt(); }
  function darfNeuZeichnen() {
    if (Date.now() < sperreBis) return false;
    const main = $('#inhalt'); const a = document.activeElement;
    if (a && main.contains(a) && a.matches('textarea, select, input:not([type="search"]):not([type="checkbox"])')) return false;
    const sel = window.getSelection && window.getSelection();
    if (sel && !sel.isCollapsed && sel.anchorNode && main.contains(sel.anchorNode)) return false;
    return true;
  }
  let nachladenAusstehend = false;
  let nachladenTimer = null;
  function zeichneWennMoeglich() {
    clearTimeout(nachladenTimer);
    if (darfNeuZeichnen()) { zeichneInhalt(); return; }
    nachladenAusstehend = true;
    nachladenTimer = setTimeout(zeichneWennMoeglich, 1200);
  }
  async function holeStand() {
    if (!LIVE) return;
    try {
      const neu = await holeJson('/api/stand');
      const gleich = neu.standVersion && neu.standVersion === S.standVersion && !nachladenAusstehend;
      S = neu;
      if (gleich) return;
      zeichneKopf(); zeichneReiter(); zeichneWennMoeglich(); aktualisierePdfStatus();
      if (panel.art === 'text') textNeuLaden(true);
    } catch {}
  }

  // ---------- Live-Verbindung ----------
  let es = null;
  let versuch = 0;
  let standVersion = null;
  let wiederTimer = null;
  function verbinde() {
    if (!LIVE || !window.EventSource) return;
    clearTimeout(wiederTimer);
    try { es?.close(); } catch {}
    const q = new EventSource('/ereignisse');
    es = q;
    const da = () => { versuch = 0; if (!verbunden) { verbunden = true; zeichneKopf(); } setzeOffline(false); };
    q.onopen = da;
    q.addEventListener('hallo', da);
    q.addEventListener('stand', (e) => {
      const warWeg = offline;
      da(); pulsiere();
      let v; try { v = JSON.parse(e.data).version; } catch {}
      if ((standVersion !== null && v !== standVersion) || warWeg) holeStand();
      standVersion = v;
    });
    q.addEventListener('datei', (e) => {
      let d; try { d = JSON.parse(e.data); } catch { return; }
      dateiGeaendert(Array.isArray(d.pfade) ? d.pfade : []);
    });
    q.addEventListener('pdf', (e) => {
      let d; try { d = JSON.parse(e.data); } catch { return; }
      const vorher = S.pdfBau || {};
      S.pdfBau = d; aktualisierePdfStatus();
      if (vorher.laeuft && !d.laeuft) pdfBauFertig(d);
    });
    // Selbst neu verbinden, mit wachsender Pause. So füllt sich die Konsole nicht, wenn der Server weg ist.
    q.onerror = () => {
      try { q.close(); } catch {}
      if (es !== q) return;
      verbunden = false; versuch++;
      if (versuch > 1) setzeOffline(true); else zeichneKopf();
      wiederTimer = setTimeout(verbinde, Math.min(30000, 1000 * 2 ** Math.min(versuch - 1, 5)));
    };
  }
  window.addEventListener('online', () => { if (LIVE && !verbunden) verbinde(); });
  document.addEventListener('visibilitychange', () => { if (LIVE && !document.hidden && !verbunden) verbinde(); });

  // ---------- Aktionen: Quellen ----------
  async function quelleSetzen(id, aenderung, zeileEl, text) {
    const q = findeQuelle(id); if (!q) return;
    const vorher = {}; for (const f of Object.keys(aenderung)) vorher[f] = Array.isArray(q[f]) ? [...q[f]] : q[f];
    const statusWechsel = aenderung.status && aenderung.status !== q.status;
    if (statusWechsel && zeileEl) { sperreBis = Date.now() + 600; zeileEl.classList.add('weg'); await warte(180); }
    Object.assign(q, aenderung); sperreBis = 0; zeichneInhalt();
    try {
      const r = await post('/api/quelle', { id, ...aenderung });
      const alt = r && r.vorher && typeof r.vorher === 'object' ? r.vorher : {};
      const zurueck = {}; for (const f of Object.keys(aenderung)) zurueck[f] = f in alt ? alt[f] : vorher[f];
      const titel = String(q.titel || q.id).slice(0, 60);
      toast(text || (statusWechsel ? `${QSTATUS_TOAST[aenderung.status]}: ${titel}` : `Gespeichert: ${titel}`), async () => {
        Object.assign(q, zurueck); hervorheben = 'q:' + q.id; zeichneInhalt();
        await post('/api/quelle', { id, ...zurueck }); holeStand();
      });
      holeStand();
    } catch (e) { Object.assign(q, vorher); zeichneInhalt(); toast(e.message); }
  }
  // Notiz speichert sich beim Tippen selbst (nach einer kurzen Pause) und beim Verlassen der Seite
  const notizTimer = new Map();
  function notizGetippt(el) {
    const id = el.dataset.notiz;
    const status = $(`[data-notiz-status="${cssEsc(id)}"]`);
    if (status) status.textContent = 'Wird gespeichert …';
    clearTimeout(notizTimer.get(id));
    notizTimer.set(id, setTimeout(() => notizSpeichern(id, el.value), 800));
  }
  async function notizSpeichern(id, wert, keepalive) {
    notizTimer.delete(id);
    const q = findeQuelle(id); if (!q) return;
    const status = () => $(`[data-notiz-status="${cssEsc(id)}"]`);
    try {
      await post('/api/quelle', { id, eigene_notiz: wert }, keepalive ? { keepalive: true } : undefined);
      q.eigene_notiz = wert;
      const s = status(); if (s) s.textContent = `Gespeichert ${uhrzeit(new Date().toISOString()).replace(/^heute, /, 'um ')}`;
    } catch (e) { const s = status(); if (s) s.textContent = e.message; }
  }
  window.addEventListener('pagehide', () => {
    for (const [id, t] of notizTimer) { clearTimeout(t); const el = $(`[data-notiz="${cssEsc(id)}"]`); if (el) notizSpeichern(id, el.value, true); }
  });

  async function hochladen(dateien) {
    if (!LIVE) { toast('Hochladen geht nur in der Live-Ansicht.'); return; }
    if (offline) { toast(NICHT_ERREICHBAR); return; }
    const liste = [...dateien]; if (!liste.length) return;
    let ok = 0;
    for (const f of liste) {
      try {
        let r;
        try { r = await fetch('/api/upload?name=' + encodeURIComponent(f.name), { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: f }); }
        catch { setzeOffline(true); throw new Error(NICHT_ERREICHBAR); }
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.fehler || 'Hochladen hat nicht geklappt.');
        const a = aDatei(j.pfad);
        if (!istGewaehlt(a.key)) ui.anhaenge.push(a);
        ok++;
      } catch (e) { toast(`${f.name}: ${e.message}`); }
    }
    if (ok) {
      if (!String(ui.text || '').trim()) setzeText('/quellen ');
      merke(); zeichneKonfig(); markiereKreise();
      toast(`${plural(ok, 'Datei', 'Dateien')} im Eingang und in der Eingabe. Enter gibt sie Claude zum Einsortieren.`);
      holeStand();
    }
  }

  // ---------- Aktionen: Kapitel ----------
  async function setzeKapitelStatus(nr, status) {
    const k = (S.kapitel || []).find((x) => String(x.nr) === String(nr)); if (!k || k.status === status) return;
    if (!erlaubteStatus(k).includes(status)) {
      toast(status === 'final' ? `Kapitel ${nr} lässt sich erst nach der Prüfung freigeben. Lass es zuerst von Claude prüfen.` : 'Vorwärts geht es nur einen Schritt auf einmal.');
      return;
    }
    const vorher = k.status;
    k.status = status; zeichneInhalt();
    try {
      const r = await post('/api/kapitel/status', { nr, status });
      const undo = r && r.undo;
      toast(status === 'final' ? `Kapitel ${nr} freigegeben.` : `Kapitel ${nr}: ${STATUS_NAME[status]}.`, undo ? async () => {
        k.status = vorher; hervorheben = 'k:' + nr; zeichneInhalt();
        await post('/api/kapitel/status', undo); holeStand();
      } : null);
      holeStand();
    } catch (e) { k.status = vorher; zeichneInhalt(); toast(e.message, null, 8000); }
  }

  // ---------- Aktionen: Termine ----------
  const findeTermin = (id) => (S.plan?.zeitleiste || []).find((x) => x.id === id && x.art === 'termin');
  function ordneZeitleiste() {
    const P = S.plan; if (!P || !Array.isArray(P.zeitleiste)) return;
    P.zeitleiste.sort((a, b) => String(a.datum).localeCompare(String(b.datum)) || String(a.zeit || '').localeCompare(String(b.zeit || '')));
  }
  async function terminErledigt(id, wert) {
    const t = findeTermin(id); if (!t) return;
    const vorher = !!t.erledigt;
    await warte(220);
    t.erledigt = wert; if (wert) t.ueberfaellig = false;
    sperreBis = 0; zeichneKopf(); zeichneInhalt();
    try {
      await post('/api/termin/erledigt', { id, erledigt: wert });
      toast(`${wert ? 'Erledigt' : 'Wieder offen'}: ${t.text}`, async () => {
        t.erledigt = vorher; hervorheben = 'z:' + id; zeichneInhalt();
        await post('/api/termin/erledigt', { id, erledigt: vorher }); holeStand();
      });
      holeStand();
    } catch (e) { t.erledigt = vorher; zeichneInhalt(); toast(e.message); }
  }
  async function terminLoeschen(id, knopf) {
    const t = findeTermin(id); if (!t) return;
    const li = knopf?.closest('li[data-zeile]');
    if (li) { sperreBis = Date.now() + 600; li.classList.add('weg'); await warte(180); }
    const liste = S.plan.zeitleiste; const pos = liste.indexOf(t);
    liste.splice(pos, 1); sperreBis = 0; zeichneKopf(); zeichneInhalt();
    try {
      const r = await post('/api/termin/loeschen', { id });
      const voll = r?.termin || t;
      toast(`Gelöscht: ${t.text}`, async () => {
        liste.splice(Math.min(pos, liste.length), 0, t); hervorheben = 'z:' + id; zeichneInhalt();
        await post('/api/termin/wiederherstellen', { termin: voll, zeile: r?.zeile }); holeStand();
      });
      holeStand();
    } catch (e) { liste.splice(pos, 0, t); zeichneInhalt(); toast(e.message); }
  }

  // ---------- PDF-Bau ----------
  async function pdfBauen() {
    if (!LIVE) return;
    if (S.pdfBau?.laeuft) { toast('Das PDF wird schon gebaut.'); return; }
    S.pdfBau = Object.assign({}, S.pdfBau, { laeuft: true });
    aktualisierePdfStatus();
    try { await post('/api/pdf/bauen', {}); toast('Das PDF wird gebaut. Das dauert meist unter einer Minute.'); }
    catch (e) { S.pdfBau = Object.assign({}, S.pdfBau, { laeuft: false }); aktualisierePdfStatus(); toast(e.message); }
  }
  function pdfBauFertig(d) {
    if (d.ok) {
      S.pdf = Object.assign({}, S.pdf, { vorhanden: true, geaendert: d.fertig || new Date().toISOString() });
      if (panel.art === 'arbeit') zeigePanel({ art: 'arbeit', pdf: panel.pdf, seite: pdfViewer?.aktuelle || 1 }, true);
      toast(`Das PDF ist fertig${num(d.seiten) ? ' (' + plural(d.seiten, 'Seite', 'Seiten') + ')' : ''}.`, null, 6000);
    } else {
      toast('Das PDF konnte nicht gebaut werden. Claude kann das reparieren: Kapitel › „Von Claude reparieren lassen“.', null, 9000);
    }
    aktualisierePdfStatus();
  }

  // ---------- Panel rechts: Lesen, PDF, Werkzeug ----------
  const panel = { art: null, schluessel: null, daten: null, zurueckFokus: null, neu: false };
  let pdfViewer = null;
  let pdfLib = null;
  function panelEl() {
    let el = $('#panel');
    if (el) return el;
    const schleier = document.createElement('div');
    schleier.className = 'panel-schleier'; schleier.dataset.a = 'panel-zu';
    document.body.appendChild(schleier);
    el = document.createElement('aside');
    el.id = 'panel'; el.className = 'panel'; el.hidden = true;
    el.setAttribute('aria-labelledby', 'panel-titel');
    el.innerHTML = `<div class="panel-kopf"><div class="panel-titel-box"><div class="panel-pfad"></div><div id="panel-titel" class="panel-titel"></div></div>
        <div class="panel-aktionen"></div>
        <button type="button" class="ik" data-a="panel-zu" aria-label="Schließen" title="Schließen (Esc)">${icon('x')}</button></div>
      <div class="panel-meta"></div><div class="panel-hinweis" role="status" hidden></div><div class="panel-leiste" hidden></div>
      <div class="panel-inhalt" tabindex="-1"></div>`;
    document.body.appendChild(el);
    return el;
  }
  const panelInhalt = () => $('#panel .panel-inhalt');
  function parseHash() {
    const roh = String(location.hash || '').replace(/^#/, '');
    if (!roh) return null;
    const teile = roh.split('/'); const art = teile[0]; const rest = teile.slice(1);
    const nimm = (re) => { const i = rest.findIndex((x) => re.test(x)); if (i < 0) return null; return rest.splice(i, 1)[0].slice(1); };
    const dec = (x) => { try { return decodeURIComponent(x); } catch { return ''; } };
    if (art === 'kapitel' && rest.length) {
      const slug = rest.shift(); const a = nimm(/^a\d+$/);
      const k = (S.kapitel || []).find((x) => kapSlug(x.nr) === slug);
      return { art: 'text', datei: k?.datei || null, absatz: a == null ? null : Number(a) };
    }
    if (art === 'text' && rest.length) { const datei = dec(rest.shift()); const a = nimm(/^a\d+$/); return { art: 'text', datei, absatz: a == null ? null : Number(a) }; }
    if (art === 'quelle' && rest.length) { const id = dec(rest.shift()); const s = nimm(/^s\d+$/); const p = nimm(/^p.+$/); return { art: 'quelle', id, seite: s ? Number(s) : null, label: p ? dec(p) : null }; }
    if (art === 'arbeit' || art === 'expose') { const s = nimm(/^s\d+$/); return { art: 'arbeit', pdf: art, seite: s ? Number(s) : null }; }
    if (art === 'skill' && rest.length) return { art: 'skill', name: dec(rest.shift()) };
    return null;
  }
  const routeSchluessel = (r) => r.art === 'text' ? 'text:' + r.datei : r.art === 'quelle' ? 'quelle:' + r.id : r.art === 'skill' ? 'skill:' + r.name : r.art === 'arbeit' ? 'pdf:' + (r.pdf || 'arbeit') : r.art;
  function route() { const r = parseHash(); if (!r) { if (panel.art) schliessePanel(false); return; } zeigePanel(r); }
  function panelAuf() {
    const el = panelEl();
    if (!el.hidden && el.classList.contains('an')) return;
    panel.zurueckFokus = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    el.hidden = false;
    document.body.classList.add('panel-auf');
    requestAnimationFrame(() => el.classList.add('an'));
  }
  function schliessePanel(hashLeeren = true) {
    const el = $('#panel'); if (!el || el.hidden) { panel.art = null; return; }
    stoppePdf();
    Object.assign(panel, { art: null, schluessel: null, daten: null, neu: false });
    el.classList.remove('an');
    document.body.classList.remove('panel-auf');
    versteckeAuswahlLeiste();
    setTimeout(() => { if (!panel.art) { el.hidden = true; panelInhalt().innerHTML = ''; } }, reduziert() ? 0 : 220);
    if (hashLeeren && location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (panel.zurueckFokus && document.contains(panel.zurueckFokus)) panel.zurueckFokus.focus({ preventScroll: true });
  }
  function setzePanelKopf(pfad, titel, meta, aktionen) {
    const el = panelEl();
    $('.panel-pfad', el).textContent = pfad || '';
    $('.panel-titel', el).textContent = titel || '';
    $('.panel-meta', el).innerHTML = meta || '';
    $('.panel-meta', el).hidden = !meta;
    $('.panel-aktionen', el).innerHTML = aktionen || '';
    if (offline) $$('.schreibt', el).forEach((b) => { b.disabled = true; });
  }
  function zeigePanelHinweis(text, knopf) {
    const b = $('#panel .panel-hinweis'); if (!b) return;
    if (!text) { b.hidden = true; b.innerHTML = ''; return; }
    b.innerHTML = `<span>${h(text)}</span>${knopf ? `<button type="button" class="link-knopf" data-a="panel-neu-laden">${h(knopf)}</button>` : ''}`;
    b.hidden = false;
  }
  async function zeigePanel(r, erzwingen = false) {
    const schluessel = routeSchluessel(r);
    if (!erzwingen && panel.art && panel.schluessel === schluessel) {
      if (r.art === 'text' && r.absatz != null) springeZuAbsatz(r.absatz);
      if ((r.art === 'quelle' || r.art === 'arbeit') && pdfViewer?.doc) pdfViewer.springe(r.seite, r.label);
      return;
    }
    stoppePdf();
    Object.assign(panel, { art: r.art, pdf: r.pdf || null, schluessel, daten: null, neu: false });
    panelAuf();
    zeigePanelHinweis('');
    $('#panel .panel-leiste').hidden = true;
    setzePanelKopf('', 'Wird geladen …', '', '');
    panelInhalt().innerHTML = '<div class="panel-laden"><div class="skelett kurz"></div><div class="skelett"></div><div class="skelett"></div></div>';
    panelInhalt().scrollTop = 0;
    try {
      if (r.art === 'text') await panelText(r);
      else if (r.art === 'quelle') await panelQuelle(r);
      else if (r.art === 'arbeit') await panelArbeit(r);
      else if (r.art === 'skill') await panelSkill(r);
    } catch (e) {
      if (panel.schluessel !== schluessel) return;
      panelInhalt().innerHTML = `<div class="panel-fehler"><p>${h(e.message || 'Das ließ sich nicht laden.')}</p>
        <p><button type="button" class="link-knopf" data-a="panel-neu-laden">Erneut versuchen</button></p></div>`;
    }
    if (!erzwingen) panelInhalt().focus({ preventScroll: true });
  }

  // --- Texte (Kapitel, Exposé …) mit Formeln und Abbildungen ---
  function sauber(html) {
    const t = document.createElement('template');
    t.innerHTML = String(html || '');
    const ERLAUBT = new Set(['EM', 'STRONG', 'B', 'I', 'SPAN', 'DIV', 'CODE', 'BR', 'SUB', 'SUP', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'DEL', 'MARK', 'S', 'PRE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD']);
    const gehe = (knoten) => {
      [...knoten.childNodes].forEach((k) => {
        if (k.nodeType === 1) {
          if (!ERLAUBT.has(k.tagName)) { k.replaceWith(document.createTextNode(k.textContent)); return; }
          [...k.attributes].forEach((a) => {
            if (a.name === 'class') k.setAttribute('class', a.value.split(/\s+/).filter((c) => /^(zit|fehlt|formel|formel-inline|tabelle)$/.test(c)).join(' '));
            else if (!['data-key', 'data-tex', 'title'].includes(a.name)) k.removeAttribute(a.name);
          });
          gehe(k);
        } else if (k.nodeType !== 3) k.remove();
      });
    };
    gehe(t.content);
    return t.innerHTML;
  }
  const absatzNr = (a) => (a.ueberschrift ? null : hat(a.nr) ? Number(a.nr) : num(a.i) + 1);
  const BILD_RE = /^!\[([^\]]*)\]\(([^)\s]+)\)(\{[^}]*\})?\s*$/;
  function abbildungHtml(a) {
    const m = String(a.text || '').trim().match(BILD_RE);
    if (!m) return '';
    const pfad = m[2].replace(/^\.\//, '').replace(/^(\.\.\/)+/, '');
    if (/^[a-z]+:/i.test(pfad) || pfad.includes('..')) return '';
    const bild = /\.(png|jpe?g|gif|svg|webp)$/i.test(pfad);
    return `<figure class="abbildung">${bild ? `<img src="/datei/${pfad.split('/').map(encodeURIComponent).join('/')}" alt="${h(m[1])}" loading="lazy">` : ''}
      <figcaption>Abbildung: ${h(m[1] || dateiName(pfad))} ${dateiLink(pfad, 0, dateiName(pfad))}</figcaption></figure>`;
  }
  function absatzHtml(a) {
    const g = a.geaendert;
    const zeit = typeof g === 'string' && !isNaN(new Date(g)) ? g : g ? aenderungsZeit(panel.daten?.datei, a.i) : '';
    const nr = absatzNr(a);
    const inhalt = abbildungHtml(a) || `<div class="absatz-text">${sauber(a.html)}</div>`;
    return `<div class="absatz${g ? ' geaendert' : ''}" data-i="${num(a.i)}" tabindex="0" aria-label="${nr ? 'Absatz ' + nr : 'Überschrift'}${g ? ', zuletzt geändert' : ''}">
      ${g ? `<span class="geaendert-zeit"${zeit ? ` data-zeit="${h(zeit)}"` : ''}>${h(zeit ? 'geändert ' + relZeit(zeit) : 'zuletzt geändert')}</span>` : ''}${inhalt}</div>`;
  }
  function aenderungsZeit(datei, i) {
    const e = (S.aenderungen || []).find((x) => x.datei === datei && (x.absaetze || []).map(num).includes(num(i)));
    return e ? e.zeit : '';
  }
  function beschrifteZitate(wurzel) {
    $$('.zit', wurzel).forEach((z) => {
      const key = z.dataset.key || '';
      if (z.classList.contains('fehlt')) { z.title = `„${key}“ fehlt im Literaturverzeichnis. Claude kann das beheben.`; return; }
      const q = (S.quellen?.liste || []).find((x) => x.bibkey === key);
      if (q) z.title = `${[autorKurz(q), q.jahr].filter(Boolean).join(' ')}: ${q.titel || ''}`;
    });
  }

  // KaTeX mit mhchem: nur live, nur wenn Formeln da sind
  let katexLaden = null;
  function ladeKatex() {
    if (!VENDOR) return Promise.resolve(null);
    if (window.katex && window.katex.__mhchem) return Promise.resolve(window.katex);
    if (katexLaden) return katexLaden;
    const skript = (src) => new Promise((ok, fehler) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fehler; document.head.appendChild(s); });
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = VENDOR + 'katex/katex.min.css'; document.head.appendChild(css);
    katexLaden = skript(VENDOR + 'katex/katex.min.js').then(() => skript(VENDOR + 'katex/mhchem.min.js'))
      .then(() => { window.katex.__mhchem = true; return window.katex; }).catch(() => { katexLaden = null; return null; });
    return katexLaden;
  }
  // Zerlegt Text in Formeln ($…$, $$…$$, \ce{…}, \pu{…}) und normalen Text
  function zerlegeFormeln(s) {
    const teile = []; let rest = ''; let i = 0;
    const raus = () => { if (rest) { teile.push({ text: rest }); rest = ''; } };
    while (i < s.length) {
      if (s[i] === '\\' && /^\\(ce|pu)\{/.test(s.slice(i, i + 4))) {
        let j = s.indexOf('{', i) + 1; let tiefe = 1;
        while (j < s.length && tiefe) { if (s[j] === '{') tiefe++; else if (s[j] === '}') tiefe--; j++; }
        if (!tiefe) { raus(); teile.push({ tex: s.slice(i, j), display: false }); i = j; continue; }
      }
      if (s[i] === '$' && s[i - 1] !== '\\') {
        const doppelt = s[i + 1] === '$';
        const ende = s.indexOf(doppelt ? '$$' : '$', i + (doppelt ? 2 : 1));
        if (ende > i + 1 && (doppelt || !s.slice(i + 1, ende).includes('\n'))) {
          raus(); teile.push({ tex: s.slice(i + (doppelt ? 2 : 1), ende), display: doppelt }); i = ende + (doppelt ? 2 : 1); continue;
        }
      }
      rest += s[i]; i++;
    }
    raus();
    return teile;
  }
  async function renderFormeln(wurzel) {
    const hatFormel = (t) => /\$|\\ce\{|\\pu\{/.test(t);
    if (!$('[data-tex], .formel, .formel-inline', wurzel) && !hatFormel(wurzel.textContent)) return;
    const katex = await ladeKatex();
    if (!katex || !document.contains(wurzel)) return;
    const optionen = (display) => ({ displayMode: display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' });
    $$('[data-tex]', wurzel).forEach((el) => { try { katex.render(el.dataset.tex, el, optionen(el.tagName !== 'SPAN')); } catch {} });
    $$('pre.formel:not([data-tex])', wurzel).forEach((el) => {
      const tex = el.textContent.trim().replace(/^\$\$|\$\$$/g, '');
      const div = document.createElement('div'); el.replaceWith(div);
      try { katex.render(tex, div, optionen(true)); } catch { div.textContent = el.textContent; }
    });
    const gang = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest('code, pre, .katex, .zit') || !hatFormel(n.nodeValue) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const knoten = []; while (gang.nextNode()) knoten.push(gang.currentNode);
    for (const n of knoten) {
      const teile = zerlegeFormeln(n.nodeValue);
      if (!teile.some((t) => t.tex)) continue;
      const frag = document.createDocumentFragment();
      for (const t of teile) {
        if (!t.tex) { frag.appendChild(document.createTextNode(t.text)); continue; }
        const el = document.createElement(t.display ? 'div' : 'span');
        try { katex.render(t.tex, el, optionen(t.display)); } catch { el.textContent = t.tex; }
        frag.appendChild(el);
      }
      n.replaceWith(frag);
    }
  }

  async function panelText(r) {
    if (!r.datei) throw new Error('Diesen Text gibt es nicht mehr.');
    if (!LIVE) {
      setzePanelKopf('', dateiName(r.datei), '', '');
      panelInhalt().innerHTML = `<div class="panel-fehler"><p>Die Leseansicht gibt es nur in der Live-Ansicht.</p><p><a href="${h(vscodeRel(r.datei))}">${h(imEditor())}</a></p></div>`;
      return;
    }
    const schluessel = panel.schluessel;
    const d = await holeJson('/api/text?datei=' + encodeURIComponent(r.datei));
    if (panel.schluessel !== schluessel) return;
    panel.daten = d;
    zeichneTextKopf();
    zeichneText();
    if (r.absatz != null) springeZuAbsatz(r.absatz);
    else { const erste = $('.absatz.geaendert', panelInhalt()); if (erste) erste.scrollIntoView({ block: 'center' }); }
  }
  function zeichneTextKopf() {
    const d = panel.daten; if (!d) return;
    const k = findeKapitelZuDatei(d.datei);
    const titel = k ? `${k.nr} ${k.titel || d.titel || ''}`.trim() : d.titel || dateiName(d.datei);
    const meta = [];
    if (k) meta.push(statusHtml(k.status));
    meta.push(`<span>${plural(d.woerter || 0, 'Wort', 'Wörter')}${k?.seiten ? ', ' + h(seitenText(k.seiten)) : ''}</span>`);
    if (d.geaendert) meta.push(`<span data-zeit-prefix="zuletzt geändert " data-zeit="${h(d.geaendert)}">zuletzt geändert ${h(relZeit(d.geaendert))}</span>`);
    const geaendert = (d.absaetze || []).filter((a) => a.geaendert).length;
    if (geaendert) meta.push(`<span>${plural(geaendert, 'Absatz', 'Absätze')} neu</span>`);
    const fehlen = Array.isArray(d.zitate_fehlen) ? d.zitate_fehlen.length : 0;
    if (fehlen) meta.push(`<span class="wichtig" title="${h(d.zitate_fehlen.join(', '))}">${fehlen === 1 ? '1 Quelle fehlt im Literaturverzeichnis' : `${fehlen} Quellen fehlen im Literaturverzeichnis`}</span>`);
    const aktionen = `${kreis(k ? aKapitel(k) : aDatei(d.datei, titel))}${ikLink(d.pfad_abs ? vscode(d.pfad_abs, 1) : vscodeRel(d.datei, 1), 'code', imEditor())}
      ${k ? los(`/schreiben ${k.nr}`, `Kapitel ${k.nr} überarbeiten`) : ''}`;
    setzePanelKopf(k ? 'Kapitel' : d.datei.startsWith('.arbeit/') ? 'Dokument' : 'Text', titel, meta.join(''), aktionen);
  }
  function zeichneText() {
    const d = panel.daten; if (!d) return;
    const box = panelInhalt();
    box.innerHTML = `<article class="lesetext">${(d.absaetze || []).map(absatzHtml).join('') || '<p class="leer">Die Datei ist noch leer.</p>'}</article>`;
    beschrifteZitate(box);
    renderFormeln(box);
  }
  function springeZuAbsatz(i) {
    const el = $(`.absatz[data-i="${num(i)}"]`, panelInhalt()); if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: reduziert() ? 'auto' : 'smooth' });
    el.classList.remove('blitz'); void el.offsetWidth; el.classList.add('blitz');
  }
  function schliesseAbsatzAktionen() { $$('#panel .absatz-aktionen').forEach((x) => x.remove()); $$('#panel .absatz.aktiv').forEach((x) => x.classList.remove('aktiv')); }
  function zeigeAbsatzAktionen(el) {
    const war = el.classList.contains('aktiv');
    schliesseAbsatzAktionen();
    if (war) return;
    const d = panel.daten; const a = (d.absaetze || []).find((x) => num(x.i) === num(el.dataset.i)); if (!a) return;
    const nr = absatzNr(a);
    el.classList.add('aktiv');
    const leiste = document.createElement('div');
    leiste.className = 'absatz-aktionen';
    leiste.innerHTML = `<span class="grau">${nr ? 'Absatz ' + nr : 'Überschrift'}</span>
      <a href="${h(d.pfad_abs ? vscode(d.pfad_abs, a.zeile) : vscodeRel(d.datei, a.zeile))}">${h(dateiName(d.datei))}:${num(a.zeile) || '?'}</a>
      <span class="luecke"></span>
      <button type="button" class="link-knopf" data-a="absatz-anhaengen" data-i="${num(a.i)}">in die Eingabe</button>`;
    el.after(leiste);
  }
  async function textNeuLaden(still) {
    if (panel.art !== 'text' || !panel.daten) return;
    const schluessel = panel.schluessel;
    const box = panelInhalt();
    let d; try { d = await holeJson('/api/text?datei=' + encodeURIComponent(panel.daten.datei)); } catch { return; }
    if (panel.schluessel !== schluessel) return;
    const sig = (x) => `${x.version}|${(x.absaetze || []).map((y) => (y.geaendert ? 1 : 0)).join('')}`;
    if (still && sig(d) === sig(panel.daten)) return;
    // Leseposition halten: obersten sichtbaren Absatz merken
    const anker = $$('.absatz', box).find((x) => x.getBoundingClientRect().bottom > box.getBoundingClientRect().top + 8);
    const vorher = anker ? anker.getBoundingClientRect().top : 0;
    panel.daten = d; panel.neu = false;
    zeigePanelHinweis('');
    zeichneTextKopf(); zeichneText();
    if (anker) { const nachher = $(`.absatz[data-i="${anker.dataset.i}"]`, box); if (nachher) box.scrollTop += nachher.getBoundingClientRect().top - vorher; }
  }
  function dateiGeaendert(pfade) {
    if (!panel.art) return;
    if (panel.art === 'text' && panel.daten && pfade.includes(panel.daten.datei)) {
      const sel = window.getSelection && window.getSelection();
      if (sel && !sel.isCollapsed && $('#panel').contains(sel.anchorNode)) { panel.neu = true; zeigePanelHinweis('Der Text wurde gerade geändert.', 'Neu laden'); }
      else textNeuLaden(true);
    }
    const muster = panel.pdf === 'expose' ? /^Expose(-neu)?\.pdf$/ : /^Arbeit(-neu)?\.pdf$/;
    if (panel.art === 'arbeit' && pfade.some((p) => muster.test(p)) && !S.pdfBau?.laeuft) {
      // Erst den neuen Stand holen, damit Datei (Arbeit-neu.pdf) und Seitenzahl stimmen
      holeStand().then(() => { if (panel.art === 'arbeit') zeigePanel({ art: 'arbeit', pdf: panel.pdf, seite: pdfViewer?.aktuelle || 1 }, true); });
    }
  }

  // --- Quellen-PDF und Arbeit.pdf ---
  async function panelQuelle(r) {
    const q = findeQuelle(r.id) || (S.quellen?.liste || []).find((x) => x.bibkey === r.id);
    if (!q) throw new Error('Diese Quelle gibt es nicht mehr.');
    const extern = sichereUrl(q.doi ? 'https://doi.org/' + encodeURI(String(q.doi)) : q.url);
    const meta = `<span>${h([autorKurz(q), q.jahr, q.venue].filter(Boolean).join(' · '))}</span>`;
    const aktionen = `${kreis(aQuelle(q))}${q.pfade?.notiz ? ikLink(vscode(q.pfade.notiz, q.notiz?.zeile_kern || 1), 'code', `Notiz in ${ED()} öffnen`) : ''}
      ${q.pdf_vorhanden && q.bibkey && LIVE ? `<button type="button" class="ik" data-a="pdf-extern" data-bibkey="${h(q.bibkey)}" title="PDF im PDF-Programm öffnen" aria-label="PDF im PDF-Programm öffnen">${icon('buch')}</button>` : ''}
      ${extern ? ikLink(extern, 'extern', 'Beim Verlag ansehen', ' target="_blank" rel="noopener"') : ''}${los(`/quellen ${qSchluessel(q)}`, q.titel || q.id)}`;
    setzePanelKopf('Quelle', q.titel || q.id, meta, aktionen);
    if (!(VENDOR && q.pdf_vorhanden && pdfRel(q))) {
      panelInhalt().innerHTML = `<div class="panel-fehler">${q.kurz ? `<p>${h(q.kurz)}</p>` : ''}
        <p class="grau">Für diese Quelle liegt noch kein PDF im Projekt.${q.open_access ? ' Sie ist frei verfügbar.' : ''}</p>
        ${liste([vorschlagZeile({ text: 'PDF besorgen lassen', hinweis: 'Claude sucht den Volltext', prompt: `/quellen ${qSchluessel(q)} PDF besorgen` }, 'pdf')])}</div>`;
      return;
    }
    await oeffnePdf({ url: '/datei/' + pdfRel(q).split('/').map(encodeURIComponent).join('/'), quelle: q, seite: r.seite, label: r.label, hashBasis: quelleHash(q) });
  }
  async function panelArbeit(r) {
    const art = r.pdf === 'expose' ? 'expose' : 'arbeit';
    const d = pdfInfo(art);
    const extern = d ? externKnopf(`data-art="${art}"`, 'Im PDF-Programm öffnen') : '';
    const aktionen = art === 'arbeit' ? `${extern}<button type="button" class="ik schreibt${S.pdfBau?.laeuft ? ' laeuft' : ''}" data-a="pdf-bauen" title="${d ? 'PDF neu bauen' : 'PDF bauen'}" aria-label="${d ? 'PDF neu bauen' : 'PDF bauen'}">${icon('neu')}</button>` : extern;
    const meta = art === 'arbeit' ? pdfStatusHtml() : d ? `<span>${[d.zeit ? 'gebaut ' + h(relZeit(d.zeit)) : '', hat(d.seiten) ? zahl(d.seiten) + ' S.' : '', d.veraltet ? 'veraltet' : ''].filter(Boolean).join(' · ')}</span>` : '';
    setzePanelKopf('PDF', d?.datei || PDF_ART[art].datei, meta, aktionen);
    if (!d) { panelInhalt().innerHTML = `<div class="panel-fehler"><p class="grau">${art === 'arbeit' ? 'Noch kein PDF gebaut. „PDF bauen“ baut einen Entwurf aus allen Kapiteln.' : 'Noch kein Exposé-PDF. Sag Claude: /pdf expose'}</p></div>`; return; }
    const url = (d.url || '/datei/' + d.datei) + (String(d.url || '').includes('?') ? '&' : '?') + 'v=' + Date.now();
    await oeffnePdf({ url, quelle: null, seite: r.seite, hashBasis: PDF_ART[art].hash });
  }
  async function ladePdfJs() {
    if (pdfLib) return pdfLib;
    pdfLib = await import(VENDOR + 'pdfjs/pdf.min.mjs');
    pdfLib.GlobalWorkerOptions.workerSrc = VENDOR + 'pdfjs/pdf.worker.min.mjs';
    return pdfLib;
  }
  function stoppePdf() {
    if (!pdfViewer) return;
    try { pdfViewer.beobachter?.disconnect(); } catch {}
    try { pdfViewer.task?.destroy(); } catch {}
    pdfViewer = null;
    versteckeAuswahlLeiste();
  }
  // Gedruckte Seitenzahl (PageLabels) zu einer PDF-Seite und zurück, B3
  const zielSeite = (v, n, lbl) => (lbl ? ((v.labels && v.labels.indexOf(String(lbl)) + 1) || num(lbl) || 1) : (num(n) || 1));
  const seitenLabel = (v, n) => (v.labels && v.labels[n - 1] ? String(v.labels[n - 1]) : '');
  async function oeffnePdf({ url, quelle, seite, label, hashBasis }) {
    const schluessel = panel.schluessel;
    const lib = await ladePdfJs();
    if (panel.schluessel !== schluessel) return;
    const leiste = $('#panel .panel-leiste');
    leiste.innerHTML = `<label>Seite <input type="number" min="1" value="${num(seite) || 1}" id="pdf-seite" inputmode="numeric"></label>
      <span class="grau" id="pdf-seiten">von …</span><span class="grau" id="pdf-label"></span><span class="luecke"></span>
      <button type="button" class="icon-knopf" data-a="pdf-zoom" data-v="-1" aria-label="Verkleinern" title="Verkleinern">${icon('minus')}</button>
      <span class="mono grau" id="pdf-zoom">100 %</span>
      <button type="button" class="icon-knopf" data-a="pdf-zoom" data-v="1" aria-label="Vergrößern" title="Vergrößern">${icon('plus')}</button>
      <button type="button" class="icon-knopf" data-a="pdf-breite" aria-label="An Breite anpassen" title="An Breite anpassen" aria-pressed="true">${icon('breite')}</button>`;
    leiste.hidden = false;
    const box = panelInhalt();
    box.innerHTML = '<div class="pdf-seiten" id="pdf-seiten-box"></div>';
    const task = lib.getDocument({ url, isEvalSupported: false, enableXfa: false });
    const v = { task, doc: null, quelle, hashBasis, scale: 1, modus: 'breite', aktuelle: num(seite) || 1, boxen: [], gerendert: new Map(), labels: null };
    pdfViewer = v;
    let doc;
    try { doc = await task.promise; } catch (e) { if (pdfViewer === v) throw new Error('Das PDF lässt sich nicht öffnen.'); return; }
    if (pdfViewer !== v) return;
    v.doc = doc;
    try { v.labels = await doc.getPageLabels(); } catch { v.labels = null; }
    const vp1 = (await doc.getPage(1)).getViewport({ scale: 1 });
    v.basis = { w: vp1.width, h: vp1.height };
    $('#pdf-seiten').textContent = `von ${doc.numPages}`;
    $('#pdf-seite').max = doc.numPages;
    v.springe = (n, lbl) => pdfSpringe(v, zielSeite(v, n, lbl), true);
    pdfLayout(v);
    pdfSpringe(v, zielSeite(v, v.aktuelle, label), false);
    box.addEventListener('scroll', () => pdfScroll(v), { passive: true });
  }
  function pdfLayout(v) {
    v.scale = v.modus === 'breite' ? Math.max(0.4, Math.min(3, (panelInhalt().clientWidth - 32) / v.basis.w)) : v.scale;
    const box = $('#pdf-seiten-box'); if (!box) return;
    try { v.beobachter?.disconnect(); } catch {}
    v.gerendert.clear(); box.innerHTML = ''; v.boxen = [];
    for (let n = 1; n <= v.doc.numPages; n++) {
      const s = document.createElement('div');
      s.className = 'pdf-seite'; s.dataset.nr = n;
      s.style.width = Math.floor(v.basis.w * v.scale) + 'px';
      s.style.height = Math.floor(v.basis.h * v.scale) + 'px';
      s.style.setProperty('--scale-factor', v.scale);
      s.style.setProperty('--total-scale-factor', v.scale);
      s.innerHTML = `<span class="pdf-nr">${n}</span>`;
      box.appendChild(s); v.boxen.push(s);
    }
    v.beobachter = new IntersectionObserver((e) => e.forEach((x) => { if (x.isIntersecting) pdfRender(v, Number(x.target.dataset.nr)); }), { root: panelInhalt(), rootMargin: '600px 0px' });
    v.boxen.forEach((s) => v.beobachter.observe(s));
    $('#pdf-zoom').textContent = Math.round(v.scale * 100) + ' %';
    $('[data-a="pdf-breite"]')?.setAttribute('aria-pressed', String(v.modus === 'breite'));
  }
  async function pdfRender(v, nr) {
    if (v.gerendert.has(nr) || !v.doc) return;
    v.gerendert.set(nr, 'laeuft');
    const scale = v.scale;
    try {
      const page = await v.doc.getPage(nr);
      if (pdfViewer !== v || v.scale !== scale) return;
      const vp = page.getViewport({ scale });
      const s = v.boxen[nr - 1]; if (!s) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
      canvas.style.width = Math.floor(vp.width) + 'px'; canvas.style.height = Math.floor(vp.height) + 'px';
      await page.render({ canvas, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
      if (pdfViewer !== v || v.scale !== scale) return;
      const text = document.createElement('div'); text.className = 'textLayer';
      s.style.width = Math.floor(vp.width) + 'px'; s.style.height = Math.floor(vp.height) + 'px';
      s.replaceChildren(canvas, text);
      await new pdfLib.TextLayer({ textContentSource: page.streamTextContent(), container: text, viewport: vp }).render();
      v.gerendert.set(nr, 'fertig');
    } catch (e) { if (!e || e.name !== 'RenderingCancelledException') v.gerendert.delete(nr); }
  }
  function zeigeSeite(v, nr) {
    v.aktuelle = nr;
    const eingabe = $('#pdf-seite'); if (eingabe && document.activeElement !== eingabe) eingabe.value = nr;
    const lbl = seitenLabel(v, nr); const el = $('#pdf-label');
    if (el) el.textContent = lbl && lbl !== String(nr) ? `(gedruckt S. ${lbl})` : '';
  }
  function pdfSpringe(v, n, weich) {
    const nr = Math.max(1, Math.min(v.doc?.numPages || 1, num(n) || 1));
    const s = v.boxen[nr - 1]; if (!s) return;
    panelInhalt().scrollTo({ top: s.offsetTop - 12, behavior: weich && !reduziert() ? 'smooth' : 'auto' });
    zeigeSeite(v, nr);
  }
  let pdfScrollRaf = 0;
  function pdfScroll(v) {
    if (pdfScrollRaf) return;
    pdfScrollRaf = requestAnimationFrame(() => {
      pdfScrollRaf = 0;
      if (pdfViewer !== v) return;
      const box = panelInhalt(); const mitte = box.scrollTop + box.clientHeight / 3;
      let nr = 1;
      for (const s of v.boxen) { if (s.offsetTop <= mitte) nr = Number(s.dataset.nr); else break; }
      if (nr !== v.aktuelle) { zeigeSeite(v, nr); history.replaceState(null, '', `${v.hashBasis}${nr > 1 ? '/s' + nr : ''}`); }
      versteckeAuswahlLeiste();
    });
  }
  function pdfZoom(v, richtung, modus) {
    if (!v?.doc) return;
    const seite = v.aktuelle; const s = v.boxen[seite - 1]; const box = panelInhalt();
    const anteil = s ? (box.scrollTop - s.offsetTop) / Math.max(1, s.offsetHeight) : 0;
    if (modus === 'breite') v.modus = 'breite';
    else { v.modus = 'frei'; v.scale = Math.max(0.4, Math.min(4, v.scale * (richtung > 0 ? 1.2 : 1 / 1.2))); }
    pdfLayout(v);
    const neu = v.boxen[seite - 1]; if (neu) box.scrollTop = neu.offsetTop + anteil * neu.offsetHeight;
  }
  function versteckeAuswahlLeiste() { const el = $('#auswahl-leiste'); if (el) el.hidden = true; }
  function pruefeAuswahl() {
    if (!pdfViewer) return;
    const sel = window.getSelection();
    const text = sel ? sel.toString().replace(/\s+/g, ' ').trim() : '';
    const knoten = sel && sel.anchorNode;
    const seiteEl = knoten && (knoten.nodeType === 1 ? knoten : knoten.parentElement)?.closest('.pdf-seite');
    if (!text || !seiteEl || !$('#panel').contains(seiteEl)) { versteckeAuswahlLeiste(); return; }
    let el = $('#auswahl-leiste');
    if (!el) { el = document.createElement('div'); el.id = 'auswahl-leiste'; el.className = 'auswahl-leiste'; panelEl().appendChild(el); }
    const nr = Number(seiteEl.dataset.nr); const lbl = seitenLabel(pdfViewer, nr);
    const q = pdfViewer.quelle;
    el.innerHTML = `${q && q.bibkey ? `<button type="button" class="knopf haupt schreibt" data-a="zitat-uebernehmen">Als Zitat merken, S. ${h(lbl || nr)}</button>` : ''}
      <button type="button" class="knopf" data-a="auswahl-anhaengen">In die Eingabe</button>`;
    Object.assign(el.dataset, { seite: String(nr), label: lbl, text: text.slice(0, 4000) });
    if (offline) $$('.schreibt', el).forEach((b) => { b.disabled = true; });
    el.hidden = false;
    const r = sel.getRangeAt(0).getBoundingClientRect(); const p = $('#panel').getBoundingClientRect();
    const breite = el.offsetWidth || 260;
    el.style.left = Math.max(8, Math.min(p.width - breite - 8, r.left - p.left + r.width / 2 - breite / 2)) + 'px';
    el.style.top = (r.top - p.top - el.offsetHeight - 8 > 64 ? r.top - p.top - el.offsetHeight - 8 : r.bottom - p.top + 8) + 'px';
  }
  async function zitatUebernehmen() {
    const leiste = $('#auswahl-leiste'); const q = pdfViewer?.quelle; if (!leiste || !q) return;
    const seitePdf = Number(leiste.dataset.seite); const seite = leiste.dataset.label || ''; const text = leiste.dataset.text;
    try {
      const r = await post('/api/zitat', { bibkey: q.bibkey, seite, seite_pdf: seitePdf, text });
      versteckeAuswahlLeiste(); window.getSelection()?.removeAllRanges();
      toast(seite ? `Zitat von S. ${seite} gemerkt.` : `Zitat von PDF-Seite ${seitePdf} gemerkt. Das PDF nennt keine gedruckte Seitenzahl, bitte in der Notiz prüfen.`,
        r?.id ? async () => { await post('/api/zitat/entfernen', { bibkey: q.bibkey, id: r.id }); holeStand(); } : null, seite ? 8000 : 10000);
      holeStand();
    } catch (e) { toast(e.message); }
  }

  // --- Werkzeuge (Skills) in Menschensprache ---
  function md(text) {
    const zeilen = String(text || '').replace(/\r\n?/g, '\n').replace(/^---\n[\s\S]*?\n---\n?/, '').split('\n');
    const inline = (s) => h(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    const aus = []; let liste = null; let absatz = []; let code = null;
    const fertig = () => {
      if (absatz.length) { aus.push(`<p>${inline(absatz.join(' '))}</p>`); absatz = []; }
      if (liste) { aus.push(`<${liste.typ}>${liste.punkte.map((p) => `<li>${inline(p)}</li>`).join('')}</${liste.typ}>`); liste = null; }
    };
    for (const z of zeilen) {
      if (code !== null) { if (/^```/.test(z)) { aus.push(`<pre><code>${h(code.join('\n'))}</code></pre>`); code = null; } else code.push(z); continue; }
      if (/^```/.test(z)) { fertig(); code = []; continue; }
      const ueber = z.match(/^(#{1,6})\s+(.*)$/);
      if (ueber) { fertig(); const n = Math.min(4, ueber[1].length + 1); aus.push(`<h${n}>${inline(ueber[2])}</h${n}>`); continue; }
      const punkt = z.match(/^\s*([-*]|\d+\.)\s+(.*)$/);
      if (punkt) {
        if (absatz.length) { aus.push(`<p>${inline(absatz.join(' '))}</p>`); absatz = []; }
        const typ = /\d/.test(punkt[1]) ? 'ol' : 'ul';
        if (!liste || liste.typ !== typ) { fertig(); liste = { typ, punkte: [] }; }
        liste.punkte.push(punkt[2]); continue;
      }
      if (!z.trim()) { fertig(); continue; }
      if (liste && /^\s{2,}/.test(z)) { liste.punkte[liste.punkte.length - 1] += ' ' + z.trim(); continue; }
      if (liste) fertig();
      absatz.push(z.trim());
    }
    if (code !== null) aus.push(`<pre><code>${h(code.join('\n'))}</code></pre>`);
    fertig();
    return aus.join('\n');
  }
  async function panelSkill(r) {
    const s = skills().find((x) => x.name === r.name || x.ordner === r.name) || { name: r.name, titel: r.name, kurz: '' };
    const aktionen = `<button type="button" class="ik" data-a="skill-aendern" data-v="${h(s.name)}" title="Befehl anpassen lassen" aria-label="Befehl anpassen lassen">${icon('stift')}</button>
      <button type="button" class="ik" data-a="in-eingabe" data-p="/${h(s.name)} " title="In die Eingabe legen" aria-label="In die Eingabe legen">${icon('eingabe')}</button>${los('/' + s.name, s.titel)}`;
    setzePanelKopf('Befehl', s.titel, `<span class="mono">/${h(s.name)}${s.argument ? ' ' + h(s.argument) : ''}</span>${s.eigen ? '<span>eigener Befehl</span>' : ''}`, aktionen);
    const mensch = `<p class="kern">${h(s.kurz)}</p>${s.wann ? `<h3>Wann hilft das?</h3><p>${h(s.wann)}</p>` : ''}${s.bsp ? `<h3>Beispiel</h3><p>Schreib oben in die Eingabe: <code>${h(s.bsp)}</code></p>` : ''}`;
    if (!LIVE) { panelInhalt().innerHTML = `<div class="lesetext md">${mensch}</div>`; return; }
    const schluessel = panel.schluessel;
    let d = null; try { d = await holeJson('/api/skill?name=' + encodeURIComponent(s.ordner || r.name)); } catch {}
    if (panel.schluessel !== schluessel) return;
    panelInhalt().innerHTML = `<div class="lesetext md">${s.kurz ? mensch : `<p class="kern">${h(d?.beschreibung || '')}</p>`}
      ${d?.inhalt ? `<details class="technik"><summary>Technische Details: die Anleitung, die Claude dabei liest</summary>${md(d.inhalt)}
        ${d.pfad ? `<p class="fussnote">${dateiLink(d.pfad, 1)}</p>` : ''}</details>` : ''}</div>`;
  }

  // ---------- Gerüst ----------
  function baueGeruest() {
    const oben = $('#oben');
    // Wächst die Eingabe (Bausteine), bleibt der Inhalt darunter, wo er war: nichts springt
    let vorher = oben.offsetHeight;
    const messe = () => {
      const jetzt = oben.offsetHeight;
      document.documentElement.style.setProperty('--oben-h', jetzt + 'px');
      if (window.scrollY > 0 && jetzt !== vorher) window.scrollBy(0, jetzt - vorher);
      vorher = jetzt;
    };
    if (window.ResizeObserver) new ResizeObserver(messe).observe(oben); else window.addEventListener('resize', messe);
    messe();
    baueKonfig();
    panelEl();
  }

  // ---------- Ereignisse ----------
  const SCHREIBEND = new Set(['q-status', 'q-stern', 'q-marke', 'k-status', 't-erledigt', 't-loeschen', 'pdf-bauen', 'zitat-uebernehmen']);
  const INTERAKTIV = 'a, button, input, select, textarea, label, summary';
  const THEMEN = ['system', 'dunkel', 'hell'];

  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-a]');
    if (wahl.art && !e.target.closest('#wahl, [data-a="befehle"], [data-a="datei-menue"], #prompt')) schliesseWahl(false);
    if (!el) {
      const absatzEl = e.target.closest('#panel .absatz');
      if (absatzEl && !e.target.closest(INTERAKTIV) && window.getSelection()?.isCollapsed !== false) zeigeAbsatzAktionen(absatzEl);
      else if (e.target.closest('#panel') && !e.target.closest('.absatz-aktionen')) schliesseAbsatzAktionen();
      return;
    }
    const a = el.dataset.a;
    // Zeile aufklappen: nur wenn nicht auf ein anderes Bedienelement in der Zeile geklickt wurde
    if (a === 'auf') { const i = e.target.closest(INTERAKTIV); if (i && !i.classList.contains('zeile-auf')) return; }
    if (SCHREIBEND.has(a) && (!LIVE || offline)) { e.preventDefault(); toast(LIVE ? NICHT_ERREICHBAR : 'Das geht nur in der Live-Ansicht.'); return; }
    if (el.tagName === 'A') e.preventDefault();
    switch (a) {
      case 'reiter': waehleReiter(el.dataset.v); break;
      case 'thema': setzeThema(THEMEN[(THEMEN.indexOf(thema) + 1) % THEMEN.length]); zeichneKopf(); $('[data-a="thema"]')?.focus(); toast(THEMA_TEXT[thema] + '.', null, 2500); break;
      case 'senden': sendeEingabe(); break;
      case 'start': starte(el.dataset.p || ''); break;
      case 'in-eingabe': setzeText(el.dataset.p || ''); fokusEingabe(); pruefeSlash(); break;
      case 'kreis': { let b = null; try { b = JSON.parse(el.dataset.b); } catch {} if (b) bausteinSchalten(b); break; }
      case 'baustein-weg': ui.anhaenge.splice(Number(el.dataset.i), 1); merke(); zeichneBausteine(); markiereKreise(); fokusEingabe(); break;
      case 'bausteine-auf': ui.bausteineAuf = !ui.bausteineAuf; merke(); zeichneBausteine(); break;
      case 'bausteine-weg': ui.anhaenge = []; ui.bausteineAuf = false; merke(); zeichneBausteine(); markiereKreise(); fokusEingabe(); break;
      case 'befehle': if (wahl.art === 'befehl' && !wahl.tippen) schliesseWahl(true); else oeffneWahl('befehl', false); break;
      case 'datei-menue': if (wahl.art === 'datei') schliesseWahl(true); else oeffneWahl('datei', false); break;
      case 'wahl-nimm': nimmWahl(Number(el.dataset.i)); break;
      case 'upload': $('#datei-wahl')?.click(); break;
      case 'auftrag': auftrag(el.dataset.cmd || '', el.dataset.text || '', el.dataset.sofort === '1'); break;
      case 'neu-verbinden': versuch = 0; verbinde(); holeStand(); break;
      case 'auf': {
        const id = el.dataset.id; const i = ui.offen.indexOf(id);
        if (i >= 0) ui.offen.splice(i, 1); else ui.offen.push(id);
        ui.offen = ui.offen.slice(-30); merke(); zeichneInhalt(); break;
      }
      case 'baum': { const id = el.dataset.id; baumZustand[id] = !baumOffen(id, el.dataset.std === '1'); merkeBaum(); zeichneInhalt(); break; }
      case 'baum-alle': baumAlle(el.dataset.v === '1'); break;
      case 'filter': ui.filter = el.dataset.v; ui.qabgleich = ''; merke(); zeichneInhalt(); break;
      case 'q-abgleich': ui.qabgleich = ui.qabgleich === el.dataset.v ? '' : el.dataset.v; merke(); zeichneInhalt(); break;
      case 'suche-leeren': ui.suche = ''; merke(); zeichneInhalt(); $('#suche')?.focus(); break;
      case 'q-status': quelleSetzen(el.dataset.id, { status: el.dataset.v }, el.closest('li[data-zeile]')); break;
      case 'q-stern': quelleSetzen(el.dataset.id, { stern: Number(el.dataset.v) }, null, Number(el.dataset.v) ? `Bewertung: ${'★'.repeat(Number(el.dataset.v))}` : 'Bewertung entfernt'); break;
      case 'q-marke': {
        const q = findeQuelle(el.dataset.id); if (!q) return;
        const m = new Set(q.markierungen || []); const an = !m.has(el.dataset.v); an ? m.add(el.dataset.v) : m.delete(el.dataset.v);
        const name = (MARKIERUNGEN.find(([x]) => x === el.dataset.v) || [])[1] || el.dataset.v;
        quelleSetzen(q.id, { markierungen: [...m] }, null, `Markierung „${name}“ ${an ? 'gesetzt' : 'entfernt'}`); break;
      }
      case 'q-anhaengen': { const q = findeQuelle(el.dataset.id); if (q) bausteinSchalten(aQuelle(q)); break; }
      case 'k-anhaengen': { const k = (S.kapitel || []).find((x) => String(x.nr) === el.dataset.nr); if (k) bausteinSchalten(aKapitel(k)); break; }
      case 'k-status': setzeKapitelStatus(el.dataset.nr, el.dataset.v); break;
      case 't-erledigt': terminErledigt(el.dataset.id, el.checked); break;
      case 't-loeschen': terminLoeschen(el.dataset.id, el); break;
      case 'check-neu': checkErgebnis = null; zeichneInhalt(); ladeCheck(true); break;
      case 'toast-zurueck': macheRueckgaengig(Number(el.dataset.t)); break;
      case 'toast-zu': entferneToast(Number(el.dataset.t)); break;
      case 'panel-zu': schliessePanel(true); break;
      case 'panel-neu-laden': if (panel.art === 'text' && panel.daten) textNeuLaden(); else { const r = parseHash(); if (r) zeigePanel(r, true); } break;
      case 'absatz-anhaengen': {
        const d = panel.daten; const ab = d && d.absaetze.find((x) => num(x.i) === Number(el.dataset.i));
        if (ab) anhaengen(aAbsatz(d.datei, ab), 'Überarbeite diesen Absatz: ');
        schliesseAbsatzAktionen(); break;
      }
      case 'pdf-bauen': pdfBauen(); break;
      case 'pdf-extern': pdfExtern(el.dataset.bibkey ? { bibkey: el.dataset.bibkey } : { art: el.dataset.art || 'arbeit' }); break;
      case 'pdf-reparieren': starte(`/pdf Der PDF-Bau ist gescheitert. Meldung: ${S.pdfBau?.meldung || 'unbekannt'}`); break;
      case 'pdf-zoom': pdfZoom(pdfViewer, Number(el.dataset.v)); break;
      case 'pdf-breite': pdfZoom(pdfViewer, 0, 'breite'); break;
      case 'zitat-uebernehmen': zitatUebernehmen(); break;
      case 'auswahl-anhaengen': { const l = $('#auswahl-leiste'); if (l) anhaengen(aPdfStelle(pdfViewer?.quelle, l.dataset.label || l.dataset.seite, l.dataset.text)); versteckeAuswahlLeiste(); break; }
      case 'skill-neu': setzeText('Lege einen eigenen Befehl (Skill) an, der Folgendes tut: '); fokusEingabe(); break;
      case 'skill-aendern': setzeText(`Ändere den Befehl /${el.dataset.v} so: `); fokusEingabe(); break;
    }
  });

  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.id === 'datei-wahl') { await hochladen(el.files); el.value = ''; return; }
    if (el.id === 'editor-wahl') { el.blur(); setzeEditor(el.value); return; }
    if (el.id === 'sortierung') { ui.sortierung = el.value; merke(); zeichneQuellenListe(); return; }
    if (el.id === 'pdf-seite' && pdfViewer) pdfSpringe(pdfViewer, el.value, true);
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'suche') { ui.suche = e.target.value; merke(); zeichneQuellenListe(); }
    if (e.target.dataset && e.target.dataset.notiz !== undefined && LIVE) notizGetippt(e.target);
  });
  document.addEventListener('focusout', () => { if (nachladenAusstehend) setTimeout(zeichneWennMoeglich, 50); });
  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'termin-form') return;
    e.preventDefault();
    const form = e.target;
    if (!LIVE || offline) { toast(NICHT_ERREICHBAR); return; }
    const daten = Object.fromEntries(new FormData(form).entries());
    try {
      const r = await post('/api/termin', daten);
      form.reset();
      const t = r?.termin;
      if (t && S.plan) {
        (S.plan.zeitleiste = S.plan.zeitleiste || []).push(Object.assign({ art: 'termin', tage: null }, t));
        ordneZeitleiste(); hervorheben = 'z:' + t.id;
      }
      zeichneInhalt();
      toast(`Eingetragen: ${t?.text || daten.text}`, t ? async () => {
        S.plan.zeitleiste = S.plan.zeitleiste.filter((x) => x.id !== t.id); zeichneInhalt();
        await post('/api/termin/loeschen', { id: t.id }); holeStand();
      } : null);
      holeStand();
    } catch (err) { toast(err.message); }
  });

  const istEingabe = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  document.addEventListener('keydown', (e) => {
    const ziel = e.target;
    if (e.key === 'Escape') {
      if (wahl.art) { schliesseWahl(true); return; }
      if ($('#auswahl-leiste') && !$('#auswahl-leiste').hidden) { versteckeAuswahlLeiste(); return; }
      if ($('#panel .absatz-aktionen')) { const akt = $('#panel .absatz.aktiv'); schliesseAbsatzAktionen(); akt?.focus(); return; }
      if (panel.art) { schliessePanel(true); return; }
    }
    // „/“ irgendwo auf der Seite: in die Eingabe und Befehle zeigen, wie im Terminal
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !istEingabe(ziel) && !panel.art) {
      e.preventDefault();
      if (!String(ui.text || '').trim()) setzeText('/');
      fokusEingabe(); pruefeSlash(); return;
    }
    // Fokus im offenen Panel halten (Tab), solange es offen ist
    if (e.key === 'Tab' && panel.art) {
      const f = $$('#panel a[href], #panel button:not([disabled]), #panel input, #panel [tabindex="0"]').filter((x) => x.offsetParent !== null);
      if (f.length && !$('#panel').contains(ziel)) { e.preventDefault(); f[0].focus(); return; }
      if (f.length && ziel === f[f.length - 1] && !e.shiftKey) { e.preventDefault(); f[0].focus(); return; }
      if (f.length && ziel === f[0] && e.shiftKey) { e.preventDefault(); f[f.length - 1].focus(); return; }
    }
    if (ziel.getAttribute && ziel.getAttribute('role') === 'tab') {
      const i = REITER.findIndex(([r]) => r === ziel.dataset.v);
      const n = { ArrowRight: (i + 1) % REITER.length, ArrowLeft: (i - 1 + REITER.length) % REITER.length, Home: 0, End: REITER.length - 1 }[e.key];
      if (n !== undefined) { e.preventDefault(); waehleReiter(REITER[n][0], true); return; }
    }
    if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey && !e.altKey && !istEingabe(ziel)) { if (macheRueckgaengig()) { e.preventDefault(); return; } }
    if ((e.key === 'Enter' || e.key === ' ') && ziel.matches && ziel.matches('[role="button"][data-a]')) { e.preventDefault(); ziel.click(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && ziel.matches && ziel.matches('#panel .absatz')) { e.preventDefault(); zeigeAbsatzAktionen(ziel); }
  });
  document.addEventListener('selectionchange', () => { if (!pdfViewer) return; clearTimeout(pruefeAuswahl.t); pruefeAuswahl.t = setTimeout(pruefeAuswahl, 180); });
  window.addEventListener('hashchange', route);
  let groesseTimer = null;
  window.addEventListener('resize', () => { clearTimeout(groesseTimer); groesseTimer = setTimeout(() => { if (pdfViewer?.doc && pdfViewer.modus === 'breite') pdfZoom(pdfViewer, 0, 'breite'); }, 200); });

  // Ziehen und Ablegen: überall ablegen lädt in den Eingang
  let ziehZaehler = 0;
  const ziehAnzeige = (an) => { $('#eingabe')?.classList.toggle('zieht', an); };
  window.addEventListener('dragenter', (e) => { if (e.dataTransfer?.types?.includes('Files')) { ziehZaehler++; ziehAnzeige(true); } });
  window.addEventListener('dragleave', () => { ziehZaehler = Math.max(0, ziehZaehler - 1); if (!ziehZaehler) ziehAnzeige(false); });
  window.addEventListener('dragover', (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); });
  window.addEventListener('drop', (e) => { if (!e.dataTransfer?.files?.length) return; e.preventDefault(); ziehZaehler = 0; ziehAnzeige(false); hochladen(e.dataTransfer.files); });

  // Relative Zeiten still nachführen, ohne neu zu zeichnen
  setInterval(() => { $$('[data-zeit]').forEach((el) => { const t = (el.dataset.zeitPrefix || '') + relZeit(el.dataset.zeit); if (t && el.textContent !== t) el.textContent = t; }); }, 30000);

  // Schnittstelle für eigene Anpassungen (.arbeit/dashboard-anpassungen.js)
  window.SW = { stand: () => S, neuZeichnen: () => zeichneAlles(), auftrag, anhaengen, reiter: (id) => waehleReiter(id), toast,
    panel: (hash) => { if (location.hash === hash) route(); else location.hash = hash; } };

  baueGeruest();
  zeichneAlles();
  if (!LIVE) toast(`Das ist eine Nur-Lese-Kopie, Stand ${uhrzeit(S.erzeugt)}. Die Live-Ansicht mit allen Knöpfen: in Claude /dashboard eingeben.`, null, 9000);
  verbinde();
  route();
})();
