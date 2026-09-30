/* Scientific Writing Dashboard, Browser-Teil. Kein Build, keine Abhängigkeiten zur Laufzeit
   (pdf.js liegt unter kit/dashboard/vendor/pdfjs und wird nur für die PDF-Ansicht nachgeladen).
   Daten: window.__STAND__ (von stand.mjs), Modus: window.__MODUS__ ({ statisch, port, url }).
   Vertrag mit dem Server: kit/dashboard/API.md.
   Eigene Erweiterungen gehören nach arbeit/dashboard-anpassungen.js. Dort steht window.SW bereit:
   SW.stand(), SW.neuZeichnen(), SW.auftrag(cmd, text, sofort), SW.baustein(obj), SW.reiter(id),
   SW.toast(text, rueckgaengig), SW.panel(hash). */
(function () {
  'use strict';

  const MODUS = window.__MODUS__ || { statisch: true, port: 4711 };
  let S = window.__STAND__ || {};
  const LIVE = !MODUS.statisch;
  const PDF_ANSICHT = LIVE && !!MODUS.vendor;

  // ---------- Feste Texte ----------
  const COMMANDS = [
    { cmd: '/start', gruppe: 'arbeit', kurz: 'Projekt einrichten oder Einstellungen ändern',
      lang: 'Einmaliges Interview: du, deine Arbeit, Hochschule, Fristen, Format. Später auch zum Ändern von Einstellungen.', bsp: '/start' },
    { cmd: '/weiter', gruppe: 'arbeit', kurz: 'Nächsten sinnvollen Schritt machen',
      lang: 'Claude schaut, wo du stehst, und führt dich durch den nächsten Schritt: Thema, Exposé, Gliederung, Kapitel. Am Ende fragt es, ob du freigibst.', bsp: '/weiter' },
    { cmd: '/schreiben', gruppe: 'arbeit', kurz: 'Kapitel planen, schreiben oder überarbeiten',
      lang: 'Mit Kapitelnummer schreibt Claude dieses Unterkapitel. Hast du selbst etwas geschrieben, überarbeitet ihr es gemeinsam.', bsp: '/schreiben 2.1' },
    { cmd: '/pruefen', gruppe: 'arbeit', kurz: 'Text prüfen lassen',
      lang: 'Prüft Sprache, Zitattreue gegen die Originalquelle, Argumentation (mit Notenschätzung) und Umfang. Ohne Nummer: nächstes ungeprüftes Kapitel.', bsp: '/pruefen 2.1' },
    { cmd: '/recherche', gruppe: 'quellen', kurz: 'Literatur suchen lassen',
      lang: 'Claude sucht in Fachdatenbanken, der SLUB und im Web und legt Vorschläge im Reiter Quellen ab. Du entscheidest: nehmen, später, verwerfen.', bsp: '/recherche maschinelles Lernen Reaktionsvorhersage' },
    { cmd: '/quellen', gruppe: 'quellen', kurz: 'Entscheidungen und Uploads verarbeiten',
      lang: 'Genommene Quellen kommen ins Literaturverzeichnis, PDFs werden geholt und ausgewertet, Dateien aus dem Eingang einsortiert.', bsp: '/quellen' },
    { cmd: '/pdf', gruppe: 'technik', kurz: 'PDF bauen',
      lang: 'Baut aus allen Kapiteln das fertige PDF (Arbeit.pdf). Mit „entwurf“ auch mit Lücken.', bsp: '/pdf entwurf' },
    { cmd: '/sync', gruppe: 'technik', kurz: 'Sichern und mit GitHub abgleichen',
      lang: 'Speichert deinen Stand auf GitHub und holt Änderungen von anderen Geräten. Mach das am Ende jedes Arbeitstags.', bsp: '/sync' },
    { cmd: '/update', gruppe: 'technik', kurz: 'Neue Kit-Version holen',
      lang: 'Holt Verbesserungen am Kit. Deine Texte, Quellen, Einstellungen und eigenen Skills bleiben unberührt.', bsp: '/update' },
    { cmd: '/hilfe', gruppe: 'technik', kurz: 'Wo bin ich, was jetzt, etwas geht nicht',
      lang: 'Erklärt, wo du stehst und was als Nächstes sinnvoll ist. Prüft die Technik und repariert, was geht.', bsp: '/hilfe das PDF baut nicht' },
    { cmd: '/dashboard', gruppe: 'technik', kurz: 'Dashboard öffnen oder umbauen',
      lang: 'Öffnet diese Seite. Mit „anpassen“ und einem Wunsch baut Claude das Dashboard für dich um.', bsp: '/dashboard anpassen zeig mir die Quellen nach Kapitel sortiert' },
  ];
  const GRUPPEN = [['arbeit', 'Arbeit'], ['quellen', 'Quellen'], ['technik', 'Technik'], ['eigene', 'Eigene']];

  const REITER = [
    { id: 'uebersicht', name: 'Übersicht' },
    { id: 'quellen', name: 'Quellen' },
    { id: 'kapitel', name: 'Kapitel' },
    { id: 'plan', name: 'Plan' },
    { id: 'hilfe', name: 'Hilfe' },
  ];

  const MARKIERUNGEN = ['kernquelle', 'methodik', 'daten', 'review', 'kritisch', 'definition', 'gegenposition'];
  const KAPITEL_STATUS = ['offen', 'geplant', 'entwurf', 'geprueft', 'final'];
  const STATUS_NAME = { offen: 'offen', geplant: 'geplant', entwurf: 'entwurf', geprueft: 'geprüft', final: 'final' };
  const STATUS_GLYPH = { offen: '○', geplant: '◌', entwurf: '◐', geprueft: '●', final: '✓' };
  const ART_NAME = { betreuung: 'Betreuung', frist: 'Frist', labor: 'Labor', sonstiges: 'Sonstiges' };
  const QSTATUS_WORT = { genommen: 'Genommen', spaeter: 'Zurückgestellt', verworfen: 'Verworfen', vorschlag: 'Zurück bei den Vorschlägen' };

  // ---------- UI-Zustand (pro Browser gemerkt, nie wichtig) ----------
  const UI_SCHLUESSEL = 'sw-dashboard-ui';
  const ui = Object.assign({
    reiter: 'uebersicht', filter: 'vorschlag', suche: '', sortierung: 'relevanz',
    offen: [], bausteine: [], command: '', text: '', phaseInfo: null, alleBausteine: false, abzAlle: false,
  }, (() => { try { return JSON.parse(localStorage.getItem(UI_SCHLUESSEL) || '{}'); } catch { return {}; } })());
  if (!Array.isArray(ui.offen)) ui.offen = [];
  if (!Array.isArray(ui.bausteine)) ui.bausteine = [];
  if (!REITER.some((r) => r.id === ui.reiter)) ui.reiter = 'uebersicht';
  const merke = () => { try { localStorage.setItem(UI_SCHLUESSEL, JSON.stringify(ui)); } catch {} };

  let sperreBis = 0;
  let checkErgebnis = null;
  let offline = false;
  let verbunden = false;
  let hervorheben = null;

  // ---------- Hilfen ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const zahlWert = (x) => { const v = Number(x); return Number.isFinite(v) ? v : 0; };
  const zahl = (x) => (x == null || x === '' || !Number.isFinite(Number(x)) ? '–' : Number(x).toLocaleString('de-DE'));
  const note = (x) => (Number.isFinite(Number(x)) && x !== null && x !== '' ? Number(x).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '');
  const zwei = (n) => String(n).padStart(2, '0');
  const isoTag = (d) => `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
  const parseTag = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const datumDe = (s) => { const d = parseTag(s); return d ? `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.${d.getFullYear()}` : String(s || ''); };
  const datumKurz = (s) => { const d = parseTag(s); return d ? `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.` : ''; };
  const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const WT_ID = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];
  const reduziert = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const warte = (ms) => new Promise((r) => setTimeout(r, reduziert() ? 0 : ms));
  const esc = (s) => (window.CSS && CSS.escape ? CSS.escape(String(s)) : String(s).replace(/["\\]/g, '\\$&'));

  // Datenwerte bleiben ASCII, die Anzeige nicht.
  const UMLAUTE = [['ueber', 'über'], ['fuer', 'für'], ['pruef', 'prüf'], ['spaet', 'spät'], ['aender', 'änder'], ['zurueck', 'zurück'],
    ['waehl', 'wähl'], ['haeufig', 'häufig'], ['erklaer', 'erklär'], ['fuehr', 'führ'], ['schluessel', 'schlüssel'], ['loes', 'lös'],
    ['moeglich', 'möglich'], ['koenn', 'könn'], ['abschliess', 'abschließ'], ['groess', 'größ'], ['gruend', 'gründ'], ['saetz', 'sätz'],
    ['waehr', 'währ'], ['taeglich', 'täglich'], ['naechst', 'nächst'], ['qualitaet', 'qualität'], ['woert', 'wört'], ['hoer', 'hör'],
    ['buech', 'büch'], ['vorlaeuf', 'vorläuf'], ['stae', 'stä']];
  const UMLAUT_RE = new RegExp(UMLAUTE.map(([a]) => a).join('|'), 'gi');
  function anzeige(s) {
    return String(s ?? '')
      .replace(/\bexpose\b/gi, (w) => (w[0] === 'E' ? 'Exposé' : 'exposé'))
      .replace(UMLAUT_RE, (w) => {
        const ziel = UMLAUTE.find(([a]) => a === w.toLowerCase())[1];
        return w[0] === w[0].toUpperCase() ? ziel[0].toUpperCase() + ziel.slice(1) : ziel;
      });
  }
  const anzeigeName = (slug) => { const t = anzeige(String(slug || '').replace(/\.md$/i, '').replace(/[-_]+/g, ' ').trim()); return t.charAt(0).toUpperCase() + t.slice(1); };

  function relTage(t) {
    if (t == null) return '';
    if (t === 0) return 'heute';
    if (t === 1) return 'morgen';
    if (t === -1) return 'gestern';
    return t > 0 ? `in ${t} Tagen` : `vor ${-t} Tagen`;
  }
  function wann(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    const zeit = `${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
    return isoTag(d) === isoTag(new Date()) ? `heute ${zeit}` : `${datumKurz(isoTag(d))} ${zeit}`;
  }
  function relZeit(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    const s = (Date.now() - d.getTime()) / 1000;
    if (s < 50) return 'gerade eben';
    if (s < 3600) return `vor ${Math.max(1, Math.round(s / 60))} Min.`;
    if (s < 6 * 3600) return `vor ${Math.round(s / 3600)} Std.`;
    return wann(iso);
  }
  function autorKurz(q) {
    const a = Array.isArray(q.autoren) ? q.autoren : [];
    if (!a.length) return '';
    const nach = (x) => String(x).split(',')[0].trim();
    return a.length === 1 ? nach(a[0]) : a.length === 2 ? `${nach(a[0])}, ${nach(a[1])}` : `${nach(a[0])} et al.`;
  }
  function sichereUrl(u) {
    try { const x = new URL(String(u || '')); return x.protocol === 'http:' || x.protocol === 'https:' ? x.href : ''; } catch { return ''; }
  }
  function vscodeLink(rel, zeile) {
    const root = String(S.root || '').replace(/\\/g, '/').replace(/\/+$/, '').replace(/^\/+/, '');
    const pfad = String(rel || '').replace(/\\/g, '/').replace(/^\/+/, '');
    return 'vscode://file/' + encodeURI(`${root}/${pfad}`).replace(/#/g, '%23').replace(/\?/g, '%3F') + (zeile ? ':' + zahlWert(zeile) : '');
  }
  const kapSlug = (nr) => String(nr).replace(/\./g, '-');
  const dateiName = (rel) => String(rel || '').split('/').pop();

  const ICONS = {
    senden: '<path d="M4 12l16-8-6 16-3-7-7-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    claude: '<path d="M5 7l5 5-5 5M12.5 17H19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
    kopieren: '<rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    klammer: '<path d="M20 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    haken: '<path class="strich" d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    stern: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="currentColor"/>',
    x: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    oeffnen: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    stift: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    lupe: '<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    muell: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    buch: '<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z M12 6v13.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    code: '<path d="M9 7l-5 5 5 5M15 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    zurueck: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    minus: '<path d="M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    breite: '<path d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    neu: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    zitat: '<path d="M6 17c-1-1-1.5-2.3-1.5-4 0-3 2-5.5 5-6.5l.5 1.3C8.4 8.6 7.5 10 7.5 11h2.5v6zm8 0c-1-1-1.5-2.3-1.5-4 0-3 2-5.5 5-6.5l.5 1.3c-1.6.8-2.5 2.2-2.5 3.2H18v6z" fill="currentColor"/>',
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;

  // ---------- Hinweise unten (gestapelt, mit Rückgängig) ----------
  const toasts = [];
  let toastNr = 0;
  function toast(text, rueckgaengig, dauer) {
    const box = $('#toast'); if (!box) return;
    const t = { id: ++toastNr, zurueck: typeof rueckgaengig === 'function' ? rueckgaengig : null };
    const d = dauer || (t.zurueck ? 8000 : 4500);
    const el = document.createElement('div');
    el.className = 'toast' + (t.zurueck ? ' mit-zurueck' : '');
    el.style.setProperty('--dauer', d + 'ms');
    el.innerHTML = `<span class="toast-text">${h(text)}</span>`
      + (t.zurueck ? `<button type="button" class="toast-knopf" data-a="toast-zurueck" data-t="${t.id}" title="Rückgängig (Taste Z)">Rückgängig</button>` : '')
      + `<button type="button" class="toast-zu" data-a="toast-zu" data-t="${t.id}" aria-label="Hinweis schließen">${icon('x')}</button>`
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
    setTimeout(() => t.el.remove(), reduziert() ? 0 : 180);
  }
  function macheRueckgaengig(id) {
    const t = id ? toasts.find((x) => x.id === id) : [...toasts].reverse().find((x) => x.zurueck);
    if (!t || !t.zurueck) return false;
    const f = t.zurueck; t.zurueck = null; entferneToast(t.id);
    Promise.resolve().then(f).catch((e) => toast(e.message));
    return true;
  }

  // ---------- Netz ----------
  const NICHT_ERREICHBAR = 'Dashboard-Server nicht erreichbar. Läuft er noch? In Claude /dashboard eingeben.';
  function setzeOffline(an) {
    if (offline === an) return;
    offline = an;
    document.body.classList.toggle('offline', an);
    sperreSchreibknoepfe();
    zeichneLive();
  }
  function sperreSchreibknoepfe(wurzel = document) {
    $$('.schreibt', wurzel).forEach((b) => { if ('disabled' in b) b.disabled = offline || !LIVE; });
  }
  async function anfrage(methode, pfad, daten) {
    let r;
    try {
      r = await fetch(pfad, methode === 'GET' ? { cache: 'no-store' }
        : { method: methode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(daten ?? {}) });
    } catch {
      setzeOffline(true);
      const e = new Error(NICHT_ERREICHBAR); e.code = 'offline'; throw e;
    }
    setzeOffline(false);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(j.fehler || `Der Server meldet Fehler ${r.status}.`);
      e.code = j.code || ''; e.status = r.status; throw e;
    }
    return j;
  }
  const post = (pfad, daten) => anfrage('POST', pfad, daten);
  const put = (pfad, daten) => anfrage('PUT', pfad, daten);
  const holeJson = (pfad) => anfrage('GET', pfad);

  async function kopiereText(text) {
    try {
      // Manche Browser lassen writeText ohne Rückmeldung hängen: nach 800 ms auf den alten Weg ausweichen
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

  // ---------- Bausteine und Auftrag ----------
  function bKapitel(k) {
    return { key: 'kapitel:' + k.nr, art: 'Kapitel', label: `${k.nr} ${k.titel || ''}`.trim(),
      prompt: `Kapitel ${k.nr}${k.titel ? ` „${k.titel}“` : ''} ([${dateiName(k.datei)}](${k.datei}))` };
  }
  function bQuelle(q) {
    const wer = [autorKurz(q), q.jahr].filter(Boolean).join(', ');
    return { key: 'quelle:' + q.id, art: 'Quelle', label: q.titel || q.id,
      prompt: `Quelle ${q.bibkey || q.doi || q.id}: „${q.titel || ''}“${wer ? ` (${wer})` : ''}${q.doi ? `, DOI ${q.doi}` : ''}` };
  }
  function bTermin(t) {
    return { key: 'termin:' + t.id, art: 'Termin', label: `${datumDe(t.datum)} ${t.titel}`,
      prompt: `Termin ${t.datum}${t.zeit ? ' ' + t.zeit : ''}: ${t.titel} (${ART_NAME[t.art] || t.art})${t.notiz ? `, Notiz: ${t.notiz}` : ''}` };
  }
  function bDatei(pfad) {
    return { key: 'datei:' + pfad, art: 'Datei', label: pfad, prompt: `Datei [${dateiName(pfad)}](${pfad})` };
  }
  function bAbsatz(datei, a, zeile) {
    const anfang = String(a.text || '').replace(/\s+/g, ' ').replace(/^#+\s*/, '').slice(0, 60);
    const nr = zahlWert(a.i) + 1;
    return { key: `absatz:${datei}:${a.i}`, art: 'Absatz', label: `${dateiName(datei)}, Absatz ${nr}`,
      prompt: `Absatz ${nr} in [${dateiName(datei)}](${datei}), Zeile ${zeile}, beginnt mit „${anfang}${a.text && a.text.length > 60 ? ' …' : ''}“` };
  }
  function bPdfStelle(quelle, seite, text) {
    const kurz = String(text).replace(/\s+/g, ' ').slice(0, 300);
    const wo = quelle ? `${quelle.bibkey || quelle.id}` : 'Arbeit.pdf';
    return { key: `pdf:${wo}:${seite}:${kurz.slice(0, 20)}`, art: 'PDF-Stelle', label: `${wo}, S. ${seite}`,
      prompt: `${quelle ? `Quelle ${wo}` : 'Arbeit.pdf'}, Seite ${seite}: „${kurz}${text.length > 300 ? ' …' : ''}“` };
  }
  const gewaehlt = (key) => ui.bausteine.findIndex((b) => b.key === key);
  function schalteBaustein(b) {
    const i = gewaehlt(b.key);
    if (i >= 0) ui.bausteine.splice(i, 1); else ui.bausteine.push(b);
    merke(); zeichneBausteine(); markiereKreise();
  }
  function bausteinDazu(b, text) {
    if (gewaehlt(b.key) < 0) ui.bausteine.push(b);
    if (text && !String(ui.text || '').trim()) ui.text = text;
    merke(); zeichneKonfig(); oeffneKonfig(true);
  }
  function waehlKnopf(b) {
    const i = gewaehlt(b.key);
    return `<button type="button" class="waehl${i >= 0 ? ' an' : ''}" data-a="waehl" data-b="${h(JSON.stringify(b))}"
      aria-pressed="${i >= 0}" title="In den Auftrag an Claude übernehmen" aria-label="In den Auftrag übernehmen: ${h(b.label)}">${i >= 0 ? i + 1 : ''}</button>`;
  }
  function markiereKreise() {
    $$('.waehl').forEach((el) => {
      let b; try { b = JSON.parse(el.dataset.b); } catch { return; }
      const i = gewaehlt(b.key);
      el.classList.toggle('an', i >= 0);
      el.setAttribute('aria-pressed', String(i >= 0));
      el.textContent = i >= 0 ? String(i + 1) : '';
    });
    zeichneKonfigZeile();
  }

  function baueAuftrag() {
    let t = ((ui.command ? ui.command + ' ' : '') + (ui.text || '').trim()).trim();
    if (ui.bausteine.length) t += (t ? '\n\n' : '') + 'Bezug:\n' + ui.bausteine.map((b, i) => `${i + 1}. ${b.prompt}`).join('\n');
    return t;
  }

  function oeffneClaude(prompt) {
    const a = document.createElement('a');
    a.href = 'vscode://anthropic.claude-code/open?prompt=' + encodeURIComponent(prompt);
    a.rel = 'noopener'; a.className = 'unsichtbar';
    document.body.appendChild(a); a.click(); a.remove();
  }

  async function senden() {
    const prompt = baueAuftrag();
    if (!prompt) { oeffneKonfig(true); toast('Schreib einen Auftrag oder wähle eine Aktion.'); return; }
    if (prompt.length > 2000) {
      const ok = await kopiereText(prompt);
      toast(ok ? 'Der Auftrag ist lang und liegt deshalb in der Zwischenablage. In Claude einfügen und Enter drücken.'
        : 'Kopieren nicht möglich. Markiere den Auftrag und kopiere ihn selbst.', null, 7000);
      return;
    }
    let reagiert = false;
    const gesehen = () => { reagiert = true; };
    window.addEventListener('blur', gesehen, { once: true });
    document.addEventListener('visibilitychange', gesehen, { once: true });
    oeffneClaude(prompt);
    toast('Claude-Tab wird geöffnet …');
    setTimeout(async () => {
      window.removeEventListener('blur', gesehen);
      document.removeEventListener('visibilitychange', gesehen);
      if (reagiert) return;
      const ok = await kopiereText(prompt);
      toast(ok ? 'Öffnet sich nichts? Der Auftrag liegt auch in der Zwischenablage. In Claude einfügen.'
        : 'Öffnet sich nichts? Kopiere den Auftrag mit dem Kopier-Symbol.', null, 7000);
    }, 1500);
  }

  async function kopieren() {
    const prompt = baueAuftrag();
    if (!prompt) { toast('Noch nichts zu kopieren.'); return; }
    toast(await kopiereText(prompt) ? 'Auftrag kopiert. In Claude einfügen und Enter drücken.' : 'Kopieren nicht möglich.');
  }

  function auftrag(cmd, text = '', sofort = false) {
    ui.command = cmd || '';
    ui.text = text || '';
    merke(); zeichneKonfig();
    if (sofort) { senden(); return; }
    oeffneKonfig(true);
  }

  function skills() {
    const vonServer = Array.isArray(S.skills) && S.skills.length ? S.skills : null;
    const basis = vonServer || COMMANDS.map((c) => ({ name: c.cmd.slice(1), beschreibung: c.kurz, gruppe: c.gruppe, slash: true, auto: false, eigen: false }));
    return basis.map((s) => {
      const c = COMMANDS.find((x) => x.cmd === '/' + s.name);
      const gruppe = GRUPPEN.some(([g]) => g === s.gruppe) ? s.gruppe : 'eigene';
      return { ...s, gruppe, kurz: s.beschreibung || c?.kurz || '', lang: c?.lang || '', bsp: c?.bsp || '' };
    });
  }

  // ---------- Kopf, Reiter, Konfigurator ----------
  function zeichneKopf() {
    const ab = S.abgabe || {};
    const abText = ab.tage == null ? '' : ab.tage < 0 ? `<span class="rot">Abgabe vor ${-ab.tage} Tagen</span>` : `Abgabe ${relTage(ab.tage)}`;
    $('#kopf').innerHTML = `
      <span class="logo">scientific writing</span>
      <h1>${h(S.titel || (S.eingerichtet ? 'Titel noch offen' : 'Deine wissenschaftliche Arbeit'))}</h1>
      <span class="meta">
        ${S.phaseName ? `<span class="phase">${h(S.phaseName)}${S.phaseIndex != null ? ` ${zahlWert(S.phaseIndex) + 1}/8` : ''}</span>` : ''}
        ${abText ? `<span class="abgabe">${abText}</span>` : ''}
        <button type="button" class="suche-knopf" data-a="palette" title="Suchen und springen (Strg+K)" aria-label="Suchen und springen (Strg+K)">${icon('lupe')}<kbd>${/Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘K' : 'Strg K'}</kbd></button>
        <span class="verbindung" id="live"></span>
      </span>
      ${LIVE ? '' : `<div class="statisch-banner">Statische Kopie vom ${h(wann(S.erzeugt))}. Die Live-Ansicht mit allen Knöpfen: in Claude <span class="mono">/dashboard</span> eingeben oder <a href="${h(sichereUrl(MODUS.url))}">${h(MODUS.url)}</a> öffnen.</div>`}`;
    zeichneLive();
  }
  function zeichneLive() {
    const el = $('#live'); if (!el) return;
    const zustand = !LIVE ? 'kopie' : offline ? 'offline' : verbunden ? 'live' : 'verbinde';
    const text = { kopie: 'Kopie', offline: 'offline', live: 'live', verbinde: 'verbinde …' }[zustand];
    const tip = { kopie: 'Statische Kopie', offline: 'Keine Verbindung zum Dashboard-Server', live: 'Live: aktualisiert sich selbst', verbinde: 'Verbindung wird aufgebaut' }[zustand];
    el.className = 'verbindung ' + zustand;
    el.title = tip;
    el.innerHTML = `<span class="livepunkt"></span><span class="live-text">${text}</span>`;
  }
  function pulsiere() {
    const p = $('#live .livepunkt'); if (!p) return;
    p.classList.remove('puls'); void p.offsetWidth; p.classList.add('puls');
  }

  function zeichneReiter() {
    const nav = $('#reiter');
    nav.setAttribute('role', 'tablist');
    nav.innerHTML = REITER.map((r) => {
      const an = ui.reiter === r.id;
      return `<button type="button" role="tab" id="tab-${r.id}" aria-controls="inhalt" aria-selected="${an}" tabindex="${an ? 0 : -1}" data-a="reiter" data-v="${r.id}">${r.name}</button>`;
    }).join('');
    const main = $('#inhalt');
    main.setAttribute('role', 'tabpanel');
    main.setAttribute('aria-labelledby', 'tab-' + ui.reiter);
  }
  function waehleReiter(id, fokus) {
    if (!REITER.some((r) => r.id === id)) return;
    ui.reiter = id; merke(); zeichneReiter(); zeichneInhalt({ oben: true });
    window.scrollTo(0, 0);
    if (fokus) $('#tab-' + id)?.focus();
  }

  function zeichneKonfig() {
    const box = $('#konfig');
    box.innerHTML = `
      <button type="button" class="konfig-zeile" data-a="konfig-auf" aria-label="Auftrag an Claude bearbeiten"></button>
      <div class="konfig-box">
        <ol class="bausteine" id="bausteine" aria-label="Bezüge"></ol>
        <div class="eingabe-zeile">
          ${ui.command ? `<span class="cmd-chip">${h(ui.command)}<button type="button" data-a="cmd-weg" aria-label="Aktion ${h(ui.command)} entfernen">${icon('x')}</button></span>` : ''}
          <textarea id="prompt" rows="1" placeholder="${ui.command ? 'Optional: was genau? Strg+Enter sendet' : 'Was soll Claude tun? Zum Beispiel: Hilf mir, meine Forschungsfrage zu schärfen.'}" aria-label="Auftrag an Claude">${h(ui.text)}</textarea>
        </div>
        <div class="werkzeuge">
          <span class="menue-anker">
            <button type="button" class="knopf still" data-a="menue" aria-haspopup="menu" aria-expanded="false"><span class="mono">/</span> Aktion</button>
          </span>
          <button type="button" class="knopf still schreibt" data-a="upload" title="Dateien in den Eingang laden (quellen/eingang)">${icon('klammer')} Datei</button>
          <input type="file" id="datei-wahl" multiple hidden>
          <span class="luecke"></span>
          <span class="tasten">Strg+Enter</span>
          <button type="button" class="icon" data-a="kopieren" title="Auftrag kopieren" aria-label="Auftrag kopieren">${icon('kopieren')}</button>
          <button type="button" class="icon haupt" data-a="senden" title="An Claude: öffnet Claude in VS Code mit diesem Auftrag" aria-label="An Claude senden">${icon('senden')}</button>
        </div>
      </div>`;
    zeichneBausteine();
    const p = $('#prompt');
    const hoehe = () => { p.style.height = 'auto'; p.style.height = Math.min(168, p.scrollHeight) + 'px'; };
    p.addEventListener('input', () => { ui.text = p.value; merke(); hoehe(); });
    p.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); senden(); } });
    hoehe();
    sperreSchreibknoepfe(box);
  }
  function zeichneKonfigZeile() {
    const z = $('.konfig-zeile'); if (!z) return;
    const n = ui.bausteine.length;
    const text = String(ui.text || '').replace(/\s+/g, ' ').trim();
    z.innerHTML = `<span class="prompt-zeichen" aria-hidden="true">&gt;</span>
      <span class="konfig-vorschau${ui.command || text ? '' : ' blass'}">${ui.command ? `<span class="mono akzent">${h(ui.command)}</span> ` : ''}${text ? h(text) : ui.command ? '' : 'Was soll Claude tun?'}</span>
      ${n ? `<span class="mono blass">${n} ${n === 1 ? 'Bezug' : 'Bezüge'}</span>` : ''}`;
  }
  function zeichneBausteine() {
    const ol = $('#bausteine'); if (!ol) return;
    const n = ui.bausteine.length;
    ol.classList.toggle('hat', n > 0);
    const zeigen = n > 3 && !ui.alleBausteine ? ui.bausteine.slice(0, 3) : ui.bausteine;
    ol.innerHTML = zeigen.map((b, i) => `<li><span class="nr">${i + 1}</span><span class="art">${h(b.art)}</span>
      <span class="lbl" title="${h(b.prompt)}">${h(b.label)}</span>
      <button type="button" class="weg" data-a="baustein-weg" data-i="${i}" aria-label="Bezug entfernen: ${h(b.label)}">${icon('x')}</button></li>`).join('')
      + (n > 3 ? `<li><button type="button" class="mehr" data-a="bausteine-mehr">${ui.alleBausteine ? 'weniger zeigen' : `und ${n - 3} weitere`}</button></li>` : '');
    zeichneKonfigZeile();
  }

  // ---------- Menüs (Aktion, Kapitelstatus) mit Tastatur ----------
  function zeigeMenue(knopf, html, label) {
    schliesseMenue(false);
    const m = document.createElement('div');
    m.className = 'menue'; m.setAttribute('role', 'menu'); m.setAttribute('aria-label', label || 'Menü');
    m.innerHTML = html;
    knopf.parentElement.appendChild(m);
    knopf.setAttribute('aria-expanded', 'true');
    zeigeMenue.knopf = knopf;
    const r = m.getBoundingClientRect();
    if (r.right > window.innerWidth - 8) m.classList.add('rechtsbuendig');
    m.querySelector('[role^="menuitem"]')?.focus();
  }
  function schliesseMenue(fokusZurueck) {
    const offen = $('.menue');
    $$('.menue').forEach((m) => m.remove());
    $$('[aria-haspopup="menu"]').forEach((k) => k.setAttribute('aria-expanded', 'false'));
    if (offen && fokusZurueck && zeigeMenue.knopf && document.contains(zeigeMenue.knopf)) zeigeMenue.knopf.focus();
  }
  function aktionsMenueHtml() {
    const alle = skills();
    return GRUPPEN.map(([g, name]) => {
      const liste = alle.filter((s) => s.gruppe === g);
      if (!liste.length) return '';
      return `<div class="menue-gruppe" role="presentation">${name}</div>` + liste.map((s) => `<button type="button" role="menuitem" data-a="cmd-waehlen" data-v="/${h(s.name)}">
        <span class="cmd">/${h(s.name)}</span><span class="erkl">${h(anzeige(s.kurz))}</span></button>`).join('');
    }).join('');
  }

  // ---------- Übersicht ----------
  function pfadHtml() {
    return `<div class="pfad" role="list">${(S.phasen || []).map((ph, i) => `
      <button type="button" class="station ${h(ph.status)}" role="listitem" data-a="phase" data-v="${h(ph.id)}" aria-label="${h(ph.name)}: ${h(ph.status)}">
        <span class="punkt">${ph.status === 'erledigt' ? icon('haken') : i + 1}</span>
        <span class="name">${h(ph.name)}</span>
        <span class="datum">${ph.status === 'erledigt' && ph.datum ? datumKurz(ph.datum) : ph.status === 'aktiv' ? 'jetzt' : ''}</span>
      </button>`).join('')}</div>`;
  }

  function aktivKlasse(e) {
    if (!e) return '';
    const ziel = S.tagesziel?.woerter;
    const w = zahlWert(e.woerter);
    if (w > 0 && ziel) { const r = w / ziel; return r >= 1 ? 'a3' : r >= 0.5 ? 'a2' : 'a1'; }
    if (w > 600) return 'a3';
    if (w > 200) return 'a2';
    return (w || e.quellen || e.sessions || e.aenderungen) ? 'a1' : '';
  }
  const balken = (anteil, extra = '') => `<div class="balken${extra}"><i data-p="${Math.max(0, Math.min(1, zahlWert(anteil))).toFixed(3)}"></i></div>`;

  function zahlenHtml() {
    const ab = S.abgabe || {}; const tz = S.tagesziel || {}; const w = S.woerter || {};
    const abgabe = ab.tage == null
      ? '<div class="zahl">offen</div><div class="zahl-sub">Datum mit /start festlegen</div>'
      : `<div class="zahl ${ab.tage < 0 ? 'rot' : ''}">${ab.tage < 0 ? 'vorbei' : zahl(ab.tage)} <small>${ab.tage < 0 ? '' : ab.tage === 1 ? 'Tag' : 'Tage'}</small></div><div class="zahl-sub">bis ${h(datumDe(ab.datum))}</div>`;
    const heute = tz.woerter
      ? `<div class="zahl">${zahl(tz.heute)} <small>/ ${zahl(tz.woerter)}</small></div>
         ${balken(zahlWert(tz.heute) / zahlWert(tz.woerter))}
         <div class="zahl-sub">${tz.erreicht ? '<span class="ok">Tagesziel erreicht</span>' : `noch ${zahl(Math.max(0, zahlWert(tz.woerter) - zahlWert(tz.heute)))} Wörter`}</div>`
      : `<div class="zahl">${zahl(tz.heute || 0)} <small>Wörter</small></div><div class="zahl-sub">Tagesziel entsteht mit Abgabedatum und Gliederung</div>`;
    const heuteIso = isoTag(new Date());
    const tage = (S.letzte14 || []).map((t) => {
      const d = parseTag(t.tag); const a = aktivKlasse(t);
      const kl = ['tg', t.arbeitstag ? '' : 'frei', a, t.tag === heuteIso ? 'heute' : ''].filter(Boolean).join(' ');
      const tip = `${d ? WT[d.getDay()] + ' ' : ''}${datumDe(t.tag)}: ${a ? `${zahl(t.woerter)} Wörter, ${zahl(t.quellen)} Quellen` : t.arbeitstag ? 'nicht gearbeitet' : 'frei'}`;
      return `<span class="${kl}" title="${h(tip)}"><i></i><b>${d ? WT[d.getDay()].charAt(0) : ''}</b></span>`;
    }).join('');
    const serie = `<div class="zahl">${zahl(S.serie || 0)} <small>${S.serie === 1 ? 'Arbeitstag' : 'Arbeitstage'} am Stück</small></div>
      <div class="tage14" role="img" aria-label="Letzte 14 Tage, farbig heißt gearbeitet">${tage}</div>`;
    const gesamt = `<div class="zahl">${zahl(w.gesamt || 0)} <small>${w.ziel ? '/ ' + zahl(w.ziel) : ''} Wörter</small></div>
      ${w.ziel ? balken(zahlWert(w.prozent) / 100) : ''}
      <div class="zahl-sub">etwa ${zahl(w.seiten_geschaetzt || 0)} Seiten${w.ziel ? ` · ${zahl(w.prozent || 0)} %` : ''}</div>`;
    return `<div class="zahlen">
      <div><div class="zahl-lbl">Abgabe</div>${abgabe}</div>
      <div><div class="zahl-lbl">Heute</div>${heute}</div>
      <div><div class="zahl-lbl">Serie</div>${serie}</div>
      <div><div class="zahl-lbl">Gesamt</div>${gesamt}</div>
    </div>`;
  }

  function abzeichenHtml(alle) {
    const liste = S.abzeichen || [];
    const erreicht = liste.filter((a) => a.erreicht).sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
    const offen = liste.filter((a) => !a.erreicht);
    const zeige = alle ? [...erreicht, ...offen] : [...erreicht.slice(0, 6), ...offen.slice(0, erreicht.length ? 2 : 4)];
    if (!zeige.length) return '<p class="leer">Noch keine Abzeichen.</p>';
    return `<ul class="abzeichen">${zeige.map((a) => `<li class="${a.erreicht ? '' : 'offen'}" title="${h(a.beschreibung)}${a.datum ? ' · ' + h(datumDe(a.datum)) : ''}">
      <span class="glyph" aria-hidden="true">${a.erreicht ? '◆' : '◇'}</span>${h(a.name)}${a.erreicht && a.datum ? ` <span class="mono blass">${h(datumKurz(a.datum))}</span>` : ''}</li>`).join('')}</ul>`;
  }

  function findeKapitelZuDatei(datei) { return (S.kapitel || []).find((k) => k.datei === datei); }
  function textHash(datei, absatz) {
    const k = findeKapitelZuDatei(datei);
    const basis = k ? `#kapitel/${kapSlug(k.nr)}` : `#text/${encodeURIComponent(datei)}`;
    return basis + (absatz != null ? `/a${zahlWert(absatz)}` : '');
  }

  function aenderungenHtml() {
    const liste = (Array.isArray(S.aenderungen) ? S.aenderungen : []).slice(0, 8);
    if (!liste.length) {
      return LIVE ? '<p class="leer karte-leer">Noch keine Änderungen erkannt. Sobald Claude oder du einen Text unter arbeit/ speichert, steht er hier.</p>' : '';
    }
    return `<ul class="liste">${liste.map((a, idx) => {
      const abs = (Array.isArray(a.absaetze) ? a.absaetze : []).map(zahlWert);
      const absText = abs.length ? `Absatz ${abs.slice(0, 4).map((i) => i + 1).join(', ')}${abs.length > 4 ? ' …' : ''}` : 'Datei geändert';
      const d = zahlWert(a.woerter_delta);
      const delta = d === 0 ? '±0' : d > 0 ? `+${zahl(d)}` : `−${zahl(-d)}`;
      const ziel = LIVE ? textHash(a.datei, abs[0]) : vscodeLink(a.datei);
      return `<li data-zeile="ae:${idx}"><div class="zi"><div class="zeile">
        <a class="haupt" href="${h(ziel)}">
          <span class="titel">${h(a.titel || dateiName(a.datei))}</span>
          <span class="unter"><span class="mono">${h(dateiName(a.datei))}</span> · ${h(absText)}</span>
        </a>
        <span class="spalte-zahl mono" title="Wörter">${h(delta)}</span>
        <span class="spalte-zeit mono blass" data-zeit="${h(a.zeit)}">${h(relZeit(a.zeit))}</span>
        <a class="icon" href="${h(vscodeLink(a.datei))}" title="In VS Code öffnen" aria-label="${h(dateiName(a.datei))} in VS Code öffnen">${icon('code')}</a>
      </div></div></li>`;
    }).join('')}</ul>`;
  }

  function uebersicht() {
    const teile = [];
    if (!S.eingerichtet) {
      teile.push(`<section class="abschnitt" data-abschnitt="willkommen"><div class="karte willkommen">
        <h2>Willkommen. Hier entsteht deine Arbeit.</h2>
        <p>Dieses Dashboard zeigt dir jederzeit, wo du stehst: Phase, Fristen, Quellen und Kapitel. Claude arbeitet im Hintergrund mit dir, stellt dir Fragen und hält alles aktuell.</p>
        <ol>
          <li>Klick auf <strong>Einrichtung starten</strong>. In VS Code öffnet sich Claude mit dem Befehl <span class="mono">/start</span>.</li>
          <li>Drück dort Enter und beantworte die Fragen. Das dauert etwa zehn Minuten.</li>
          <li>Danach führt dich <span class="mono">/weiter</span> Schritt für Schritt durch die Arbeit.</li>
        </ol>
        <div class="reihe">
          <button type="button" class="knopf haupt" data-a="auftrag" data-cmd="/start" data-sofort="1">${icon('senden')} Einrichtung starten</button>
          <button type="button" class="knopf" data-a="reiter" data-v="hilfe">Wie funktioniert das?</button>
        </div>
      </div></section>`);
    }
    if (S.sync?.erinnern && S.eingerichtet) {
      teile.push(`<div class="hinweis" data-abschnitt="sync"><span class="text">${S.sync.tage == null ? 'Deine Arbeit ist noch nie auf GitHub gesichert worden.' : `Letzte Sicherung auf GitHub vor ${zahl(S.sync.tage)} Tagen.`} Geht dein Laptop kaputt, ist alles seitdem weg.</span>
        <button type="button" class="icon" data-a="auftrag" data-cmd="/sync" data-sofort="1" title="Jetzt sichern: /sync an Claude" aria-label="Jetzt sichern: /sync an Claude">${icon('senden')}</button></div>`);
    }
    const ph = ui.phaseInfo ? (S.phasen || []).find((x) => x.id === ui.phaseInfo) : null;
    teile.push(`<section class="abschnitt" data-abschnitt="weg"><h2>Dein Weg</h2><div class="karte">${pfadHtml()}
      ${ph ? `<div class="pfad-erkl"><strong>${h(ph.name)}</strong> · ${h(ph.status)}${ph.datum ? ' seit ' + h(datumDe(ph.datum)) : ''}<br>${h(ph.beschreibung)} Passender Befehl: <span class="mono">${h(ph.command)}</span></div>` : ''}
    </div></section>`);
    if (S.eingerichtet) {
      teile.push(`<section class="abschnitt" data-abschnitt="naechster"><div class="karte naechster">
        <div class="text"><div class="lbl">Nächster Schritt</div><div class="satz">${h(S.naechster_schritt)}</div></div>
        <button type="button" class="icon" data-a="auftrag" data-cmd="${h(S.naechster_command)}" title="In den Auftrag übernehmen" aria-label="Nächsten Schritt in den Auftrag übernehmen">${icon('claude')}</button>
        <button type="button" class="icon haupt" data-a="auftrag" data-cmd="${h(S.naechster_command)}" data-sofort="1" title="Loslegen: sofort an Claude" aria-label="Loslegen: sofort an Claude senden">${icon('senden')}</button>
      </div></section>`);
      teile.push(`<section class="abschnitt" data-abschnitt="zahlen">${zahlenHtml()}</section>`);
    }
    const links = [];
    const rechts = [];
    const aend = aenderungenHtml();
    if (aend) links.push(`<section class="abschnitt" data-abschnitt="aenderungen"><h2>Zuletzt geändert</h2>${aend}</section>`);
    const bald = (S.termine || []).filter((t) => !t.erledigt && t.tage != null && t.tage <= 14);
    if (bald.length || S.abgabe?.tage != null) {
      links.push(`<section class="abschnitt" data-abschnitt="demnaechst"><h2>Demnächst <a class="kopf-link" href="#" data-a="reiter" data-v="plan">Plan</a></h2>
        <ul class="liste">${bald.map((t) => terminZeile(t, false)).join('') || '<li class="leer">In den nächsten zwei Wochen steht nichts an.</li>'}</ul></section>`);
    }
    const verlauf = (S.verlauf || []).filter((v) => !/abzeichen/i.test(String(v.was || ''))).slice(0, 8);
    if (verlauf.length) {
      rechts.push(`<section class="abschnitt" data-abschnitt="verlauf"><h2>Verlauf</h2><ul class="verlauf">${verlauf.map((v) => `<li><span class="wann">${h(wann(v.datum))}</span><span>${h(anzeige(v.was))}</span></li>`).join('')}</ul></section>`);
    }
    if ((S.abzeichen || []).length) {
      rechts.push(`<section class="abschnitt" data-abschnitt="abzeichen"><h2>Abzeichen <button type="button" class="kopf-link" data-a="abz-alle" aria-expanded="${!!ui.abzAlle}">${ui.abzAlle ? 'weniger' : 'alle'}</button></h2>${abzeichenHtml(ui.abzAlle)}</section>`);
    }
    teile.push(rechts.length ? `<div class="zwei gleich"><div>${links.join('')}</div><div>${rechts.join('')}</div></div>` : links.join(''));
    return teile.join('');
  }

  // ---------- Quellen ----------
  function bewertungHtml(q) {
    const stern = Math.max(0, Math.min(3, zahlWert(q.stern)));
    const rel = Math.max(0, Math.min(5, zahlWert(q.relevanz)));
    if (stern) return `<span class="bewertung eigen" title="Deine Bewertung: ${stern} von 3">${'★'.repeat(stern)}<span class="aus">${'★'.repeat(3 - stern)}</span></span>`;
    if (rel) return `<span class="bewertung" title="Relevanz laut Claude: ${rel} von 5">${'●'.repeat(rel)}<span class="aus">${'●'.repeat(5 - rel)}</span></span>`;
    return '<span class="bewertung"></span>';
  }

  function quelleStatusText(q) {
    const teile = [];
    if (q.status === 'genommen') {
      teile.push(q.pdf_vorhanden ? 'PDF' : '<span class="blass">kein PDF</span>');
      teile.push(zahlWert(q.zitate) ? `${zahl(q.zitate)} Zitate` : '<span class="blass">nicht ausgewertet</span>');
    } else if (q.status === 'spaeter') teile.push('später');
    else if (q.status === 'verworfen') teile.push('verworfen');
    return teile.join(' · ');
  }
  const quelleHash = (q, seite) => `#quelle/${encodeURIComponent(q.id)}${seite ? '/s' + zahlWert(seite) : ''}`;

  function quelleZeile(q) {
    const offen = ui.offen.includes('q:' + q.id);
    const nurLesen = q.herkunft === 'bib';
    const meta = [autorKurz(q), q.jahr, q.venue].filter(Boolean).join(' · ');
    const lesbar = PDF_ANSICHT && q.pdf_vorhanden && q.pdf;
    const entscheid = !nurLesen && q.status === 'vorschlag' ? `<span class="entscheid">
        <button type="button" class="knopf klein schreibt" data-a="q-status" data-id="${h(q.id)}" data-v="genommen">Nehmen</button>
        <button type="button" class="knopf klein still schreibt" data-a="q-status" data-id="${h(q.id)}" data-v="spaeter">Später</button>
        <button type="button" class="knopf klein still schreibt" data-a="q-status" data-id="${h(q.id)}" data-v="verworfen">Verwerfen</button></span>` : '';
    return `<li data-zeile="q:${h(q.id)}"><div class="zi">
      <div class="zeile zeile-quelle">
        ${waehlKnopf(bQuelle(q))}
        <div class="haupt" data-a="auf" data-id="q:${h(q.id)}" role="button" tabindex="0" aria-expanded="${offen}">
          <div class="titel">${h(q.titel || q.id)}</div>
          <div class="unter">${h(meta)}${q.warum && !offen ? ` <span class="blass">· ${h(q.warum)}</span>` : ''}</div>
        </div>
        ${bewertungHtml(q)}
        <span class="spalte-lesen">${lesbar ? `<a class="icon" href="${h(quelleHash(q))}" title="PDF im Dashboard lesen" aria-label="PDF lesen: ${h(q.titel || q.id)}">${icon('buch')}</a>` : ''}</span>
        <span class="spalte-status">${q.status !== 'vorschlag' || nurLesen ? `<span class="status">${quelleStatusText(q)}</span>` : entscheid}</span>
      </div>
      ${offen ? quelleDetails(q, nurLesen) : ''}
    </div></li>`;
  }

  function quelleDetails(q, nurLesen) {
    const doiUrl = q.doi ? sichereUrl('https://doi.org/' + encodeURI(String(q.doi))) : '';
    const doi = doiUrl ? `<a href="${h(doiUrl)}" target="_blank" rel="noopener">doi.org/${h(q.doi)}</a>` : '';
    const u = !q.doi ? sichereUrl(q.url) : '';
    const url = u ? `<a href="${h(u)}" target="_blank" rel="noopener">${h(u.replace(/^https?:\/\//, '').slice(0, 60))}</a>` : '';
    const pdf = q.pdf_vorhanden && q.pdf
      ? (PDF_ANSICHT ? `<a href="${h(quelleHash(q))}">PDF lesen</a>` : `<a href="${h(vscodeLink(q.pdf))}">PDF öffnen</a>`)
      : (q.open_access ? '<span class="grau">frei verfügbar, noch nicht geladen</span>' : '<span class="blass">noch kein PDF</span>');
    const zitate = q.bibkey && zahlWert(q.zitate) ? ` · <a href="${h(vscodeLink(`quellen/zitate/${q.bibkey}.md`))}">${zahl(q.zitate)} Zitate ansehen</a>` : '';
    const statusWahl = nurLesen || q.status === 'vorschlag' ? '' : `<div class="feld nur-live"><span class="lbl">Entscheidung</span><span class="entscheid">
      ${['genommen', 'spaeter', 'verworfen', 'vorschlag'].filter((s) => s !== q.status).map((s) => `<button type="button" class="knopf klein schreibt${s === 'genommen' ? '' : ' still'}" data-a="q-status" data-id="${h(q.id)}" data-v="${s}">${{ genommen: 'Nehmen', spaeter: 'Später', verworfen: 'Verwerfen', vorschlag: 'Zurück zu Vorschlägen' }[s]}</button>`).join('')}
    </span></div>`;
    const stern = zahlWert(q.stern);
    return `<div class="details">
      ${q.kurz ? `<div class="feld"><span class="lbl">Inhalt</span><span>${h(q.kurz)}</span></div>` : ''}
      ${q.warum ? `<div class="feld"><span class="lbl">Warum</span><span>${h(q.warum)}</span></div>` : ''}
      <div class="feld"><span class="lbl">Kapitel</span><span>${(q.kapitel || []).length ? h(q.kapitel.join(', ')) : '<span class="blass">noch nicht zugeordnet</span>'}</span></div>
      <div class="feld"><span class="lbl">Volltext</span><span>${pdf}${zitate}${doi ? ' · ' + doi : ''}${url ? ' · ' + url : ''}</span></div>
      ${nurLesen ? '<div class="feld"><span class="lbl">Herkunft</span><span class="grau">steht direkt in literatur.bib</span></div>' : `
      <div class="feld"><span class="lbl">Bewertung</span><span class="sterne">${[1, 2, 3].map((n) => `<button type="button" class="${stern >= n ? 'an ' : ''}schreibt" data-a="q-stern" data-id="${h(q.id)}" data-v="${stern === n ? 0 : n}" aria-label="${n} von 3 Sternen" aria-pressed="${stern >= n}">${icon('stern')}</button>`).join('')}
        ${zahlWert(q.relevanz) ? `<span class="mono blass">Claude: ${zahl(q.relevanz)} von 5</span>` : ''}</span></div>
      <div class="feld"><span class="lbl">Markierungen</span><span class="marken">${MARKIERUNGEN.map((m) => `<button type="button" class="marke schreibt${(q.markierungen || []).includes(m) ? ' an' : ''}" data-a="q-marke" data-id="${h(q.id)}" data-v="${m}" aria-pressed="${(q.markierungen || []).includes(m)}">${m}</button>`).join('')}</span></div>
      <div class="feld"><span class="lbl">Notiz</span><textarea data-notiz="${h(q.id)}" aria-label="Notiz zu dieser Quelle" placeholder="Was dir auffällt, wofür du sie nutzen willst …" ${LIVE ? '' : 'readonly'}>${h(q.notiz || '')}</textarea></div>
      ${statusWahl}`}
      <div class="feld"><span class="lbl">Schlüssel</span><span class="mono grau">${q.bibkey ? h(q.bibkey) : 'noch kein Schlüssel'} · ${h(q.herkunft || '')}${q.hinzugefuegt ? ' · ' + h(datumDe(q.hinzugefuegt)) : ''}</span></div>
    </div>`;
  }

  function quellenGefiltert() {
    const Q = S.quellen || {};
    const such = String(ui.suche || '').trim().toLowerCase();
    let liste = (Q.liste || []).filter((q) => q.status === ui.filter);
    if (such) liste = liste.filter((q) => [q.titel, (q.autoren || []).join(' '), q.venue, q.notiz, q.bibkey, q.warum, q.jahr, (q.markierungen || []).join(' '), (q.kapitel || []).join(' ')].join(' ').toLowerCase().includes(such));
    const sort = {
      relevanz: (a, b) => (zahlWert(b.stern) - zahlWert(a.stern)) || (zahlWert(b.relevanz) - zahlWert(a.relevanz)),
      jahr: (a, b) => zahlWert(b.jahr) - zahlWert(a.jahr),
      neu: (a, b) => String(b.hinzugefuegt || '').localeCompare(String(a.hinzugefuegt || '')),
      kapitel: (a, b) => String((a.kapitel || [])[0] || 'zz').localeCompare(String((b.kapitel || [])[0] || 'zz'), 'de', { numeric: true }),
    }[ui.sortierung] || (() => 0);
    return liste.sort(sort);
  }

  function quellenListeHtml() {
    const liste = quellenGefiltert();
    const such = String(ui.suche || '').trim();
    if (liste.length) return `<ul class="liste">${liste.map(quelleZeile).join('')}</ul>`;
    if (such) {
      return `<ul class="liste"><li class="leer leer-zeile"><span>Keine Treffer für „${h(such)}“ unter ${h({ vorschlag: 'Vorschläge', genommen: 'Genommen', spaeter: 'Später', verworfen: 'Verworfen' }[ui.filter])}.</span>
        <button type="button" class="knopf klein" data-a="suche-leeren">Suche löschen</button></li></ul>`;
    }
    const leerText = {
      vorschlag: 'Keine offenen Vorschläge. Lass Claude recherchieren oder lade eigene PDFs hoch.',
      genommen: 'Noch keine Quelle genommen.',
      spaeter: 'Nichts zurückgestellt.',
      verworfen: 'Nichts verworfen.',
    }[ui.filter];
    return `<ul class="liste"><li class="leer leer-zeile"><span>${h(leerText)}</span>${ui.filter === 'vorschlag' ? `<button type="button" class="knopf klein" data-a="auftrag" data-cmd="/recherche">${icon('lupe')} Recherche</button>` : ''}</li></ul>`;
  }

  function quellen() {
    const Q = S.quellen || { liste: [], zaehler: {}, eingang: [] };
    const z = Q.zaehler || {};
    const filter = [['vorschlag', 'Vorschläge'], ['genommen', 'Genommen'], ['spaeter', 'Später'], ['verworfen', 'Verworfen']];
    const eingang = Q.eingang || [];
    return `
      ${eingang.length ? `<section class="abschnitt" data-abschnitt="eingang"><h2>Eingang <span class="rechts"><button type="button" class="icon" data-a="auftrag" data-cmd="/quellen" data-sofort="1" title="Von Claude einsortieren lassen (/quellen)" aria-label="Eingang von Claude einsortieren lassen">${icon('senden')}</button></span></h2>
        <ul class="liste">${eingang.map((d) => `<li data-zeile="e:${h(d.name)}"><div class="zi"><div class="zeile">${waehlKnopf(bDatei('quellen/eingang/' + d.name))}<div class="haupt"><div class="titel">${h(d.name)}</div><div class="unter mono">${zahl(Math.max(1, Math.round(zahlWert(d.groesse) / 1024)))} KB · ${h(wann(d.geaendert))}</div></div></div></div></li>`).join('')}</ul></section>` : ''}
      <div class="filter" role="group" aria-label="Filter">${filter.map(([id, name]) => `<button type="button" data-a="filter" data-v="${id}" aria-pressed="${ui.filter === id}">${name}<span class="zahl-klein">${zahl(z[id] || 0)}</span></button>`).join('')}</div>
      <div class="leiste">
        <input type="search" id="suche" placeholder="Suchen in Titel, Autoren, Notizen …" value="${h(ui.suche)}" aria-label="Quellen durchsuchen" autocomplete="off">
        <select id="sortierung" aria-label="Sortierung">
          ${[['relevanz', 'Wichtigste zuerst'], ['jahr', 'Neueste Jahre'], ['neu', 'Zuletzt hinzugefügt'], ['kapitel', 'Nach Kapitel']].map(([v, n]) => `<option value="${v}" ${ui.sortierung === v ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
        <button type="button" class="knopf" data-a="auftrag" data-cmd="/recherche" title="Neue Recherche: /recherche in den Auftrag">${icon('lupe')} Recherche</button>
      </div>
      <section class="abschnitt" data-abschnitt="quellen-liste" id="quellen-liste">${quellenListeHtml()}</section>
      <section class="abschnitt nur-live" data-abschnitt="drop">
        <div class="drop" id="drop" data-a="upload" role="button" tabindex="0"><span>PDFs oder andere Dateien hierher ziehen oder klicken.</span> <span>Sie landen im Eingang, Claude sortiert sie mit <span class="mono">/quellen</span> ein.</span></div>
      </section>
      <p class="fussnote">${zahl(Q.bib_anzahl || 0)} Einträge im Literaturverzeichnis · ${zahl(Q.ausgewertet || 0)} ausgewertet · Claude schlägt vor, du entscheidest.</p>`;
  }
  function zeichneQuellenListe() {
    const box = $('#quellen-liste'); if (!box) return;
    box.innerHTML = quellenListeHtml();
    nachZeichnen(box);
  }

  // ---------- Kapitel ----------
  function pdfStatusHtml() {
    const b = S.pdfBau || {};
    if (b.laeuft) return '<span class="pdf-status mono blass" data-pdfstatus>PDF wird gebaut …</span>';
    const teile = [];
    if (b.fertig && b.ok === false) teile.push(`<span class="warm" title="${h(b.meldung || '')}">letzter Bau fehlgeschlagen</span>`);
    else if (S.pdf?.vorhanden) teile.push(`Stand ${h(wann(S.pdf.geaendert || b.fertig))}${zahlWert(b.seiten) ? `, ${zahl(b.seiten)} Seiten` : ''}`);
    const n = zahlWert(b.geaendert_seit);
    if (n) teile.push(`${zahl(n)} ${n === 1 ? 'Änderung' : 'Änderungen'} seither`);
    return `<span class="pdf-status mono blass" data-pdfstatus>${teile.join(' · ')}</span>`;
  }
  function aktualisierePdfStatus() {
    $$('[data-pdfstatus]').forEach((el) => { el.outerHTML = pdfStatusHtml(); });
    $$('[data-a="pdf-bauen"]').forEach((b) => { b.classList.toggle('laeuft', !!S.pdfBau?.laeuft); b.setAttribute('aria-busy', String(!!S.pdfBau?.laeuft)); });
  }

  function kapitelZeile(k) {
    const ziel = zahlWert(k.woerter_ziel);
    const freigabe = k.status === 'entwurf' || k.status === 'geprueft';
    const lesen = LIVE && k.vorhanden;
    const offenePunkte = zahlWert(k.offene_punkte);
    const haupt = `<span class="titel"><span class="mono blass">${h(k.nr)}</span> ${h(k.titel || 'ohne Titel')}</span>
        <span class="unter">${h(STATUS_NAME[k.status] || anzeige(k.status))}${note(k.note_schaetzung) ? ` · Note etwa ${h(note(k.note_schaetzung))}` : ''}${offenePunkte ? ` · <span class="warm">${zahl(offenePunkte)} offene Punkte</span>` : ''}${k.ueber_budget ? ' · <span class="warm">über Budget</span>' : ''}${k.vorhanden ? '' : ' · <span class="blass">noch keine Datei</span>'}</span>`;
    return `<li data-zeile="k:${h(k.nr)}"><div class="zi"><div class="zeile zeile-kapitel">
      ${waehlKnopf(bKapitel(k))}
      <span class="menue-anker"><button type="button" class="glyph-knopf schreibt" data-a="k-status-menue" data-nr="${h(k.nr)}" aria-haspopup="menu" aria-expanded="false" title="Status: ${h(STATUS_NAME[k.status] || k.status)}. Klicken zum Ändern" aria-label="Status von Kapitel ${h(k.nr)}: ${h(STATUS_NAME[k.status] || k.status)}">${STATUS_GLYPH[k.status] || '○'}</button></span>
      ${lesen ? `<a class="haupt" href="#kapitel/${h(kapSlug(k.nr))}" title="Lesen und korrigieren">${haupt}</a>`
        : k.vorhanden ? `<a class="haupt" href="${h(vscodeLink(k.datei))}" title="In VS Code öffnen">${haupt}</a>` : `<div class="haupt">${haupt}</div>`}
      <div class="kap-balken"><span class="mono">${zahl(k.woerter)}${ziel ? ' / ' + zahl(ziel) : ''}</span>
        ${ziel ? balken(zahlWert(k.woerter) / ziel, k.ueber_budget ? ' warm' : '') : ''}</div>
      <div class="rechts">
        <button type="button" class="icon" data-a="auftrag" data-cmd="/schreiben" data-text="${h(k.nr)}" title="Schreiben oder überarbeiten: /schreiben ${h(k.nr)}" aria-label="Kapitel ${h(k.nr)} schreiben lassen">${icon('stift')}</button>
        <button type="button" class="icon" data-a="auftrag" data-cmd="/pruefen" data-text="${h(k.nr)}" title="Prüfen lassen: /pruefen ${h(k.nr)}" aria-label="Kapitel ${h(k.nr)} prüfen lassen">${icon('lupe')}</button>
        ${k.vorhanden ? `<a class="icon" href="${h(vscodeLink(k.datei))}" title="In VS Code öffnen" aria-label="Kapitel ${h(k.nr)} in VS Code öffnen">${icon('code')}</a>` : '<span class="icon-platz"></span>'}
        <span class="freigabe-platz nur-live">${freigabe ? `<button type="button" class="knopf klein schreibt" data-a="freigeben" data-nr="${h(k.nr)}">Freigeben</button>` : ''}</span>
      </div>
    </div></div></li>`;
  }

  function kapitelStandText(K) {
    const zaehl = {}; K.forEach((k) => { zaehl[k.status] = (zaehl[k.status] || 0) + 1; });
    return KAPITEL_STATUS.filter((s) => zaehl[s]).map((s) => `${STATUS_GLYPH[s]} ${zaehl[s]} ${STATUS_NAME[s]}`).join(' · ');
  }

  function kapitel() {
    const K = S.kapitel || [];
    const doks = S.dokumente || {};
    const dokLinks = [['thema', 'Thema'], ['expose', 'Exposé'], ['gliederung', 'Gliederung'], ['stil', 'Stil'], ['tagebuch', 'Tagebuch']]
      .filter(([id]) => doks[id]?.pfad).map(([id, name]) => {
        const pfad = doks[id].pfad;
        const lesbar = LIVE && /^arbeit\/.+\.md$/.test(pfad);
        return `<a class="knopf klein" href="${h(lesbar ? textHash(pfad) : vscodeLink(pfad))}">${icon(lesbar ? 'buch' : 'oeffnen')} ${name}</a>`;
      }).join('');
    const pdfLink = S.pdf?.vorhanden
      ? `<a class="knopf klein" href="${PDF_ANSICHT ? '#arbeit' : h(vscodeLink('Arbeit.pdf'))}">${icon(PDF_ANSICHT ? 'buch' : 'oeffnen')} Arbeit.pdf</a>` : '';
    const pdfBau = LIVE ? `<button type="button" class="knopf klein schreibt${S.pdfBau?.laeuft ? ' laeuft' : ''}" data-a="pdf-bauen" title="Entwurfs-PDF aus allen Kapiteln bauen">${icon('neu')} PDF aktualisieren</button>` : '';
    if (!K.length) {
      return `<section class="abschnitt" data-abschnitt="leer"><div class="karte leer-karte">Die Kapitel entstehen, sobald die Gliederung steht. Bis dahin führt dich <span class="mono">/weiter</span> durch Thema, Recherche und Exposé.
        <div class="reihe"><button type="button" class="knopf haupt" data-a="auftrag" data-cmd="${h(S.naechster_command || '/weiter')}" data-sofort="1">${icon('senden')} Nächster Schritt</button></div></div></section>
        ${dokLinks || pdfLink ? `<section class="abschnitt" data-abschnitt="dokumente"><h2>Dokumente</h2><div class="dokumente">${dokLinks}${pdfLink}</div></section>` : ''}`;
    }
    const gruppen = new Map();
    K.forEach((k) => { const g = k.hauptkapitel; if (!gruppen.has(g)) gruppen.set(g, []); gruppen.get(g).push(k); });
    const w = S.woerter || {};
    const zeilen = [...gruppen.entries()].map(([nr, ks]) => {
      const summe = ks.reduce((s, k) => s + zahlWert(k.woerter), 0); const ziel = ks.reduce((s, k) => s + zahlWert(k.woerter_ziel), 0);
      const t = ks[0].hauptkapitel_titel || (S.hauptkapitel || []).find((x) => String(x.nr) === String(nr))?.titel || '';
      return `<li class="gruppe"><div class="haupt-kopf"><span>${h(nr)} ${h(t || 'Kapitel ' + nr)}</span><span class="mono">${zahl(summe)}${ziel ? ' / ' + zahl(ziel) : ''} Wörter</span></div>
        <ul class="liste innen">${ks.map(kapitelZeile).join('')}</ul></li>`;
    }).join('');
    const sonder = (S.sonderTexte || []).map((d) => {
      const pfad = 'arbeit/kapitel/' + d.name;
      return `<a class="knopf klein" href="${h(LIVE ? textHash(pfad) : vscodeLink(pfad))}">${icon(LIVE ? 'buch' : 'oeffnen')} ${h(anzeigeName(String(d.name).replace(/^\d+-/, '')))} <span class="blass mono">${zahl(d.woerter)}</span></a>`;
    }).join('');
    const ohne = (S.kapitelOhneEintrag || []).map((d) => {
      const pfad = 'arbeit/kapitel/' + d.name;
      return `<li data-zeile="o:${h(d.name)}"><div class="zi"><div class="zeile"><a class="haupt" href="${h(LIVE ? textHash(pfad) : vscodeLink(pfad))}"><span class="titel">${h(d.name)}</span><span class="unter">nicht in der Gliederung · ${zahl(d.woerter)} Wörter</span></a>
        <a class="icon" href="${h(vscodeLink(pfad))}" title="In VS Code öffnen" aria-label="${h(d.name)} in VS Code öffnen">${icon('code')}</a></div></div></li>`;
    }).join('');
    return `
      <section class="abschnitt" data-abschnitt="stand"><h2>Stand <span class="rechts mono">${h(kapitelStandText(K))}</span></h2>
        <div class="karte stand-karte">
          <div class="zahl">${zahl(w.gesamt)} <small>${w.ziel ? '/ ' + zahl(w.ziel) : ''} Wörter · etwa ${zahl(w.seiten_geschaetzt)} Seiten</small></div>
          ${w.ziel ? balken(zahlWert(w.prozent) / 100) : ''}
          <div class="pdf-zeile">${pdfLink}${pdfBau}${LIVE ? pdfStatusHtml() : ''}</div>
        </div></section>
      <section class="abschnitt" data-abschnitt="gliederung"><h2>Gliederung <span class="rechts mono blass legende-glyph" title="Statuszeichen">○ offen ◌ geplant ◐ entwurf ● geprüft ✓ final</span></h2><ul class="liste gliederung">${zeilen}</ul></section>
      ${ohne ? `<section class="abschnitt" data-abschnitt="weitere"><h2>Weitere Texte</h2><ul class="liste">${ohne}</ul></section>` : ''}
      ${dokLinks || sonder ? `<section class="abschnitt" data-abschnitt="dokumente"><h2>Dokumente</h2><div class="dokumente">${dokLinks}${sonder}</div></section>` : ''}`;
  }

  // ---------- Plan ----------
  function terminZeile(t, mitAktionen = true) {
    const rot = t.ueberfaellig && !t.erledigt;
    return `<li data-zeile="t:${h(t.id)}"><div class="zi"><div class="zeile zeile-termin">
      ${waehlKnopf(bTermin(t))}
      <div class="haupt"><div class="titel${t.erledigt ? ' durch' : ''}">${h(t.titel)}</div>
        <div class="unter"><span class="mono">${h(datumDe(t.datum))}${t.zeit ? ' ' + h(t.zeit) : ''}</span> · ${h(ART_NAME[t.art] || t.art)}${t.notiz ? ' · ' + h(t.notiz) : ''}</div></div>
      <span class="spalte-status"><span class="status${rot ? ' rot' : ''}">${t.erledigt ? 'erledigt' : h(relTage(t.tage))}</span></span>
      ${mitAktionen ? `<span class="rechts nur-live">
        <button type="button" class="abhaken schreibt${t.erledigt ? ' an' : ''}" data-a="t-erledigt" data-id="${h(t.id)}" data-v="${t.erledigt ? '0' : '1'}" aria-pressed="${!!t.erledigt}" title="${t.erledigt ? 'Wieder öffnen' : 'Als erledigt abhaken'}" aria-label="${t.erledigt ? 'Wieder öffnen' : 'Erledigt'}: ${h(t.titel)}">${icon('haken')}</button>
        <button type="button" class="icon schreibt" data-a="t-loeschen" data-id="${h(t.id)}" title="Löschen" aria-label="Termin löschen: ${h(t.titel)}">${icon('muell')}</button></span>` : ''}
    </div></div></li>`;
  }

  function wochenHtml() {
    const heute = new Date(); heute.setHours(0, 0, 0, 0);
    const start = new Date(heute); start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 7);
    const abgabe = parseTag(S.abgabe?.datum);
    let ende = abgabe ? new Date(abgabe) : new Date(heute.getTime() + 8 * 7 * 86400000);
    if (ende < heute) ende = new Date(heute.getTime() + 7 * 86400000);
    const maxEnde = new Date(start.getTime() + 40 * 7 * 86400000);
    if (ende > maxEnde) ende = maxEnde;
    const puffer = abgabe ? new Date(abgabe.getTime() - 7 * 86400000) : null;
    const akt = new Map((S.letzte14 || []).map((t) => [t.tag, t]));
    const termineNachTag = new Map();
    (S.termine || []).forEach((t) => { if (!termineNachTag.has(t.datum)) termineNachTag.set(t.datum, []); termineNachTag.get(t.datum).push(t); });
    const arbeit = new Set(S.tagesziel?.arbeitstage || ['mo', 'di', 'mi', 'do', 'fr']);
    const zeilen = [`<div class="woche kopf"><span>Woche</span>${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => `<span class="tag leer-kopf">${d}</span>`).join('')}<span></span></div>`];
    for (let w = new Date(start); w <= ende; w.setDate(w.getDate() + 7)) {
      const tage = []; const was = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(w); d.setDate(d.getDate() + i);
        const t = isoTag(d);
        const kl = ['tag'];
        if (!arbeit.has(WT_ID[d.getDay()])) kl.push('frei');
        if (d < heute) { const a = aktivKlasse(akt.get(t)); if (a) kl.push(a); }
        if (d.getTime() === heute.getTime()) kl.push('heute');
        if (termineNachTag.has(t)) { kl.push('termin'); termineNachTag.get(t).forEach((x) => was.push(`${WT[d.getDay()]} ${x.titel}`)); }
        if (abgabe && d.getTime() === abgabe.getTime()) { kl.push('abgabe'); was.push('Abgabe'); }
        else if (puffer && d >= puffer && abgabe && d < abgabe) kl.push('puffer');
        const titel = `${datumDe(t)}${termineNachTag.has(t) ? ': ' + termineNachTag.get(t).map((x) => x.titel).join(', ') : ''}`;
        tage.push(`<span class="${kl.join(' ')}" title="${h(titel)}">${d.getDate()}</span>`);
      }
      zeilen.push(`<div class="woche"><span class="kw">KW ${kalenderwoche(w)} · ${datumKurz(isoTag(w))}</span>${tage.join('')}<span class="was">${h(was.join(' · '))}</span></div>`);
    }
    return `<div class="wochen">${zeilen.join('')}</div>
      <p class="fussnote">Farbig: an diesem Tag gearbeitet · Punkt: Termin · schraffiert: Pufferwoche vor der Abgabe · gestrichelt: freier Tag.</p>`;
  }
  function kalenderwoche(d) {
    const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const tag = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - tag);
    const jahr = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
    return Math.ceil(((x - jahr) / 86400000 + 1) / 7);
  }

  function plan() {
    const T = S.termine || [];
    const offen = T.filter((t) => !t.erledigt);
    const erledigt = T.filter((t) => t.erledigt);
    const PH_GLYPH = { erledigt: '✓', aktiv: '◐', offen: '○' };
    return `
      <div class="zwei">
        <div>
          <section class="abschnitt" data-abschnitt="termine"><h2>Termine und Fristen</h2>
            <ul class="liste">${offen.map((t) => terminZeile(t)).join('') || '<li class="leer">Noch keine Termine. Trag Betreuungstreffen, Laborzeiten und Fristen ein.</li>'}
            ${erledigt.length ? `<li class="trenner">erledigt</li>${erledigt.slice(-10).reverse().map((t) => terminZeile(t)).join('')}` : ''}</ul>
          </section>
          <section class="abschnitt nur-live" data-abschnitt="termin-neu"><h2>Termin eintragen</h2>
            <form class="formular karte" id="termin-form" autocomplete="off">
              <input type="text" name="titel" required placeholder="Was steht an?" aria-label="Titel" class="titel-feld">
              <input type="date" name="datum" required aria-label="Datum">
              <input type="time" name="zeit" aria-label="Uhrzeit, optional">
              <select name="art" aria-label="Art">${Object.entries(ART_NAME).map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select>
              <input type="text" name="notiz" placeholder="Notiz, optional" aria-label="Notiz, optional" class="notiz-feld">
              <button type="submit" class="knopf haupt schreibt">Eintragen</button>
            </form>
          </section>
        </div>
        <div>
          <section class="abschnitt" data-abschnitt="meilensteine"><h2>Meilensteine</h2>
            <ul class="liste">${(S.phasen || []).map((ph) => `<li><div class="zeile zeile-meilenstein ${h(ph.status)}"><span class="glyph mono" aria-hidden="true">${PH_GLYPH[ph.status] || '○'}</span>
              <div class="haupt"><div class="titel">${h(ph.name)}</div></div>
              <span class="status">${ph.status === 'erledigt' ? 'erledigt' + (ph.datum ? ' ' + h(datumKurz(ph.datum)) : '') : ph.status === 'aktiv' ? 'jetzt' : ''}</span></div></li>`).join('')}
              ${S.abgabe?.datum ? `<li><div class="zeile zeile-meilenstein"><span class="glyph mono" aria-hidden="true">◆</span><div class="haupt"><div class="titel">Abgabetermin</div></div><span class="status${S.abgabe.tage < 0 ? ' rot' : ''}">${h(datumDe(S.abgabe.datum))} · ${h(relTage(S.abgabe.tage))}</span></div></li>` : ''}
            </ul>
          </section>
        </div>
      </div>
      <section class="abschnitt" data-abschnitt="wochen"><h2>${S.abgabe?.datum ? 'Wochen bis zur Abgabe' : 'Die nächsten Wochen'}${S.abgabe?.datum ? '' : ' <span class="rechts hinweis-klein">Abgabedatum fehlt noch, /start legt es fest</span>'}</h2>${wochenHtml()}</section>`;
  }

  // ---------- Hilfe ----------
  const FAQ = [
    ['Ich klicke auf das Senden-Symbol, aber nichts passiert.',
      'Dann blockiert der Browser den Sprung nach VS Code. Der Auftrag liegt nach zwei Sekunden automatisch in der Zwischenablage. Öffne in VS Code das Claude-Fenster (Symbol oben rechts oder Strg+Esc) und füge ihn mit Strg+V ein.'],
    ['Ich will etwas rückgängig machen.',
      'Im Dashboard: „Rückgängig“ im Hinweis unten oder die Taste Z. In Claude: /rewind setzt Gespräch und Dateiänderungen zurück. Das wirkt nicht auf Dateien, die Subagents (zum Beispiel der Autor) oder Bash-Befehle geschrieben haben. Dafür gibt es den letzten Stand auf GitHub (/sync).'],
    ['Das Dashboard zeigt „Kopie“ oder „offline“ statt „live“.',
      '„Kopie“ ist die statische dashboard.html. „offline“ heißt, der Dashboard-Server läuft nicht mehr. In beiden Fällen: in Claude /dashboard eingeben, dann startet die Live-Ansicht mit allen Knöpfen.'],
    ['Claude fragt so viel.',
      'Das ist Absicht: Jede Entscheidung über deine Arbeit triffst du. Wenn dich eine Art von Frage nervt, sag es Claude. Es merkt sich das in arbeit/stil.md unter „So arbeite ich“.'],
    ['Das PDF baut nicht.',
      'Tipp /pdf ein. Claude übersetzt die Fehlermeldung und repariert, was geht. Hilft das nicht: /hilfe das PDF baut nicht.'],
    ['Ich komme nicht an ein Paper (Login der Bibliothek).',
      'Sag Claude, welches Paper du brauchst. Es öffnet einen Browser, du meldest dich einmal selbst bei der Bibliothek an, danach kann Claude den Volltext laden. Passwörter gibst du nie an Claude weiter.'],
  ];

  function werkzeugkastenHtml() {
    const alle = skills();
    return GRUPPEN.map(([g, name]) => {
      const liste = alle.filter((s) => s.gruppe === g);
      if (!liste.length) return '';
      return `<div class="skill-gruppe"><div class="skill-gruppe-name">${name}</div><ul class="liste">${liste.map((s) => `<li data-zeile="s:${h(s.name)}"><div class="zi"><div class="zeile zeile-skill">
        <a class="haupt" href="#skill/${h(encodeURIComponent(s.name))}">
          <span class="titel"><span class="mono akzent">/${h(s.name)}</span>${s.argument ? ` <span class="mono blass">${h(s.argument)}</span>` : ''}</span>
          <span class="unter">${h(anzeige(s.kurz))}${s.auto ? ' · <span class="blass">Claude nutzt ihn auch selbst</span>' : ''}${s.eigen ? ' · <span class="blass">eigener Skill</span>' : ''}</span>
        </a>
        <button type="button" class="icon" data-a="auftrag" data-cmd="/${h(s.name)}" title="/${h(s.name)} in den Auftrag" aria-label="/${h(s.name)} in den Auftrag übernehmen">${icon('claude')}</button>
      </div></div></li>`).join('')}</ul></div>`;
    }).join('');
  }

  function hilfe() {
    const sys = !LIVE ? '<li class="leer">Den Systemcheck gibt es in der Live-Ansicht.</li>'
      : !checkErgebnis ? '<li class="leer">Prüfe …</li>'
      : !checkErgebnis.verfuegbar ? '<li class="leer">Systemcheck ist noch nicht installiert. Tipp /hilfe ein.</li>'
      : (checkErgebnis.ergebnisse || []).map((e) => `<li><div class="zeile zeile-check"><span class="check-zeichen ${e.ok ? 'ok' : e.ok === false ? 'warm' : 'blass'}" aria-label="${e.ok ? 'in Ordnung' : e.ok === false ? 'Problem' : 'nicht geprüft'}">${e.ok ? icon('haken') : e.ok === false ? '!' : '–'}</span>
          <div class="haupt"><div class="titel">${h(anzeigeName(e.name))}</div>${e.wert && e.ok ? `<div class="unter mono wert" title="${h(e.wert)}">${h(String(e.wert))}</div>` : ''}${e.hinweis ? `<div class="unter umbruch">${h(e.hinweis)}</div>` : ''}</div></div></li>`).join('');
    const docs = S.dokumente?.docs || [];
    return `
      <section class="abschnitt" data-abschnitt="so"><h2>So arbeitest du mit dem Kit</h2><div class="karte">
        <ol class="schritte">
          <li><strong>Einmal einrichten</strong> mit <span class="mono">/start</span>. Claude fragt dich alles Nötige.</li>
          <li><strong>Jeden Tag</strong> mit <span class="mono">/weiter</span> beginnen. Claude sagt, was dran ist, und stellt dir Fragen dazu.</li>
          <li><strong>Hier im Dashboard</strong> behältst du den Überblick, entscheidest über Quellen, liest und korrigierst Kapitel und schickst Aufträge an Claude. Der Kreis links an einer Zeile nimmt sie als Bezug in den Auftrag. <span class="mono">Strg+K</span> sucht überall.</li>
          <li><strong>Am Ende des Tages</strong> <span class="mono">/sync</span>, damit alles auf GitHub gesichert ist.</li>
        </ol></div></section>
      <section class="abschnitt" data-abschnitt="werkzeugkasten"><h2>Werkzeugkasten <span class="rechts"><button type="button" class="knopf klein" data-a="skill-neu" title="Auftrag an Claude: eigenen Skill erstellen">${icon('plus')} Neuer Skill</button></span></h2>
        <p class="einleitung">Jeder Befehl ist ein Skill. Klick auf einen, um zu lesen, was Claude dabei tut. Eigene Skills überstehen /update.</p>
        ${werkzeugkastenHtml()}</section>
      <div class="zwei">
        <div>
          <section class="abschnitt faq" data-abschnitt="faq"><h2>Wenn es hakt</h2><div class="karte">${FAQ.map(([f, a]) => `<details><summary>${h(f)}</summary><p>${h(a)}</p></details>`).join('')}</div></section>
          ${docs.length ? `<section class="abschnitt" data-abschnitt="anleitungen"><h2>Anleitungen</h2><div class="dokumente">${docs.map((d) => `<a class="knopf klein" href="${h(vscodeLink('docs/' + d.name))}">${icon('oeffnen')} ${h(anzeigeName(d.name))}</a>`).join('')}</div></section>` : ''}
        </div>
        <section class="abschnitt system" data-abschnitt="technik"><h2>Technik <span class="rechts">
          <button type="button" class="knopf klein still nur-live" data-a="check-neu">neu prüfen</button>
          <button type="button" class="icon" data-a="auftrag" data-cmd="/hilfe" data-text="Bitte prüfe die Technik und repariere, was geht." title="Reparieren lassen: /hilfe" aria-label="Technik von Claude reparieren lassen">${icon('claude')}</button></span></h2>
          <ul class="liste">${sys}</ul>
          <p class="fussnote mono">Kit ${h(S.version || '?')} · <span title="${h(S.root || '')}">${h(String(S.root || '').split(/[\\/]/).filter(Boolean).slice(-1)[0] || '')}</span></p>
        </section>
      </div>`;
  }

  async function ladeCheck(neu) {
    if (!LIVE) return;
    if (checkErgebnis && !neu) return;
    try { checkErgebnis = await holeJson('/api/check'); }
    catch { checkErgebnis = { verfuegbar: false, ergebnisse: [] }; }
    if (ui.reiter === 'hilfe' && darfNeuZeichnen()) zeichneInhalt();
  }

  // ---------- Zeichnen, ohne dass etwas springt ----------
  function ankerMerken() {
    const obenH = $('#oben')?.getBoundingClientRect().bottom || 0;
    for (const el of $$('#inhalt [data-zeile], #inhalt [data-abschnitt]')) {
      const r = el.getBoundingClientRect();
      if (r.bottom > obenH + 4 && r.height > 0) {
        const attr = el.dataset.zeile != null ? 'data-zeile' : 'data-abschnitt';
        return { sel: `[${attr}="${esc(el.getAttribute(attr))}"]`, top: r.top };
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
    let sel = '';
    if (el.id) sel = '#' + esc(el.id);
    else {
      const teile = [el.tagName.toLowerCase()];
      for (const a of ['data-a', 'data-id', 'data-v', 'data-nr', 'data-notiz', 'data-i', 'name', 'href']) {
        if (el.hasAttribute(a)) teile.push(`[${a}="${esc(el.getAttribute(a))}"]`);
      }
      sel = teile.join('');
    }
    return { sel, start: el.selectionStart, ende: el.selectionEnd };
  }
  function fokusWieder(f, wurzel) {
    if (!f) return;
    let el = null; try { el = $(f.sel, wurzel); } catch {}
    if (!el) return;
    el.focus({ preventScroll: true });
    if (f.start != null && typeof el.setSelectionRange === 'function') { try { el.setSelectionRange(f.start, f.ende); } catch {} }
  }
  function nachZeichnen(wurzel) {
    $$('[data-p]', wurzel).forEach((i) => i.style.setProperty('--p', i.dataset.p));
    sperreSchreibknoepfe(wurzel);
    markiereKreise();
    if (hervorheben) {
      const el = $(`[data-zeile="${esc(hervorheben)}"]`, wurzel);
      if (el) { el.classList.add('blitz'); hervorheben = null; }
    }
  }

  function zeichneInhalt({ oben = false } = {}) {
    const main = $('#inhalt');
    const a = oben ? null : ankerMerken();
    const f = oben ? null : fokusMerken(main);
    const fn = { uebersicht, quellen, kapitel, plan, hilfe }[ui.reiter] || uebersicht;
    main.innerHTML = kaputtHtml() + fn();
    nachZeichnen(main);
    if (a) ankerWieder(a);
    if (f) fokusWieder(f, main);
    if (ui.reiter === 'hilfe') ladeCheck(false);
    nachladenAusstehend = false;
  }

  function kaputtHtml() {
    const k = Array.isArray(S.kaputt) ? S.kaputt : [];
    if (!k.length) return '';
    return `<div class="hinweis" data-abschnitt="kaputt" role="alert"><span class="text">${k.length === 1 ? 'Datei' : 'Dateien'} ${k.map((x) => `<span class="mono">${h(x)}</span>`).join(', ')} ${k.length === 1 ? 'ist' : 'sind'} beschädigt. Das Dashboard schreibt dort nichts, bis sie repariert ${k.length === 1 ? 'ist' : 'sind'}. Sag Claude: <span class="mono">/hilfe reparieren</span></span>
      <button type="button" class="icon" data-a="auftrag" data-cmd="/hilfe" data-text="reparieren" title="/hilfe reparieren in den Auftrag" aria-label="/hilfe reparieren in den Auftrag übernehmen">${icon('claude')}</button></div>`;
  }

  function zeichneAlles() {
    zeichneKopf(); zeichneReiter(); zeichneKonfig(); zeichneInhalt();
  }

  function darfNeuZeichnen() {
    if (Date.now() < sperreBis) return false;
    const main = $('#inhalt');
    const a = document.activeElement;
    if (a && main.contains(a) && a.matches('textarea, select, input:not([type="search"])')) return false;
    if ($('#inhalt .menue') || $('#inhalt .bestaetigen')) return false;
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
      zeichneKopf();
      zeichneWennMoeglich();
      aktualisierePdfStatus();
      panelLiveUpdate();
    } catch {}
  }

  // ---------- Live-Verbindung ----------
  let quelle = null;
  let versuch = 0;
  let standVersion = null;
  let wiederTimer = null;
  function verbinde() {
    if (!LIVE || !window.EventSource) return;
    clearTimeout(wiederTimer);
    try { quelle?.close(); } catch {}
    const es = new EventSource('/ereignisse');
    quelle = es;
    es.onopen = () => { versuch = 0; verbunden = true; setzeOffline(false); zeichneLive(); };
    es.addEventListener('hallo', () => { verbunden = true; setzeOffline(false); zeichneLive(); });
    es.addEventListener('stand', (e) => {
      const warOffline = offline || !verbunden;
      verbunden = true; setzeOffline(false); zeichneLive(); pulsiere();
      let v; try { v = JSON.parse(e.data).version; } catch {}
      if ((standVersion !== null && v !== standVersion) || warOffline) holeStand();
      standVersion = v;
    });
    es.addEventListener('pdf', (e) => {
      let d; try { d = JSON.parse(e.data); } catch { return; }
      const vorher = S.pdfBau || {};
      S.pdfBau = d;
      aktualisierePdfStatus();
      if (vorher.laeuft && !d.laeuft) pdfBauFertig(d);
    });
    es.onerror = () => {
      verbunden = false;
      if (es.readyState === 2) {
        setzeOffline(true);
        versuch++;
        const warteZeit = Math.min(30000, 1000 * 2 ** Math.min(versuch - 1, 5));
        wiederTimer = setTimeout(verbinde, warteZeit);
      } else {
        // Der Browser verbindet selbst neu. Erst nach einer Weile als offline zeigen.
        setTimeout(() => { if (!verbunden) setzeOffline(true); }, 2500);
      }
      zeichneLive();
    };
  }
  window.addEventListener('online', () => { if (LIVE && (offline || !verbunden)) verbinde(); });
  document.addEventListener('visibilitychange', () => { if (LIVE && !document.hidden && quelle && quelle.readyState === 2) verbinde(); });

  // ---------- Aktionen: Quellen ----------
  function findeQuelle(id) { return (S.quellen?.liste || []).find((q) => q.id === id); }

  async function schrumpfe(li) {
    if (!li) return;
    sperreBis = Date.now() + 900;
    li.classList.add('schrumpft');
    await warte(180);
  }

  async function quelleSetzen(id, aenderung, zeileEl) {
    const q = findeQuelle(id); if (!q) return;
    const vorher = { status: q.status, stern: q.stern, markierungen: [...(q.markierungen || [])], notiz: q.notiz, entschieden: q.entschieden };
    const statusWechsel = aenderung.status && aenderung.status !== q.status;
    if (statusWechsel && zeileEl) await schrumpfe(zeileEl);
    Object.assign(q, aenderung);
    if (statusWechsel) zaehleQuellen();
    sperreBis = 0;
    zeichneInhalt();
    try {
      const r = await post('/api/quelle', { id, ...aenderung });
      const alt = r && r.vorher && typeof r.vorher === 'object' ? r.vorher : vorher;
      if (statusWechsel) {
        toast(`${QSTATUS_WORT[aenderung.status]}: ${String(q.titel || q.id).slice(0, 70)}`, async () => {
          const zurueck = {};
          for (const f of Object.keys(aenderung)) zurueck[f] = f in alt ? alt[f] : vorher[f];
          if (zurueck.status == null) zurueck.status = vorher.status;
          Object.assign(q, zurueck); zaehleQuellen(); hervorheben = 'q:' + q.id; zeichneInhalt();
          await post('/api/quelle', { id, ...zurueck });
        });
      }
    } catch (e) {
      Object.assign(q, vorher); zaehleQuellen(); zeichneInhalt(); toast(e.message);
    }
  }
  function zaehleQuellen() {
    const Q = S.quellen; if (!Q) return;
    const z = { vorschlag: 0, genommen: 0, spaeter: 0, verworfen: 0 };
    (Q.liste || []).forEach((q) => { if (q.herkunft !== 'bib' && z[q.status] != null) z[q.status]++; });
    Q.zaehler = Object.assign({}, Q.zaehler, z);
  }

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
        if (!r.ok) throw new Error(j.fehler || 'Upload fehlgeschlagen.');
        const b = bDatei(j.pfad);
        if (gewaehlt(b.key) < 0) ui.bausteine.push(b);
        ok++;
      } catch (e) { toast(`${f.name}: ${e.message}`); }
    }
    if (ok) {
      if (!ui.command) ui.command = '/quellen';
      merke(); zeichneKonfig();
      toast(`${ok} ${ok === 1 ? 'Datei' : 'Dateien'} im Eingang. Das Senden-Symbol lässt Claude sie einsortieren.`);
      holeStand();
    }
  }

  // ---------- Aktionen: Kapitel ----------
  async function setzeKapitelStatus(nr, status) {
    const k = (S.kapitel || []).find((x) => String(x.nr) === String(nr)); if (!k) return;
    const vorher = k.status;
    if (vorher === status) return;
    k.status = status; zeichneInhalt();
    const senden = async (s, alt) => {
      try { return await post('/api/kapitel/status', { nr, status: s }); }
      catch (e) {
        if (e.status === 404 && s === 'final' && alt === 'geprueft') return post('/api/kapitel/freigeben', { nr });
        throw e;
      }
    };
    try {
      const r = await senden(status, vorher);
      const alt = r?.vorher?.status || vorher;
      toast(status === 'final' ? `Kapitel ${nr} freigegeben.` : `Kapitel ${nr}: ${STATUS_NAME[status]}.`, async () => {
        k.status = alt; hervorheben = 'k:' + nr; zeichneInhalt();
        await post('/api/kapitel/status', { nr, status: alt });
        holeStand();
      });
      holeStand();
    } catch (e) { k.status = vorher; zeichneInhalt(); toast(e.message); }
  }
  function statusMenueHtml(nr) {
    const k = (S.kapitel || []).find((x) => String(x.nr) === String(nr));
    return KAPITEL_STATUS.map((s) => `<button type="button" role="menuitemradio" aria-checked="${k?.status === s}" data-a="k-status-setzen" data-nr="${h(nr)}" data-v="${s}">
      <span class="cmd glyph">${STATUS_GLYPH[s]}</span><span class="erkl">${STATUS_NAME[s]}</span></button>`).join('');
  }

  // ---------- Aktionen: Termine ----------
  function findeTermin(id) { return (S.termine || []).find((x) => x.id === id); }
  async function terminErledigt(id, wert, knopf) {
    const t = findeTermin(id); if (!t) return;
    const vorher = !!t.erledigt;
    if (knopf) { knopf.classList.toggle('an', wert); await warte(160); }
    await schrumpfe(knopf?.closest('li[data-zeile]'));
    t.erledigt = wert; sperreBis = 0; zeichneInhalt();
    try {
      await post('/api/termin/erledigt', { id, erledigt: wert });
      toast(`${wert ? 'Abgehakt' : 'Wieder offen'}: ${t.titel}`, async () => {
        t.erledigt = vorher; hervorheben = 't:' + id; zeichneInhalt();
        await post('/api/termin/erledigt', { id, erledigt: vorher });
        holeStand();
      });
      holeStand();
    } catch (e) { t.erledigt = vorher; zeichneInhalt(); toast(e.message); }
  }
  async function terminLoeschen(id, knopf) {
    const t = findeTermin(id); if (!t) return;
    await schrumpfe(knopf?.closest('li[data-zeile]'));
    const liste = S.termine; const pos = liste.indexOf(t);
    liste.splice(pos, 1); sperreBis = 0; zeichneInhalt();
    try {
      const r = await post('/api/termin/loeschen', { id });
      const voll = r?.termin || t;
      toast(`Gelöscht: ${t.titel}`, async () => {
        liste.splice(Math.min(pos, liste.length), 0, t); hervorheben = 't:' + id; zeichneInhalt();
        await post('/api/termin/wiederherstellen', { termin: voll });
        holeStand();
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
    try {
      await post('/api/pdf/bauen', {});
      toast('PDF wird gebaut. Das dauert meist unter einer Minute.');
    } catch (e) {
      S.pdfBau = Object.assign({}, S.pdfBau, { laeuft: false });
      aktualisierePdfStatus(); toast(e.message);
    }
  }
  function pdfBauFertig(d) {
    if (d.ok) {
      S.pdf = Object.assign({}, S.pdf, { vorhanden: true, geaendert: d.fertig || new Date().toISOString() });
      if (panel.art === 'arbeit') {
        const seite = pdfViewer?.aktuelle || 1;
        zeigePanel({ art: 'arbeit', seite }, true);
        toast('PDF aktualisiert.');
      } else {
        toast('PDF aktualisiert.', null, 6000);
      }
    } else {
      toast(`PDF nicht gebaut: ${d.meldung || 'unbekannter Fehler'}. In Claude hilft /pdf.`, null, 9000);
    }
    aktualisierePdfStatus();
  }

  // ---------- Leseansicht rechts (Panel) ----------
  const panel = { art: null, schluessel: null, daten: null, bearbeitet: null, neu: null, zurueckFokus: null };
  let pdfViewer = null;
  let pdfLib = null;

  function panelEl() {
    let el = $('#panel');
    if (el) return el;
    el = document.createElement('aside');
    el.id = 'panel';
    el.className = 'panel';
    el.hidden = true;
    el.setAttribute('aria-labelledby', 'panel-titel');
    el.innerHTML = `
      <div class="panel-kopf">
        <button type="button" class="icon panel-zurueck" data-a="panel-zu" aria-label="Zurück zur Liste" title="Zurück (Esc)">${icon('zurueck')}</button>
        <div class="panel-titel-box"><div id="panel-titel" class="panel-titel"></div><div class="panel-meta"></div></div>
        <div class="panel-aktionen"></div>
        <button type="button" class="icon panel-x" data-a="panel-zu" aria-label="Leseansicht schließen" title="Schließen (Esc)">${icon('x')}</button>
      </div>
      <div class="panel-hinweis" role="status" hidden></div>
      <div class="panel-leiste" hidden></div>
      <div class="panel-inhalt" tabindex="-1"></div>`;
    document.body.appendChild(el);
    return el;
  }
  const panelInhalt = () => $('#panel .panel-inhalt');

  function parseHash() {
    const roh = String(location.hash || '').replace(/^#/, '');
    if (!roh) return null;
    const teile = roh.split('/');
    const art = teile[0];
    const rest = teile.slice(1);
    const nimm = (re) => { const i = rest.findIndex((x) => re.test(x)); if (i < 0) return null; const v = rest.splice(i, 1)[0]; return Number(v.slice(1)); };
    if (art === 'kapitel' && rest.length) {
      const slug = rest.shift(); const absatz = nimm(/^a\d+$/);
      const k = (S.kapitel || []).find((x) => kapSlug(x.nr) === slug);
      return { art: 'text', datei: k?.datei || null, kapitelNr: k?.nr || slug, titel: k ? `${k.nr} ${k.titel || ''}`.trim() : `Kapitel ${slug}`, absatz };
    }
    if (art === 'text' && rest.length) {
      let datei = ''; try { datei = decodeURIComponent(rest.shift()); } catch {}
      const absatz = nimm(/^a\d+$/);
      return { art: 'text', datei, titel: dateiName(datei), absatz };
    }
    if (art === 'quelle' && rest.length) {
      let id = ''; try { id = decodeURIComponent(rest.shift()); } catch {}
      return { art: 'quelle', id, seite: nimm(/^s\d+$/) };
    }
    if (art === 'arbeit') return { art: 'arbeit', seite: nimm(/^s\d+$/) };
    if (art === 'skill' && rest.length) { let name = ''; try { name = decodeURIComponent(rest.shift()); } catch {} return { art: 'skill', name }; }
    return null;
  }
  const routeSchluessel = (r) => r.art === 'text' ? 'text:' + r.datei : r.art === 'quelle' ? 'quelle:' + r.id : r.art === 'skill' ? 'skill:' + r.name : r.art;

  function route() {
    const r = parseHash();
    if (!r) { if (panel.art) schliessePanel(false); return; }
    zeigePanel(r);
  }

  function oeffnePanel(hash) {
    if (location.hash === hash) route(); else location.hash = hash;
  }

  function panelAuf() {
    const el = panelEl();
    if (!el.hidden && el.classList.contains('an')) return;
    panel.zurueckFokus = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    const a = ankerMerken();
    el.hidden = false;
    document.body.classList.add('panel-auf');
    ankerWieder(a);
    requestAnimationFrame(() => el.classList.add('an'));
  }

  function schliessePanel(hashLeeren = true) {
    const el = $('#panel'); if (!el || el.hidden) { panel.art = null; return; }
    if (panel.bearbeitet != null && !confirm('Deine Korrektur ist noch nicht gespeichert. Trotzdem schließen?')) {
      if (!hashLeeren) history.replaceState(null, '', '#' + (location.hash.replace(/^#/, '') || routeHashAktuell()));
      return;
    }
    stoppePdf();
    panel.art = null; panel.schluessel = null; panel.daten = null; panel.bearbeitet = null; panel.neu = null;
    const a = ankerMerken();
    el.classList.remove('an');
    document.body.classList.remove('panel-auf');
    ankerWieder(a);
    versteckeAuswahlLeiste();
    setTimeout(() => { if (!panel.art) { el.hidden = true; panelInhalt().innerHTML = ''; } }, reduziert() ? 0 : 180);
    if (hashLeeren && location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (panel.zurueckFokus && document.contains(panel.zurueckFokus)) panel.zurueckFokus.focus({ preventScroll: true });
    else $('#inhalt').focus({ preventScroll: true });
  }
  function routeHashAktuell() { return ''; }

  function setzePanelKopf(titel, meta, aktionen) {
    const el = panelEl();
    $('.panel-titel', el).textContent = titel || '';
    $('.panel-meta', el).innerHTML = meta || '';
    $('.panel-aktionen', el).innerHTML = aktionen || '';
    sperreSchreibknoepfe(el);
  }
  function zeigePanelHinweis(text, knopf) {
    const b = $('#panel .panel-hinweis'); if (!b) return;
    if (!text) { b.hidden = true; b.innerHTML = ''; return; }
    b.innerHTML = `<span>${h(text)}</span>${knopf ? `<button type="button" class="knopf klein" data-a="panel-neu-laden">${h(knopf)}</button>` : ''}`;
    b.hidden = false;
  }

  async function zeigePanel(r, erzwingen = false) {
    const schluessel = routeSchluessel(r);
    if (!erzwingen && panel.art && panel.schluessel === schluessel) {
      // gleiche Ansicht: nur springen
      if (r.art === 'text' && r.absatz != null) springeZuAbsatz(r.absatz);
      if ((r.art === 'quelle' || r.art === 'arbeit') && r.seite && pdfViewer) pdfViewer.springe(r.seite);
      return;
    }
    if (panel.art && panel.bearbeitet != null && !erzwingen) {
      if (!confirm('Deine Korrektur ist noch nicht gespeichert. Trotzdem wechseln?')) return;
    }
    stoppePdf();
    panel.art = r.art; panel.schluessel = schluessel; panel.daten = null; panel.bearbeitet = null; panel.neu = null;
    panelAuf();
    zeigePanelHinweis('');
    $('#panel .panel-leiste').hidden = true;
    panelInhalt().innerHTML = '<p class="panel-laden">Lädt …</p>';
    panelInhalt().scrollTop = 0;
    try {
      if (r.art === 'text') await panelText(r);
      else if (r.art === 'quelle') await panelQuelle(r);
      else if (r.art === 'arbeit') await panelArbeit(r);
      else if (r.art === 'skill') await panelSkill(r);
    } catch (e) {
      if (panel.schluessel !== schluessel) return;
      panelInhalt().innerHTML = `<div class="panel-fehler"><p>${h(e.code === 'offline' ? NICHT_ERREICHBAR : e.message || 'Konnte nicht geladen werden.')}</p>
        <button type="button" class="knopf klein" data-a="panel-neu-laden">Erneut versuchen</button></div>`;
    }
    if (!erzwingen) panelInhalt().focus({ preventScroll: true });
  }

  // --- Kapitel und andere Texte ---
  function sauber(html) {
    const t = document.createElement('template');
    t.innerHTML = String(html || '');
    const ERLAUBT = new Set(['EM', 'STRONG', 'B', 'I', 'SPAN', 'CODE', 'BR', 'SUB', 'SUP', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'DEL', 'MARK', 'S', 'PRE']);
    const gehe = (knoten) => {
      [...knoten.childNodes].forEach((k) => {
        if (k.nodeType === 1) {
          if (!ERLAUBT.has(k.tagName)) { k.replaceWith(document.createTextNode(k.textContent)); return; }
          [...k.attributes].forEach((a) => {
            if (a.name === 'class') { k.setAttribute('class', a.value.split(/\s+/).filter((c) => /^(zit|fehlt|formel)$/.test(c)).join(' ')); }
            else if (a.name !== 'data-key' && a.name !== 'title') k.removeAttribute(a.name);
          });
          gehe(k);
        } else if (k.nodeType !== 3) k.remove();
      });
    };
    gehe(t.content);
    return t.innerHTML;
  }
  function zitatTitel(key) {
    const q = (S.quellen?.liste || []).find((x) => x.bibkey === key);
    if (!q) return null;
    return `${[autorKurz(q), q.jahr].filter(Boolean).join(' ')}: ${q.titel || ''} [${key}]`;
  }
  function absatzZeile(d, idx) {
    const a = d.absaetze[idx];
    if (a && Number.isFinite(Number(a.zeile))) return Number(a.zeile);
    // Näherung: Frontmatter plus Zeilen der vorigen Absätze, getrennt durch je eine Leerzeile
    const fm = !d.frontmatter ? 0 : typeof d.frontmatter === 'string' ? d.frontmatter.split('\n').length + 3
      : Object.keys(d.frontmatter).length ? Object.keys(d.frontmatter).length + 3 : 0;
    let z = fm + 1;
    for (let i = 0; i < idx; i++) z += String(d.absaetze[i].text || '').split('\n').length + 1;
    return z;
  }
  function aenderungsZeit(datei, i) {
    if (typeof datei !== 'string') return '';
    const e = (S.aenderungen || []).find((x) => x.datei === datei && (x.absaetze || []).map(zahlWert).includes(zahlWert(i)));
    return e ? e.zeit : '';
  }
  function absatzHtml(a, datei) {
    const g = a.geaendert;
    const zeit = typeof g === 'string' && !isNaN(new Date(g)) ? g : g ? aenderungsZeit(datei || panel.daten?.datei, a.i) : '';
    return `<div class="absatz${g ? ' geaendert' : ''}" data-i="${zahlWert(a.i)}" data-hash="${h(a.hash)}" tabindex="0" aria-label="Absatz ${zahlWert(a.i) + 1}${g ? ', zuletzt geändert' : ''}. Enter für Aktionen">
      ${g ? `<span class="geaendert-zeit mono"${zeit ? ` data-zeit="${h(zeit)}"` : ''}>${h(zeit ? relZeit(zeit) : 'geändert')}</span>` : ''}
      <div class="absatz-text">${sauber(a.html)}</div>
    </div>`;
  }
  function beschrifteZitate(wurzel) {
    $$('.zit', wurzel).forEach((z) => {
      const key = z.dataset.key || '';
      if (z.classList.contains('fehlt')) { z.title = `Schlüssel „${key}“ fehlt in literatur.bib`; return; }
      const t = zitatTitel(key);
      if (t) z.title = t; else if (!z.title) z.title = key;
    });
  }

  async function panelText(r) {
    if (!r.datei) throw new Error('Diesen Text gibt es nicht (mehr).');
    if (!LIVE) {
      setzePanelKopf(r.titel, '', '');
      panelInhalt().innerHTML = `<div class="panel-fehler"><p>Die Leseansicht gibt es nur live.</p><a class="knopf klein" href="${h(vscodeLink(r.datei))}">${icon('code')} In VS Code öffnen</a></div>`;
      return;
    }
    const k = findeKapitelZuDatei(r.datei);
    const aktionen = `${k ? `<button type="button" class="icon" data-a="panel-kapitel-claude" title="Kapitel in den Auftrag" aria-label="Kapitel ${h(k.nr)} in den Auftrag übernehmen">${icon('claude')}</button>` : ''}
      <a class="icon" href="${h(vscodeLink(r.datei))}" title="In VS Code öffnen" aria-label="In VS Code öffnen">${icon('code')}</a>`;
    setzePanelKopf(r.titel, `<span class="mono">${h(r.datei)}</span>`, aktionen);
    const schluessel = panel.schluessel;
    const d = await holeJson('/api/text?datei=' + encodeURIComponent(r.datei));
    if (panel.schluessel !== schluessel) return;
    panel.daten = d;
    const titel = k ? `${k.nr} ${k.titel || d.titel || ''}`.trim() : (d.titel || r.titel);
    setzePanelKopf(titel, panelTextMeta(d, k), aktionen);
    zeichneText();
    if (r.absatz != null) springeZuAbsatz(r.absatz);
    else { const erste = $('.absatz.geaendert', panelInhalt()); if (erste) erste.scrollIntoView({ block: 'center' }); }
  }
  function panelTextMeta(d, k) {
    const teile = [];
    if (k) teile.push(`${STATUS_GLYPH[k.status] || '○'} ${STATUS_NAME[k.status] || k.status}`);
    teile.push(`${zahl(d.woerter)} Wörter`);
    const geaendert = (d.absaetze || []).filter((a) => a.geaendert).length;
    if (geaendert) teile.push(`<span class="warm-text">${geaendert} ${geaendert === 1 ? 'Absatz' : 'Absätze'} zuletzt geändert</span>`);
    const fehlen = Array.isArray(d.zitate_fehlen) ? d.zitate_fehlen.length : 0;
    if (fehlen) teile.push(`<span class="rot-linie" title="${h(d.zitate_fehlen.join(', '))}">${fehlen} ${fehlen === 1 ? 'Zitierschlüssel fehlt' : 'Zitierschlüssel fehlen'}</span>`);
    return `<span class="mono">${teile.join(' · ')}</span>`;
  }
  function zeichneText() {
    const d = panel.daten; if (!d) return;
    const box = panelInhalt();
    box.innerHTML = `<article class="lesetext">${(d.absaetze || []).map((x) => absatzHtml(x, d.datei)).join('') || '<p class="leer">Die Datei ist noch leer.</p>'}</article>`;
    beschrifteZitate(box);
  }
  function springeZuAbsatz(i) {
    const el = $(`.absatz[data-i="${zahlWert(i)}"]`, panelInhalt());
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: reduziert() ? 'auto' : 'smooth' });
    el.classList.remove('blitz'); void el.offsetWidth; el.classList.add('blitz');
  }
  function schliesseAbsatzAktionen() { $$('#panel .absatz-aktionen').forEach((x) => x.remove()); $$('#panel .absatz.aktiv').forEach((x) => x.classList.remove('aktiv')); }
  function zeigeAbsatzAktionen(el) {
    const war = el.classList.contains('aktiv');
    schliesseAbsatzAktionen();
    if (war) return;
    const d = panel.daten; const i = zahlWert(el.dataset.i);
    const idx = d.absaetze.findIndex((a) => zahlWert(a.i) === i);
    const zeile = absatzZeile(d, idx);
    el.classList.add('aktiv');
    const leiste = document.createElement('div');
    leiste.className = 'absatz-aktionen';
    leiste.innerHTML = `<span class="mono blass">Absatz ${i + 1} · Zeile ${zeile}</span>
      <span class="luecke"></span>
      <button type="button" class="knopf klein schreibt" data-a="absatz-korrigieren" data-i="${i}">${icon('stift')} Korrigieren</button>
      <button type="button" class="icon" data-a="absatz-claude" data-i="${i}" title="An Claude: Absatz in den Auftrag" aria-label="Absatz ${i + 1} an Claude">${icon('claude')}</button>
      <a class="icon" href="${h(vscodeLink(d.datei, zeile))}" title="In VS Code an dieser Stelle öffnen" aria-label="Absatz ${i + 1} in VS Code öffnen">${icon('code')}</a>`;
    el.after(leiste);
    sperreSchreibknoepfe(leiste);
  }
  function korrigieren(i) {
    const d = panel.daten; const a = d.absaetze.find((x) => zahlWert(x.i) === i); if (!a) return;
    const el = $(`.absatz[data-i="${i}"]`, panelInhalt()); if (!el) return;
    schliesseAbsatzAktionen();
    panel.bearbeitet = i;
    el.classList.add('bearbeiten');
    el.innerHTML = `<textarea class="korrektur" aria-label="Absatz ${i + 1} korrigieren">${h(a.text)}</textarea>
      <div class="korrektur-leiste"><span class="mono blass">Strg+Enter speichert · Esc bricht ab</span><span class="luecke"></span>
      <button type="button" class="knopf klein still" data-a="absatz-abbrechen" data-i="${i}">Abbrechen</button>
      <button type="button" class="knopf klein haupt schreibt" data-a="absatz-speichern" data-i="${i}">Speichern</button></div>
      <div class="korrektur-meldung" role="alert"></div>`;
    const ta = $('textarea', el);
    const hoehe = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; };
    ta.addEventListener('input', hoehe);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); absatzSpeichern(i); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); absatzAbbrechen(i); }
    });
    hoehe(); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    sperreSchreibknoepfe(el);
  }
  function ersetzeAbsatzEl(a) {
    const el = $(`.absatz[data-i="${zahlWert(a.i)}"]`, panelInhalt()); if (!el) return null;
    const t = document.createElement('template'); t.innerHTML = absatzHtml(a).trim();
    const neu = t.content.firstElementChild; el.replaceWith(neu); beschrifteZitate(neu);
    return neu;
  }
  function absatzAbbrechen(i) {
    const a = panel.daten?.absaetze.find((x) => zahlWert(x.i) === i);
    panel.bearbeitet = null;
    if (a) { const el = ersetzeAbsatzEl(a); el?.focus({ preventScroll: true }); }
    if (panel.neu) zeigePanelHinweis('Der Text wurde inzwischen geändert.', 'Neu laden');
  }
  async function absatzSpeichern(i) {
    const d = panel.daten; const a = d.absaetze.find((x) => zahlWert(x.i) === i); if (!a) return;
    const el = $(`.absatz[data-i="${i}"]`, panelInhalt()); const ta = $('textarea', el);
    const text = ta.value;
    if (text === a.text) { absatzAbbrechen(i); return; }
    const knopf = $('[data-a="absatz-speichern"]', el); if (knopf) knopf.disabled = true;
    const alt = { text: a.text };
    try {
      const r = await put('/api/text', { datei: d.datei, i, hash: a.hash, version: d.version, text });
      if (r.vorher && typeof r.vorher.text === 'string') alt.text = r.vorher.text;
      panel.bearbeitet = null;
      const neuerHash = r.absatz?.hash;
      if (!r.absatz || (r.absaetze_anzahl != null && Number(r.absaetze_anzahl) !== d.absaetze.length)) {
        await textNeuLaden(); springeZuAbsatz(i);
      } else {
        Object.assign(a, r.absatz, { geaendert: true }); if (r.version) d.version = r.version;
        ersetzeAbsatzEl(a)?.focus({ preventScroll: true });
      }
      toast(`Absatz ${i + 1} gespeichert.`, async () => {
        const r2 = await put('/api/text', { datei: d.datei, i, hash: neuerHash, text: alt.text });
        if (panel.art === 'text' && panel.daten?.datei === d.datei) {
          const b = panel.daten.absaetze.find((x) => zahlWert(x.i) === i);
          if (b && r2.absatz && (r2.absaetze_anzahl == null || Number(r2.absaetze_anzahl) === panel.daten.absaetze.length)) {
            Object.assign(b, r2.absatz); if (r2.version) panel.daten.version = r2.version; ersetzeAbsatzEl(b);
          } else await textNeuLaden();
        }
      });
    } catch (e) {
      if (knopf) knopf.disabled = false;
      const m = $('.korrektur-meldung', el);
      if (e.code === 'konflikt') {
        m.innerHTML = `Claude hat den Absatz gerade geändert. Dein Text bleibt hier stehen. <button type="button" class="knopf klein" data-a="absatz-konflikt" data-i="${i}">Neue Fassung laden</button>`;
      } else m.textContent = e.message;
    }
  }
  async function absatzKonflikt(i) {
    const el = $(`.absatz[data-i="${i}"]`, panelInhalt());
    const entwurf = $('textarea', el)?.value || '';
    const ok = entwurf ? await kopiereText(entwurf) : false;
    panel.bearbeitet = null;
    await textNeuLaden();
    toast(ok ? 'Neue Fassung geladen. Dein Entwurf liegt in der Zwischenablage.' : 'Neue Fassung geladen.', null, 7000);
    springeZuAbsatz(i);
  }
  async function textNeuLaden() {
    if (panel.art !== 'text' || !panel.daten) return;
    const box = panelInhalt(); const y = box.scrollTop;
    const d = panel.neu || await holeJson('/api/text?datei=' + encodeURIComponent(panel.daten.datei));
    panel.daten = d; panel.neu = null;
    zeigePanelHinweis('');
    zeichneText();
    box.scrollTop = y;
    const k = findeKapitelZuDatei(d.datei);
    $('#panel .panel-meta').innerHTML = panelTextMeta(d, k);
  }
  function auswahlImPanel() {
    const sel = window.getSelection && window.getSelection();
    return !!(sel && !sel.isCollapsed && sel.anchorNode && $('#panel')?.contains(sel.anchorNode));
  }
  async function panelLiveUpdate() {
    if (panel.art !== 'text' || !panel.daten) return;
    const schluessel = panel.schluessel;
    let d; try { d = await holeJson('/api/text?datei=' + encodeURIComponent(panel.daten.datei)); } catch { return; }
    if (panel.schluessel !== schluessel || !panel.daten || d.version === panel.daten.version) return;
    const alt = panel.daten.absaetze || [];
    const neu = d.absaetze || [];
    const aktivI = $('#panel .absatz.aktiv')?.dataset.i;
    const geaendert = neu.filter((a, idx) => !alt[idx] || alt[idx].hash !== a.hash || !!alt[idx].geaendert !== !!a.geaendert);
    const beruehrtAktiv = geaendert.some((a) => String(a.i) === aktivI);
    if (panel.bearbeitet != null || auswahlImPanel() || neu.length !== alt.length || beruehrtAktiv) {
      panel.neu = d;
      zeigePanelHinweis('Der Text wurde geändert.', 'Neu laden');
      return;
    }
    // Still aktualisieren: nur geänderte Absätze austauschen, Leseposition halten
    const box = panelInhalt();
    const anker = [...box.querySelectorAll('.absatz')].find((x) => x.getBoundingClientRect().bottom > box.getBoundingClientRect().top + 8);
    const vorher = anker ? anker.getBoundingClientRect().top : 0;
    panel.daten = d;
    geaendert.forEach((a) => ersetzeAbsatzEl(a));
    if (anker) {
      const nachher = $(`.absatz[data-i="${anker.dataset.i}"]`, box);
      if (nachher) box.scrollTop += nachher.getBoundingClientRect().top - vorher;
    }
    $('#panel .panel-meta').innerHTML = panelTextMeta(d, findeKapitelZuDatei(d.datei));
  }

  // --- Quellen und PDFs ---
  async function panelQuelle(r) {
    const q = findeQuelle(r.id) || (S.quellen?.liste || []).find((x) => x.bibkey === r.id);
    if (!q) throw new Error('Diese Quelle gibt es nicht (mehr).');
    const meta = `<span class="mono">${h([autorKurz(q), q.jahr, q.bibkey].filter(Boolean).join(' · '))}</span>`;
    const extern = sichereUrl(q.doi ? 'https://doi.org/' + encodeURI(String(q.doi)) : q.url);
    const aktionen = `<button type="button" class="icon" data-a="panel-quelle-claude" data-id="${h(q.id)}" title="Quelle in den Auftrag" aria-label="Quelle in den Auftrag übernehmen">${icon('claude')}</button>
      ${extern ? `<a class="icon" href="${h(extern)}" target="_blank" rel="noopener" title="Beim Verlag öffnen" aria-label="Beim Verlag öffnen">${icon('oeffnen')}</a>` : ''}`;
    setzePanelKopf(q.titel || q.id, meta, aktionen);
    if (!(PDF_ANSICHT && q.pdf_vorhanden && q.pdf)) {
      panelInhalt().innerHTML = `<div class="quelle-info">
        ${q.kurz ? `<p>${h(q.kurz)}</p>` : ''}
        ${q.warum ? `<p class="grau"><span class="mono blass">Warum</span> ${h(q.warum)}</p>` : ''}
        <p class="grau">Für diese Quelle liegt kein PDF im Projekt.${q.open_access ? ' Sie ist frei verfügbar, Claude kann sie mit /quellen laden.' : ''}</p>
        <div class="reihe">
          ${extern ? `<a class="knopf" href="${h(extern)}" target="_blank" rel="noopener">${icon('oeffnen')} Beim Verlag öffnen</a>` : ''}
          <button type="button" class="knopf still" data-a="auftrag" data-cmd="/quellen" data-text="Bitte besorge das PDF für ${h(q.bibkey || q.doi || q.id)}.">${icon('claude')} PDF besorgen lassen</button>
        </div></div>`;
      return;
    }
    await oeffnePdf({ url: '/datei/' + String(q.pdf).split('/').map(encodeURIComponent).join('/'), quelle: q, seite: r.seite, hashBasis: quelleHash(q) });
  }
  async function panelArbeit(r) {
    const aktionen = `<button type="button" class="knopf klein schreibt${S.pdfBau?.laeuft ? ' laeuft' : ''}" data-a="pdf-bauen" title="Entwurfs-PDF neu bauen">${icon('neu')} PDF aktualisieren</button>`;
    setzePanelKopf('Arbeit.pdf', pdfStatusHtml(), aktionen);
    if (!S.pdf?.vorhanden) {
      panelInhalt().innerHTML = '<div class="quelle-info"><p class="grau">Noch kein PDF gebaut. „PDF aktualisieren“ baut einen Entwurf aus allen Kapiteln.</p></div>';
      return;
    }
    const datei = /^Arbeit(-neu)?\.pdf$/.test(String(S.pdfBau?.datei || '')) ? S.pdfBau.datei : 'Arbeit.pdf';
    await oeffnePdf({ url: `/datei/${datei}?v=${encodeURIComponent(S.pdf.geaendert || S.pdfBau?.fertig || Date.now())}`, quelle: null, seite: r.seite, hashBasis: '#arbeit' });
  }

  async function ladePdfJs() {
    if (pdfLib) return pdfLib;
    const basis = MODUS.vendor || '/vendor/';
    pdfLib = await import(basis + 'pdfjs/pdf.min.mjs');
    pdfLib.GlobalWorkerOptions.workerSrc = basis + 'pdfjs/pdf.worker.min.mjs';
    return pdfLib;
  }
  function stoppePdf() {
    if (!pdfViewer) return;
    try { pdfViewer.beobachter?.disconnect(); } catch {}
    try { pdfViewer.doc?.destroy(); } catch {}
    try { pdfViewer.task?.destroy(); } catch {}
    pdfViewer = null;
    versteckeAuswahlLeiste();
  }

  async function oeffnePdf({ url, quelle, seite, hashBasis }) {
    const schluessel = panel.schluessel;
    const lib = await ladePdfJs();
    if (panel.schluessel !== schluessel) return;
    const leiste = $('#panel .panel-leiste');
    leiste.innerHTML = `
      <label class="seite-wahl"><span class="unsichtbar">Seite</span><input type="number" min="1" value="${zahlWert(seite) || 1}" id="pdf-seite" inputmode="numeric" aria-label="Seite"> <span class="mono blass" id="pdf-seiten">/ …</span></label>
      <span class="luecke"></span>
      <button type="button" class="icon" data-a="pdf-zoom" data-v="-1" title="Kleiner" aria-label="Verkleinern">${icon('minus')}</button>
      <span class="mono blass" id="pdf-zoom">100 %</span>
      <button type="button" class="icon" data-a="pdf-zoom" data-v="1" title="Größer" aria-label="Vergrößern">${icon('plus')}</button>
      <button type="button" class="icon" data-a="pdf-breite" title="An Breite anpassen" aria-label="An Breite anpassen" aria-pressed="true">${icon('breite')}</button>`;
    leiste.hidden = false;
    const box = panelInhalt();
    box.innerHTML = '<div class="pdf-seiten" id="pdf-seiten-box"></div>';
    const task = lib.getDocument({ url, isEvalSupported: false, enableXfa: false });
    const v = { task, doc: null, quelle, hashBasis, scale: 1, modus: 'breite', aktuelle: zahlWert(seite) || 1, boxen: [], gerendert: new Map(), groessen: [] };
    pdfViewer = v;
    let doc;
    try { doc = await task.promise; }
    catch (e) { if (pdfViewer === v) throw new Error('Das PDF lässt sich nicht öffnen. ' + (e?.message || '')); return; }
    if (pdfViewer !== v) { try { doc.destroy(); } catch {} return; }
    v.doc = doc;
    const erste = await doc.getPage(1);
    const vp1 = erste.getViewport({ scale: 1 });
    v.basis = { w: vp1.width, h: vp1.height };
    $('#pdf-seiten').textContent = `/ ${doc.numPages}`;
    $('#pdf-seite').max = doc.numPages;
    v.springe = (n) => pdfSpringe(v, n, true);
    pdfLayout(v);
    pdfSpringe(v, v.aktuelle, false);
    box.addEventListener('scroll', () => pdfScroll(v), { passive: true });
  }
  function pdfScale(v) {
    if (v.modus !== 'breite') return v.scale;
    const breite = panelInhalt().clientWidth - 32;
    return Math.max(0.4, Math.min(3, breite / v.basis.w));
  }
  function pdfLayout(v) {
    v.scale = pdfScale(v);
    const box = $('#pdf-seiten-box'); if (!box) return;
    try { v.beobachter?.disconnect(); } catch {}
    v.gerendert.clear();
    box.innerHTML = '';
    v.boxen = [];
    for (let n = 1; n <= v.doc.numPages; n++) {
      const g = v.groessen[n - 1] || v.basis;
      const s = document.createElement('div');
      s.className = 'pdf-seite';
      s.dataset.nr = n;
      s.style.width = Math.floor(g.w * v.scale) + 'px';
      s.style.height = Math.floor(g.h * v.scale) + 'px';
      s.style.setProperty('--scale-factor', v.scale);
      s.style.setProperty('--total-scale-factor', v.scale);
      s.innerHTML = `<span class="pdf-nr mono">${n}</span>`;
      box.appendChild(s);
      v.boxen.push(s);
    }
    v.beobachter = new IntersectionObserver((eintraege) => {
      eintraege.forEach((e) => { if (e.isIntersecting) pdfRender(v, Number(e.target.dataset.nr)); });
    }, { root: panelInhalt(), rootMargin: '600px 0px' });
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
      const text = document.createElement('div');
      text.className = 'textLayer';
      s.style.width = Math.floor(vp.width) + 'px';
      s.style.height = Math.floor(vp.height) + 'px';
      s.replaceChildren(canvas, text);
      const tl = new pdfLib.TextLayer({ textContentSource: page.streamTextContent(), container: text, viewport: vp });
      await tl.render();
      v.gerendert.set(nr, 'fertig');
    } catch (e) {
      if (e && e.name === 'RenderingCancelledException') return;
      v.gerendert.delete(nr);
    }
  }
  function pdfSpringe(v, n, weich) {
    const nr = Math.max(1, Math.min(v.doc?.numPages || 1, zahlWert(n) || 1));
    const s = v.boxen[nr - 1]; if (!s) return;
    const box = panelInhalt();
    box.scrollTo({ top: s.offsetTop - 12, behavior: weich && !reduziert() ? 'smooth' : 'auto' });
    v.aktuelle = nr;
    const eingabe = $('#pdf-seite'); if (eingabe && document.activeElement !== eingabe) eingabe.value = nr;
  }
  let pdfScrollRaf = 0;
  function pdfScroll(v) {
    if (pdfScrollRaf) return;
    pdfScrollRaf = requestAnimationFrame(() => {
      pdfScrollRaf = 0;
      if (pdfViewer !== v) return;
      const box = panelInhalt();
      const mitte = box.scrollTop + box.clientHeight / 3;
      let nr = 1;
      for (const s of v.boxen) { if (s.offsetTop <= mitte) nr = Number(s.dataset.nr); else break; }
      if (nr !== v.aktuelle) {
        v.aktuelle = nr;
        const eingabe = $('#pdf-seite'); if (eingabe && document.activeElement !== eingabe) eingabe.value = nr;
        history.replaceState(null, '', `${v.hashBasis}${nr > 1 ? '/s' + nr : ''}`);
      }
      versteckeAuswahlLeiste();
    });
  }
  function pdfZoom(v, richtung, modus) {
    if (!v?.doc) return;
    const seite = v.aktuelle;
    const s = v.boxen[seite - 1]; const box = panelInhalt();
    const anteil = s ? (box.scrollTop - s.offsetTop) / Math.max(1, s.offsetHeight) : 0;
    if (modus === 'breite') v.modus = 'breite';
    else { v.modus = 'frei'; v.scale = Math.max(0.4, Math.min(4, v.scale * (richtung > 0 ? 1.2 : 1 / 1.2))); }
    pdfLayout(v);
    const neu = v.boxen[seite - 1];
    if (neu) box.scrollTop = neu.offsetTop + anteil * neu.offsetHeight;
  }

  // Auswahl im PDF: als Zitat übernehmen oder an Claude
  function auswahlLeisteEl() {
    let el = $('#auswahl-leiste');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'auswahl-leiste';
    el.className = 'auswahl-leiste';
    el.hidden = true;
    panelEl().appendChild(el);
    return el;
  }
  function versteckeAuswahlLeiste() { const el = $('#auswahl-leiste'); if (el) el.hidden = true; }
  function pruefeAuswahl() {
    if (!pdfViewer) return;
    const sel = window.getSelection();
    const text = sel ? sel.toString().replace(/\s+/g, ' ').trim() : '';
    const knoten = sel && sel.anchorNode;
    const seiteEl = knoten && (knoten.nodeType === 1 ? knoten : knoten.parentElement)?.closest('.pdf-seite');
    if (!text || !seiteEl || !$('#panel').contains(seiteEl)) { versteckeAuswahlLeiste(); return; }
    const seite = Number(seiteEl.dataset.nr);
    const el = auswahlLeisteEl();
    const q = pdfViewer.quelle;
    el.innerHTML = `${q && q.bibkey ? `<button type="button" class="knopf klein schreibt" data-a="zitat-uebernehmen">${icon('zitat')} Als Zitat übernehmen</button>` : ''}
      <button type="button" class="icon" data-a="auswahl-claude" title="An Claude: Textstelle in den Auftrag" aria-label="Textstelle an Claude">${icon('claude')}</button>`;
    el.dataset.seite = seite;
    el.dataset.text = text.slice(0, 4000);
    sperreSchreibknoepfe(el);
    el.hidden = false;
    const r = sel.getRangeAt(0).getBoundingClientRect();
    const p = $('#panel').getBoundingClientRect();
    const breite = el.offsetWidth || 220;
    const links = Math.max(8, Math.min(p.width - breite - 8, r.left - p.left + r.width / 2 - breite / 2));
    const oben = r.top - p.top - el.offsetHeight - 8 > 64 ? r.top - p.top - el.offsetHeight - 8 : r.bottom - p.top + 8;
    el.style.left = links + 'px';
    el.style.top = oben + 'px';
  }

  // --- Skills ---
  function md(text) {
    const zeilen = String(text || '').replace(/\r\n?/g, '\n').replace(/^---\n[\s\S]*?\n---\n?/, '').split('\n');
    const inline = (s) => h(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => {
        const url = sichereUrl(u.replace(/&amp;/g, '&'));
        return url ? `<a href="${h(url)}" target="_blank" rel="noopener">${t}</a>` : `<span class="link-lokal" title="${u}">${t}</span>`;
      });
    const aus = []; let liste = null; let absatz = []; let code = null;
    const fertigAbsatz = () => { if (absatz.length) { aus.push(`<p>${inline(absatz.join(' '))}</p>`); absatz = []; } };
    const fertigListe = () => { if (liste) { aus.push(`<${liste.typ}>${liste.punkte.map((p) => `<li>${inline(p)}</li>`).join('')}</${liste.typ}>`); liste = null; } };
    for (const z of zeilen) {
      if (code !== null) {
        if (/^```/.test(z)) { aus.push(`<pre><code>${h(code.join('\n'))}</code></pre>`); code = null; } else code.push(z);
        continue;
      }
      if (/^```/.test(z)) { fertigAbsatz(); fertigListe(); code = []; continue; }
      const ueber = z.match(/^(#{1,6})\s+(.*)$/);
      if (ueber) { fertigAbsatz(); fertigListe(); const n = Math.min(4, ueber[1].length + 1); aus.push(`<h${n}>${inline(ueber[2])}</h${n}>`); continue; }
      const punkt = z.match(/^\s*([-*]|\d+\.)\s+(.*)$/);
      if (punkt) {
        fertigAbsatz();
        const typ = /\d/.test(punkt[1]) ? 'ol' : 'ul';
        if (!liste || liste.typ !== typ) { fertigListe(); liste = { typ, punkte: [] }; }
        liste.punkte.push(punkt[2]); continue;
      }
      if (/^\s*>\s?/.test(z)) { fertigAbsatz(); fertigListe(); aus.push(`<blockquote>${inline(z.replace(/^\s*>\s?/, ''))}</blockquote>`); continue; }
      if (/^\s*\|/.test(z)) { fertigAbsatz(); fertigListe(); if (!/^\s*\|[\s:|-]+\|\s*$/.test(z)) aus.push(`<div class="tabellenzeile">${z.split('|').slice(1, -1).map((c) => `<span>${inline(c.trim())}</span>`).join('')}</div>`); continue; }
      if (!z.trim()) { fertigAbsatz(); fertigListe(); continue; }
      if (liste && /^\s{2,}/.test(z)) { liste.punkte[liste.punkte.length - 1] += ' ' + z.trim(); continue; }
      fertigListe(); absatz.push(z.trim());
    }
    if (code !== null) aus.push(`<pre><code>${h(code.join('\n'))}</code></pre>`);
    fertigAbsatz(); fertigListe();
    return aus.join('\n');
  }
  async function panelSkill(r) {
    const s = skills().find((x) => x.name === r.name) || { name: r.name, kurz: '' };
    const aktionen = `<button type="button" class="icon" data-a="auftrag" data-cmd="/${h(s.name)}" title="/${h(s.name)} in den Auftrag" aria-label="/${h(s.name)} in den Auftrag übernehmen">${icon('claude')}</button>
      <button type="button" class="icon" data-a="skill-aendern" data-v="${h(s.name)}" title="Mit Claude ändern" aria-label="Skill mit Claude ändern">${icon('stift')}</button>`;
    const meta = `<span class="mono">/${h(s.name)}${s.auto ? ' · Claude nutzt ihn auch selbst' : ''}${s.eigen ? ' · eigener Skill' : ''}</span>`;
    setzePanelKopf(`/${s.name}`, meta, aktionen);
    if (!LIVE) {
      panelInhalt().innerHTML = `<div class="lesetext md"><p>${h(anzeige(s.kurz))}</p>${s.lang ? `<p>${h(s.lang)}</p>` : ''}<p class="grau">Den vollständigen Inhalt zeigt die Live-Ansicht.</p></div>`;
      return;
    }
    const schluessel = panel.schluessel;
    const d = await holeJson('/api/skill?name=' + encodeURIComponent(s.ordner || r.name));
    if (panel.schluessel !== schluessel) return;
    const vsc = d.pfad ? `<a class="icon" href="${h(vscodeLink(d.pfad))}" title="In VS Code öffnen" aria-label="Skill in VS Code öffnen">${icon('code')}</a>` : '';
    setzePanelKopf(`/${d.name || s.name}`, meta, aktionen + vsc);
    panelInhalt().innerHTML = `<div class="lesetext md">
      ${d.beschreibung ? `<p class="skill-beschreibung">${h(anzeige(d.beschreibung))}</p>` : ''}
      ${s.bsp ? `<p class="mono blass">Beispiel: ${h(s.bsp)}</p>` : ''}
      ${md(d.inhalt)}
      ${d.pfad ? `<p class="fussnote mono">${h(d.pfad)}</p>` : ''}</div>`;
  }

  // ---------- Befehlspalette (Strg/Cmd+K) ----------
  let palette = null;
  function paletteEintraege() {
    const e = [];
    REITER.forEach((r) => e.push({ art: 'Reiter', titel: r.name, tu: () => waehleReiter(r.id) }));
    (S.kapitel || []).forEach((k) => e.push({ art: 'Kapitel', titel: `${k.nr} ${k.titel || ''}`, unter: STATUS_NAME[k.status] || '',
      tu: () => { if (LIVE && k.vorhanden) oeffnePanel(`#kapitel/${kapSlug(k.nr)}`); else { waehleReiter('kapitel'); zeigeZeile('k:' + k.nr); } } }));
    (S.quellen?.liste || []).forEach((q) => e.push({ art: 'Quelle', titel: q.titel || q.id, unter: [autorKurz(q), q.jahr, q.bibkey].filter(Boolean).join(' · '),
      extra: [(q.autoren || []).join(' '), q.bibkey, q.doi].join(' '),
      tu: () => {
        if (PDF_ANSICHT && q.pdf_vorhanden && q.pdf) { oeffnePanel(quelleHash(q)); return; }
        ui.filter = q.status; if (!ui.offen.includes('q:' + q.id)) ui.offen.push('q:' + q.id); ui.suche = ''; merke();
        waehleReiter('quellen'); zeigeZeile('q:' + q.id);
      } }));
    (S.quellen?.liste || []).filter((q) => q.bibkey && zahlWert(q.zitate)).forEach((q) => e.push({ art: 'Zitate', titel: `Zitate aus ${q.bibkey}`, unter: `${zahl(q.zitate)} Zitate · ${q.titel || ''}`,
      tu: () => { window.location.href = vscodeLink(`quellen/zitate/${q.bibkey}.md`); } }));
    (S.termine || []).forEach((t) => e.push({ art: 'Termin', titel: t.titel, unter: `${datumDe(t.datum)}${t.erledigt ? ' · erledigt' : ''}`,
      tu: () => { waehleReiter('plan'); zeigeZeile('t:' + t.id); } }));
    skills().forEach((s) => e.push({ art: 'Skill', titel: '/' + s.name, unter: anzeige(s.kurz), tu: () => oeffnePanel('#skill/' + encodeURIComponent(s.name)) }));
    (S.aenderungen || []).slice(0, 5).forEach((a) => e.push({ art: 'Geändert', titel: a.titel || dateiName(a.datei), unter: `${dateiName(a.datei)} · ${relZeit(a.zeit)}`,
      tu: () => { if (LIVE) oeffnePanel(textHash(a.datei, (a.absaetze || [])[0])); } }));
    const akt = [
      ['Auftrag an Claude schreiben', () => oeffneKonfig(true)],
      ['Neue Recherche', () => auftrag('/recherche')],
      ['Nächster Schritt', () => auftrag(S.naechster_command || '/weiter')],
      ['Systemcheck', () => waehleReiter('hilfe')],
      ['Neuer Skill', () => neuerSkill()],
    ];
    if (LIVE) {
      akt.push(['PDF aktualisieren', () => pdfBauen()]);
      if (S.pdf?.vorhanden && PDF_ANSICHT) akt.push(['Arbeit.pdf ansehen', () => oeffnePanel('#arbeit')]);
      akt.push(['Termin eintragen', () => { waehleReiter('plan'); requestAnimationFrame(() => { const f = $('#termin-form [name="titel"]'); if (f) { f.scrollIntoView({ block: 'center' }); f.focus({ preventScroll: true }); } }); }]);
      akt.push(['Datei hochladen', () => $('#datei-wahl')?.click()]);
    }
    akt.forEach(([titel, tu]) => e.push({ art: 'Aktion', titel, tu }));
    return e;
  }
  function unscharf(frage, text) {
    const f = frage.toLowerCase().trim(); if (!f) return 1;
    const t = text.toLowerCase();
    let punkte = 0;
    for (const wort of f.split(/\s+/)) {
      const i = t.indexOf(wort);
      if (i >= 0) { punkte += 10 + (i === 0 || /[\s/.(-]/.test(t[i - 1]) ? 6 : 0) - Math.min(4, i / 20); continue; }
      let j = 0; let luecken = 0; let letzte = -1; let erste = -1;
      for (const c of wort) { const k = t.indexOf(c, j); if (k < 0) return 0; if (erste < 0) erste = k; if (letzte >= 0 && k > letzte + 1) luecken++; letzte = k; j = k + 1; }
      if (luecken > 2 || letzte - erste > wort.length * 2) return 0;
      punkte += 4 - luecken * 0.5;
    }
    return punkte;
  }
  function oeffnePalette() {
    if (palette) { $('#palette-eingabe')?.focus(); return; }
    const vorher = document.activeElement;
    const el = document.createElement('div');
    el.id = 'palette';
    el.className = 'palette';
    el.innerHTML = `<div class="palette-box" role="dialog" aria-modal="true" aria-label="Suchen und springen">
      <div class="palette-eingabe-zeile">${icon('lupe')}<input id="palette-eingabe" type="text" role="combobox" aria-expanded="true" aria-controls="palette-liste" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Kapitel, Quellen, Termine, Skills, Aktionen …"></div>
      <ul id="palette-liste" role="listbox" aria-label="Treffer"></ul>
      <div class="palette-fuss mono">↑↓ wählen · Enter öffnen · Esc schließen</div></div>`;
    document.body.appendChild(el);
    palette = { el, eintraege: paletteEintraege(), treffer: [], aktiv: 0, vorher };
    const eingabe = $('#palette-eingabe');
    eingabe.addEventListener('input', () => paletteFiltern(eingabe.value));
    eingabe.addEventListener('keydown', paletteTaste);
    el.addEventListener('mousedown', (e) => { if (e.target === el) { e.preventDefault(); schliessePalette(true); } });
    paletteFiltern('');
    requestAnimationFrame(() => el.classList.add('an'));
    eingabe.focus();
  }
  function paletteFiltern(frage) {
    const p = palette; if (!p) return;
    const f = frage.trim();
    p.treffer = f
      ? p.eintraege.map((e) => ({ e, s: unscharf(f, `${e.titel} ${e.unter || ''} ${e.extra || ''} ${e.art}`) + unscharf(f, e.titel) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 40).map((x) => x.e)
      : p.eintraege.filter((e) => e.art === 'Aktion' || e.art === 'Reiter' || e.art === 'Geändert').slice(0, 20);
    p.aktiv = 0;
    $('#palette-liste').innerHTML = p.treffer.map((e, i) => `<li role="option" id="pal-${i}" aria-selected="${i === 0}" data-i="${i}">
      <span class="pal-titel">${h(e.titel)}</span>${e.unter ? `<span class="pal-unter">${h(e.unter)}</span>` : ''}<span class="pal-art mono">${h(e.art)}</span></li>`).join('')
      || '<li class="pal-leer">Nichts gefunden.</li>';
    $('#palette-eingabe').setAttribute('aria-activedescendant', p.treffer.length ? 'pal-0' : '');
  }
  function paletteAktiv(i) {
    const p = palette; if (!p || !p.treffer.length) return;
    p.aktiv = (i + p.treffer.length) % p.treffer.length;
    $$('#palette-liste [role="option"]').forEach((li) => li.setAttribute('aria-selected', String(Number(li.dataset.i) === p.aktiv)));
    const li = $('#pal-' + p.aktiv); li?.scrollIntoView({ block: 'nearest' });
    $('#palette-eingabe').setAttribute('aria-activedescendant', 'pal-' + p.aktiv);
  }
  function paletteTaste(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); paletteAktiv(palette.aktiv + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); paletteAktiv(palette.aktiv - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); paletteAusfuehren(palette.aktiv); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); schliessePalette(true); }
    else if (e.key === 'Tab') { e.preventDefault(); }
  }
  function paletteAusfuehren(i) {
    const e = palette?.treffer[i]; if (!e) return;
    schliessePalette(false);
    e.tu();
  }
  function schliessePalette(fokusZurueck) {
    if (!palette) return;
    const { el, vorher } = palette;
    palette = null;
    el.remove();
    if (fokusZurueck && vorher && document.contains(vorher)) vorher.focus({ preventScroll: true });
  }
  function zeigeZeile(schluessel) {
    requestAnimationFrame(() => {
      const el = $(`#inhalt [data-zeile="${esc(schluessel)}"]`);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: reduziert() ? 'auto' : 'smooth' });
      el.classList.remove('blitz'); void el.offsetWidth; el.classList.add('blitz');
    });
  }
  function neuerSkill() {
    auftrag('', 'Erstelle einen eigenen Skill, der Folgendes tut: ');
  }

  // ---------- Oben: Kopf schrumpft, Konfigurator klappt ein ----------
  let klein = false;
  function baueGeruest() {
    const app = $('#app');
    const oben = document.createElement('div');
    oben.id = 'oben';
    const innen = document.createElement('div');
    innen.className = 'oben-innen';
    innen.append($('#kopf'), $('#reiter'), $('#konfig'));
    oben.append(innen);
    app.prepend(oben);
    const platz = document.createElement('div');
    platz.id = 'oben-platz';
    oben.after(platz);
    const messe = () => { if (!oben.classList.contains('klein')) platz.style.height = oben.offsetHeight + 'px'; };
    if (window.ResizeObserver) new ResizeObserver(messe).observe(oben); else window.addEventListener('resize', messe);
    messe();
    panelEl();
    let raf = 0;
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; pruefeKlein(); }); }, { passive: true });
  }
  function pruefeKlein() {
    const k = window.scrollY > 24;
    if (k === klein) return;
    klein = k;
    const oben = $('#oben');
    oben.classList.toggle('klein', k);
    if (!k) oben.classList.remove('offen');
  }
  function oeffneKonfig(fokus) {
    const oben = $('#oben');
    if (klein) oben.classList.add('offen');
    if (fokus) {
      const p = $('#prompt');
      if (p) { p.focus({ preventScroll: true }); p.setSelectionRange(p.value.length, p.value.length); }
    }
  }

  // ---------- Ereignisse ----------
  const SCHREIBEND = new Set(['q-status', 'q-stern', 'q-marke', 'freigeben', 'k-status-menue', 'k-status-setzen', 't-erledigt', 't-loeschen', 'upload',
    'pdf-bauen', 'absatz-korrigieren', 'absatz-speichern', 'zitat-uebernehmen']);

  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-a]');
    if (!e.target.closest('.menue-anker')) schliesseMenue(false);
    if (!e.target.closest('.absatz, .absatz-aktionen') && e.target.closest('#panel')) schliesseAbsatzAktionen();
    const absatzEl = !el && e.target.closest('#panel .absatz:not(.bearbeiten)');
    if (absatzEl) {
      if (window.getSelection && !window.getSelection().isCollapsed) return;
      zeigeAbsatzAktionen(absatzEl); return;
    }
    if (!el) return;
    const a = el.dataset.a;
    if (SCHREIBEND.has(a) && (!LIVE || offline)) { e.preventDefault(); toast(LIVE ? NICHT_ERREICHBAR : 'Das geht nur in der Live-Ansicht.'); return; }
    if (el.tagName === 'A' && a) e.preventDefault();
    switch (a) {
      case 'reiter': waehleReiter(el.dataset.v); break;
      case 'waehl': { let b; try { b = JSON.parse(el.dataset.b); } catch { return; } schalteBaustein(b); break; }
      case 'baustein-weg': ui.bausteine.splice(Number(el.dataset.i), 1); merke(); zeichneBausteine(); markiereKreise(); break;
      case 'bausteine-mehr': ui.alleBausteine = !ui.alleBausteine; merke(); zeichneBausteine(); break;
      case 'cmd-weg': ui.command = ''; merke(); zeichneKonfig(); oeffneKonfig(true); break;
      case 'menue': if ($('.menue')) schliesseMenue(true); else zeigeMenue(el, aktionsMenueHtml(), 'Aktionen'); break;
      case 'cmd-waehlen': ui.command = el.dataset.v; merke(); schliesseMenue(false); zeichneKonfig(); oeffneKonfig(true); break;
      case 'konfig-auf': oeffneKonfig(true); break;
      case 'senden': senden(); break;
      case 'kopieren': kopieren(); break;
      case 'upload': $('#datei-wahl')?.click(); break;
      case 'auftrag': auftrag(el.dataset.cmd || '', el.dataset.text || '', el.dataset.sofort === '1'); break;
      case 'palette': oeffnePalette(); break;
      case 'phase': ui.phaseInfo = ui.phaseInfo === el.dataset.v ? null : el.dataset.v; merke(); zeichneInhalt(); break;
      case 'abz-alle': ui.abzAlle = !ui.abzAlle; merke(); zeichneInhalt(); break;
      case 'auf': {
        const id = el.dataset.id; const i = ui.offen.indexOf(id);
        if (i >= 0) ui.offen.splice(i, 1); else ui.offen.push(id);
        ui.offen = ui.offen.slice(-30); merke(); zeichneInhalt(); break;
      }
      case 'filter': ui.filter = el.dataset.v; merke(); zeichneInhalt(); break;
      case 'suche-leeren': ui.suche = ''; merke(); { const s = $('#suche'); if (s) { s.value = ''; s.focus(); } } zeichneQuellenListe(); break;
      case 'q-status': quelleSetzen(el.dataset.id, { status: el.dataset.v }, el.closest('li[data-zeile]')); break;
      case 'q-stern': quelleSetzen(el.dataset.id, { stern: Number(el.dataset.v) }); break;
      case 'q-marke': {
        const q = findeQuelle(el.dataset.id); if (!q) return;
        const m = new Set(q.markierungen || []); m.has(el.dataset.v) ? m.delete(el.dataset.v) : m.add(el.dataset.v);
        quelleSetzen(q.id, { markierungen: [...m] }); break;
      }
      case 'k-status-menue': if ($('.menue')) schliesseMenue(true); else zeigeMenue(el, statusMenueHtml(el.dataset.nr), `Status von Kapitel ${el.dataset.nr}`); break;
      case 'k-status-setzen': schliesseMenue(false); setzeKapitelStatus(el.dataset.nr, el.dataset.v); break;
      case 'freigeben':
        if (!el.classList.contains('bestaetigen')) {
          el.classList.add('bestaetigen'); el.textContent = 'Wirklich freigeben?';
          clearTimeout(el._t);
          el._t = setTimeout(() => { if (document.contains(el)) { el.classList.remove('bestaetigen'); el.textContent = 'Freigeben'; } if (nachladenAusstehend) zeichneWennMoeglich(); }, 4000);
        } else { clearTimeout(el._t); el.classList.remove('bestaetigen'); setzeKapitelStatus(el.dataset.nr, 'final'); }
        break;
      case 't-erledigt': terminErledigt(el.dataset.id, el.dataset.v === '1', el); break;
      case 't-loeschen': terminLoeschen(el.dataset.id, el); break;
      case 'check-neu': checkErgebnis = null; zeichneInhalt(); ladeCheck(true); break;
      case 'toast-zurueck': macheRueckgaengig(Number(el.dataset.t)); break;
      case 'toast-zu': entferneToast(Number(el.dataset.t)); break;
      case 'panel-zu': schliessePanel(true); break;
      case 'panel-neu-laden':
        if (panel.art === 'text' && panel.daten) textNeuLaden().catch((err) => toast(err.message));
        else { const r = parseHash(); if (r) zeigePanel(r, true); }
        break;
      case 'panel-kapitel-claude': { const k = findeKapitelZuDatei(panel.daten?.datei || parseHash()?.datei); if (k) bausteinDazu(bKapitel(k)); break; }
      case 'panel-quelle-claude': { const q = findeQuelle(el.dataset.id); if (q) bausteinDazu(bQuelle(q)); break; }
      case 'absatz-korrigieren': korrigieren(Number(el.dataset.i)); break;
      case 'absatz-abbrechen': absatzAbbrechen(Number(el.dataset.i)); break;
      case 'absatz-speichern': absatzSpeichern(Number(el.dataset.i)); break;
      case 'absatz-konflikt': absatzKonflikt(Number(el.dataset.i)); break;
      case 'absatz-claude': {
        const d = panel.daten; const i = Number(el.dataset.i);
        const idx = d.absaetze.findIndex((x) => zahlWert(x.i) === i);
        bausteinDazu(bAbsatz(d.datei, d.absaetze[idx], absatzZeile(d, idx)), 'Überarbeite diesen Absatz: ');
        schliesseAbsatzAktionen(); break;
      }
      case 'pdf-bauen': pdfBauen(); break;
      case 'pdf-zoom': pdfZoom(pdfViewer, Number(el.dataset.v)); break;
      case 'pdf-breite': pdfZoom(pdfViewer, 0, 'breite'); break;
      case 'zitat-uebernehmen': {
        const leiste = $('#auswahl-leiste'); const q = pdfViewer?.quelle; if (!leiste || !q) return;
        const seite = Number(leiste.dataset.seite); const text = leiste.dataset.text;
        try {
          const r = await post('/api/zitat', { bibkey: q.bibkey, seite, text });
          versteckeAuswahlLeiste(); window.getSelection()?.removeAllRanges();
          toast(`Zitat von Seite ${seite} übernommen.`, r?.id ? async () => {
            await post('/api/zitat/entfernen', { bibkey: q.bibkey, id: r.id }); holeStand();
          } : null);
          holeStand();
        } catch (err) { toast(err.message); }
        break;
      }
      case 'auswahl-claude': {
        const leiste = $('#auswahl-leiste'); if (!leiste) return;
        bausteinDazu(bPdfStelle(pdfViewer?.quelle, Number(leiste.dataset.seite), leiste.dataset.text));
        versteckeAuswahlLeiste(); break;
      }
      case 'skill-neu': neuerSkill(); break;
      case 'skill-aendern': auftrag('', `Ändere den Skill /${el.dataset.v} so: `); break;
    }
  });

  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.id === 'datei-wahl') { await hochladen(el.files); el.value = ''; return; }
    if (el.id === 'sortierung') { ui.sortierung = el.value; merke(); zeichneQuellenListe(); return; }
    if (el.id === 'pdf-seite' && pdfViewer) { pdfSpringe(pdfViewer, el.value, true); }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'suche') { ui.suche = e.target.value; merke(); zeichneQuellenListe(); }
  });

  document.addEventListener('focusout', async (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.notiz !== undefined && LIVE) {
      const q = findeQuelle(el.dataset.notiz);
      if (q && (q.notiz || '') !== el.value) {
        const alt = q.notiz || '';
        q.notiz = el.value;
        try {
          await post('/api/quelle', { id: q.id, notiz: el.value });
          toast('Notiz gespeichert.', async () => { q.notiz = alt; zeichneWennMoeglich(); await post('/api/quelle', { id: q.id, notiz: alt }); });
        } catch (err) { toast(err.message); }
      }
    }
    // Konfigurator wieder einklappen, wenn der Fokus ihn verlässt
    const konfig = $('#konfig');
    if (konfig && konfig.contains(el)) {
      setTimeout(() => {
        if (!konfig.contains(document.activeElement) && !$('#konfig .menue')) $('#oben')?.classList.remove('offen');
      }, 0);
    }
    if (nachladenAusstehend) setTimeout(zeichneWennMoeglich, 50);
  });

  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'termin-form') return;
    e.preventDefault();
    const form = e.target;
    if (!LIVE || offline) { toast(NICHT_ERREICHBAR); return; }
    const daten = Object.fromEntries(new FormData(form).entries());
    try {
      const r = await post('/api/termin', daten);
      form.reset();
      if (document.activeElement && form.contains(document.activeElement)) document.activeElement.blur();
      if (r?.termin) {
        (S.termine = S.termine || []).push(Object.assign({ tage: null }, r.termin));
        hervorheben = 't:' + r.termin.id;
        zeichneInhalt();
        toast(`Termin eingetragen: ${r.termin.titel}`, async () => {
          S.termine = (S.termine || []).filter((t) => t.id !== r.termin.id); zeichneInhalt();
          await post('/api/termin/loeschen', { id: r.termin.id });
          holeStand();
        });
      } else toast('Termin eingetragen.');
      holeStand();
    } catch (err) { toast(err.message); }
  });

  function istEingabe(el) { return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)); }

  document.addEventListener('keydown', (e) => {
    const ziel = e.target;
    // Strg/Cmd+K: Befehlspalette
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); if (palette) schliessePalette(true); else oeffnePalette(); return; }
    if (palette) return;
    // Menüs mit Pfeiltasten
    const menue = ziel.closest && ziel.closest('.menue');
    if (menue) {
      const punkte = $$('[role^="menuitem"]', menue);
      const i = punkte.indexOf(ziel);
      if (e.key === 'ArrowDown') { e.preventDefault(); punkte[(i + 1) % punkte.length]?.focus(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); punkte[(i - 1 + punkte.length) % punkte.length]?.focus(); return; }
      if (e.key === 'Home') { e.preventDefault(); punkte[0]?.focus(); return; }
      if (e.key === 'End') { e.preventDefault(); punkte[punkte.length - 1]?.focus(); return; }
      if (e.key === 'Escape') { e.preventDefault(); schliesseMenue(true); return; }
      if (e.key === 'Tab') { schliesseMenue(false); return; }
    }
    if (e.key === 'Escape') {
      if ($('.menue')) { schliesseMenue(true); return; }
      if (!$('#auswahl-leiste')?.hidden && $('#auswahl-leiste')) { versteckeAuswahlLeiste(); return; }
      if ($('#panel .absatz-aktionen')) { const akt = $('#panel .absatz.aktiv'); schliesseAbsatzAktionen(); akt?.focus(); return; }
      if (panel.art && panel.bearbeitet == null) { schliessePanel(true); return; }
      if (ziel.id === 'prompt') { ziel.blur(); return; }
    }
    // Reiter mit Pfeiltasten
    if (ziel.getAttribute && ziel.getAttribute('role') === 'tab') {
      const i = REITER.findIndex((r) => r.id === ziel.dataset.v);
      let n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % REITER.length;
      if (e.key === 'ArrowLeft') n = (i - 1 + REITER.length) % REITER.length;
      if (e.key === 'Home') n = 0;
      if (e.key === 'End') n = REITER.length - 1;
      if (n !== null) { e.preventDefault(); waehleReiter(REITER[n].id, true); return; }
    }
    // Taste Z: letzte Aktion rückgängig
    if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey && !e.altKey && !istEingabe(ziel)) {
      if (macheRueckgaengig()) { e.preventDefault(); return; }
    }
    if ((e.key === 'Enter' || e.key === ' ') && ziel.matches && ziel.matches('[role="button"][data-a]')) { e.preventDefault(); ziel.click(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && ziel.matches && ziel.matches('#panel .absatz:not(.bearbeiten)')) { e.preventDefault(); zeigeAbsatzAktionen(ziel); }
  });

  document.addEventListener('selectionchange', () => {
    if (!pdfViewer) return;
    clearTimeout(pruefeAuswahl.t);
    pruefeAuswahl.t = setTimeout(pruefeAuswahl, 180);
  });

  window.addEventListener('hashchange', route);
  let groesseTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(groesseTimer);
    groesseTimer = setTimeout(() => { if (pdfViewer && pdfViewer.modus === 'breite' && pdfViewer.doc) pdfZoom(pdfViewer, 0, 'breite'); }, 200);
  });

  // Drag & Drop: überall ablegen lädt in den Eingang
  let ziehZaehler = 0;
  window.addEventListener('dragenter', (e) => { if (e.dataTransfer?.types?.includes('Files')) { ziehZaehler++; $('#drop')?.classList.add('ueber'); } });
  window.addEventListener('dragleave', () => { ziehZaehler = Math.max(0, ziehZaehler - 1); if (!ziehZaehler) $('#drop')?.classList.remove('ueber'); });
  window.addEventListener('dragover', (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault(); ziehZaehler = 0; $('#drop')?.classList.remove('ueber');
    hochladen(e.dataTransfer.files);
  });

  // Relative Zeiten still nachführen, ohne neu zu zeichnen
  setInterval(() => { $$('[data-zeit]').forEach((el) => { const t = relZeit(el.dataset.zeit); if (t && el.textContent !== t) el.textContent = t; }); }, 30000);

  // Schnittstelle für eigene Anpassungen (arbeit/dashboard-anpassungen.js)
  window.SW = {
    stand: () => S,
    neuZeichnen: () => zeichneAlles(),
    auftrag,
    baustein: (b) => schalteBaustein(b),
    reiter: (id) => waehleReiter(id),
    toast,
    panel: (hash) => oeffnePanel(hash),
  };

  baueGeruest();
  zeichneAlles();
  verbinde();
  route();
})();
