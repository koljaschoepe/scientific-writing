/* Scientific Writing Dashboard, Browser-Teil. Kein Build, keine Abhängigkeiten.
   Daten: window.__STAND__ (von stand.mjs), Modus: window.__MODUS__ ({ statisch, port, url }).
   Eigene Erweiterungen gehören nach arbeit/dashboard-anpassungen.js. Dort steht window.SW bereit:
   SW.stand(), SW.neuZeichnen(), SW.auftrag(cmd, text, sofort), SW.baustein(obj), SW.reiter(id). */
(function () {
  'use strict';

  const MODUS = window.__MODUS__ || { statisch: true, port: 4711 };
  let S = window.__STAND__ || {};
  const LIVE = !MODUS.statisch;

  const COMMANDS = [
    { cmd: '/start', kurz: 'Projekt einrichten oder Einstellungen ändern',
      lang: 'Einmaliges Interview: du, deine Arbeit, Hochschule, Fristen, Format. Später auch zum Ändern von Einstellungen.',
      bsp: '/start' },
    { cmd: '/weiter', kurz: 'Nächsten sinnvollen Schritt machen',
      lang: 'Claude schaut, wo du stehst, und führt dich durch den nächsten Schritt: Thema, Exposé, Gliederung, Kapitel. Am Ende fragt es, ob du freigibst.',
      bsp: '/weiter' },
    { cmd: '/recherche', kurz: 'Literatur suchen lassen',
      lang: 'Claude sucht in Fachdatenbanken, der SLUB und im Web und legt Vorschläge im Reiter Quellen ab. Du entscheidest: nehmen, später, verwerfen.',
      bsp: '/recherche maschinelles Lernen Reaktionsvorhersage' },
    { cmd: '/quellen', kurz: 'Entscheidungen und Uploads verarbeiten',
      lang: 'Genommene Quellen kommen ins Literaturverzeichnis, PDFs werden geholt und ausgewertet, Dateien aus dem Eingang einsortiert.',
      bsp: '/quellen' },
    { cmd: '/schreiben', kurz: 'Kapitel planen, schreiben oder überarbeiten',
      lang: 'Mit Kapitelnummer schreibt Claude dieses Unterkapitel. Hast du selbst etwas geschrieben, überarbeitet ihr es gemeinsam.',
      bsp: '/schreiben 2.1' },
    { cmd: '/pruefen', kurz: 'Text prüfen lassen',
      lang: 'Prüft Sprache, Zitattreue gegen die Originalquelle, Argumentation (mit Notenschätzung) und Umfang. Ohne Nummer: nächstes ungeprüftes Kapitel.',
      bsp: '/pruefen 2.1' },
    { cmd: '/pdf', kurz: 'PDF bauen',
      lang: 'Baut aus allen Kapiteln das fertige PDF (Arbeit.pdf). Mit "entwurf" auch mit Lücken.',
      bsp: '/pdf entwurf' },
    { cmd: '/sync', kurz: 'Sichern und mit GitHub abgleichen',
      lang: 'Speichert deinen Stand auf GitHub und holt Änderungen von anderen Geräten. Mach das am Ende jedes Arbeitstags.',
      bsp: '/sync' },
    { cmd: '/update', kurz: 'Neue Kit-Version holen',
      lang: 'Holt Verbesserungen am Kit. Deine Texte, Quellen und Einstellungen bleiben unberührt.',
      bsp: '/update' },
    { cmd: '/hilfe', kurz: 'Wo bin ich, was jetzt, etwas geht nicht',
      lang: 'Erklärt, wo du stehst und was als Nächstes sinnvoll ist. Prüft die Technik und repariert, was geht.',
      bsp: '/hilfe das PDF baut nicht' },
    { cmd: '/dashboard', kurz: 'Dashboard öffnen oder umbauen',
      lang: 'Öffnet diese Seite. Mit "anpassen" und einem Wunsch baut Claude das Dashboard für dich um.',
      bsp: '/dashboard anpassen zeig mir die Quellen nach Kapitel sortiert' },
  ];

  const REITER = [
    { id: 'uebersicht', name: 'Übersicht' },
    { id: 'quellen', name: 'Quellen' },
    { id: 'kapitel', name: 'Kapitel' },
    { id: 'plan', name: 'Plan' },
    { id: 'hilfe', name: 'Hilfe' },
  ];

  const MARKIERUNGEN = ['kernquelle', 'methodik', 'daten', 'review', 'kritisch', 'definition', 'gegenposition'];
  const STATUS_NAME = { offen: 'offen', geplant: 'geplant', entwurf: 'Entwurf', geprueft: 'geprüft', final: 'final' };
  const ART_NAME = { betreuung: 'Betreuung', frist: 'Frist', labor: 'Labor', sonstiges: 'Sonstiges' };

  // ---------- UI-Zustand (pro Browser gemerkt, nie wichtig) ----------
  const UI_SCHLUESSEL = 'sw-dashboard-ui';
  const ui = Object.assign({
    reiter: 'uebersicht', filter: 'vorschlag', suche: '', sortierung: 'relevanz',
    offen: [], bausteine: [], command: '', text: '', phaseInfo: null, alleBausteine: false,
  }, (() => { try { return JSON.parse(localStorage.getItem(UI_SCHLUESSEL) || '{}'); } catch { return {}; } })());
  const merke = () => { try { localStorage.setItem(UI_SCHLUESSEL, JSON.stringify(ui)); } catch {} };
  let sperreBis = 0;
  let checkErgebnis = null;

  // ---------- Hilfen ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const zahl = (n) => (n == null ? '–' : Number(n).toLocaleString('de-DE'));
  const zwei = (n) => String(n).padStart(2, '0');
  const isoTag = (d) => `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
  const parseTag = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const datumDe = (s) => { const d = parseTag(s); return d ? `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.${d.getFullYear()}` : (s || ''); };
  const datumKurz = (s) => { const d = parseTag(s); return d ? `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.` : ''; };
  // Datenwerte bleiben ASCII, die Anzeige nicht.
  const ANZEIGE = { geprueft: 'geprüft', Geprueft: 'Geprüft', pruefen: 'prüfen', Pruefen: 'Prüfen', Pruefung: 'Prüfung',
    spaeter: 'später', Spaeter: 'Später', abschliessen: 'abschließen', Uebersicht: 'Übersicht', Expose: 'Exposé' };
  const anzeige = (s) => String(s ?? '').replace(/\b(geprueft|Geprueft|pruefen|Pruefen|Pruefung|spaeter|Spaeter|abschliessen|Uebersicht|Expose)\b/g, (w) => ANZEIGE[w]);
  const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const WT_ID = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];
  function relTage(t) {
    if (t == null) return '';
    if (t === 0) return 'heute';
    if (t === 1) return 'morgen';
    if (t === -1) return 'gestern';
    return t > 0 ? `in ${t} Tagen` : `vor ${-t} Tagen`;
  }
  function wann(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    const heute = isoTag(new Date());
    const tag = isoTag(d);
    const zeit = `${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
    return tag === heute ? `heute ${zeit}` : `${datumKurz(tag)} ${zeit}`;
  }
  function autorKurz(q) {
    const a = q.autoren || [];
    if (!a.length) return '';
    const nach = (x) => String(x).split(',')[0].trim();
    return a.length === 1 ? nach(a[0]) : a.length === 2 ? `${nach(a[0])}, ${nach(a[1])}` : `${nach(a[0])} et al.`;
  }
  function dateiLink(rel) {
    const root = String(S.root || '').replace(/\\/g, '/').replace(/^\/+/, '');
    return 'vscode://file/' + encodeURI(`${root}/${rel}`).replace(/#/g, '%23');
  }

  const ICONS = {
    senden: '<path d="M4 12l16-8-6 16-3-7-7-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    kopieren: '<rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    klammer: '<path d="M20 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    haken: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    stern: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="currentColor"/>',
    x: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    oeffnen: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    stift: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    lupe: '<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    muell: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    blitz: '<path d="M13 3L5 13h6l-1 8 8-10h-6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    medaille: '<path d="M12 4l2.2 4.6 5 .7-3.6 3.5.9 5L12 15.4 7.5 17.8l.9-5L4.8 9.3l5-.7z" fill="currentColor"/>',
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  function toast(text, rueckgaengig) {
    const t = $('#toast');
    t.innerHTML = `<span>${h(text)}</span>${rueckgaengig ? '<button type="button" data-a="toast-zurueck">Rückgängig</button>' : ''}`;
    t.classList.add('an');
    toast.zurueck = rueckgaengig || null;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('an'), rueckgaengig ? 6000 : 3500);
  }

  async function post(pfad, daten) {
    const r = await fetch(pfad, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(daten) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.fehler || `Fehler ${r.status}`);
    return j;
  }

  // ---------- Bausteine und Auftrag ----------
  function bKapitel(k) {
    return { key: 'kapitel:' + k.nr, art: 'Kapitel', label: `${k.nr} ${k.titel || ''}`.trim(),
      prompt: `Kapitel ${k.nr}${k.titel ? ` „${k.titel}“` : ''} (${k.datei})` };
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
    return { key: 'datei:' + pfad, art: 'Datei', label: pfad, prompt: `Datei ${pfad}` };
  }
  const gewaehlt = (key) => ui.bausteine.findIndex((b) => b.key === key);
  function schalteBaustein(b) {
    const i = gewaehlt(b.key);
    if (i >= 0) ui.bausteine.splice(i, 1); else ui.bausteine.push(b);
    merke(); zeichneBausteine(); markiereKreise();
  }
  function waehlKnopf(b) {
    const i = gewaehlt(b.key);
    return `<button type="button" class="waehl${i >= 0 ? ' an' : ''}" data-a="waehl" data-b="${h(JSON.stringify(b))}"
      aria-pressed="${i >= 0}" title="In den Auftrag an Claude übernehmen" aria-label="In den Auftrag übernehmen: ${h(b.label)}">${i >= 0 ? i + 1 : ''}</button>`;
  }
  function markiereKreise() {
    document.querySelectorAll('.waehl').forEach((el) => {
      let b; try { b = JSON.parse(el.dataset.b); } catch { return; }
      const i = gewaehlt(b.key);
      el.classList.toggle('an', i >= 0);
      el.setAttribute('aria-pressed', String(i >= 0));
      el.textContent = i >= 0 ? String(i + 1) : '';
    });
  }

  function baueAuftrag() {
    let t = ((ui.command ? ui.command + ' ' : '') + (ui.text || '').trim()).trim();
    if (ui.bausteine.length) {
      t += (t ? '\n\n' : '') + 'Bezug:\n' + ui.bausteine.map((b, i) => `${i + 1}. ${b.prompt}`).join('\n');
    }
    return t;
  }

  function oeffneClaude(prompt) {
    const uri = 'vscode://anthropic.claude-code/open?prompt=' + encodeURIComponent(prompt);
    const a = document.createElement('a');
    a.href = uri; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
  }

  function senden() {
    const prompt = baueAuftrag();
    if (!prompt) { $('#prompt').focus(); toast('Schreib einen Auftrag oder wähle eine Aktion.'); return; }
    oeffneClaude(prompt);
    toast('Claude-Tab geöffnet. Dort Enter drücken. Öffnet sich nichts: Kopieren und in Claude einfügen.');
  }

  async function kopieren() {
    const prompt = baueAuftrag();
    if (!prompt) { toast('Noch nichts zu kopieren.'); return; }
    try { await navigator.clipboard.writeText(prompt); toast('Auftrag kopiert. In Claude einfügen und Enter.'); }
    catch {
      const ta = document.createElement('textarea'); ta.value = prompt; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Auftrag kopiert.'); } catch { toast('Kopieren nicht möglich.'); }
      ta.remove();
    }
  }

  function auftrag(cmd, text = '', sofort = false) {
    ui.command = cmd || '';
    ui.text = text || '';
    merke(); zeichneKonfig();
    if (sofort) { senden(); return; }
    const p = $('#prompt'); p.focus(); p.setSelectionRange(p.value.length, p.value.length);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- Kopf, Reiter, Konfigurator ----------
  function zeichneKopf() {
    const ab = S.abgabe || {};
    const abText = ab.tage == null ? '' : ab.tage < 0 ? `<span class="rot">Abgabe vor ${-ab.tage} Tagen</span>` : `Abgabe ${relTage(ab.tage)}`;
    $('#kopf').innerHTML = `
      <span class="logo">scientific writing</span>
      <h1>${h(S.titel || (S.eingerichtet ? 'Titel noch offen' : 'Deine wissenschaftliche Arbeit'))}</h1>
      <span class="meta">
        <span>${h(S.phaseName || '')} ${S.phaseIndex != null ? (S.phaseIndex + 1) + '/8' : ''}</span>
        ${abText ? `<span>${abText}</span>` : ''}
        <span title="${LIVE ? 'Live: aktualisiert sich selbst' : 'Statische Kopie'}"><span class="livepunkt${LIVE && zeichneKopf.verbunden ? ' an' : ''}"></span>${LIVE ? 'live' : 'Kopie'}</span>
      </span>
      ${LIVE ? '' : `<div class="statisch-banner" style="flex-basis:100%">Statische Kopie vom ${h(wann(S.erzeugt))}. Die Live-Ansicht mit allen Knöpfen: in Claude <span class="mono">/dashboard</span> eingeben oder <a href="${h(MODUS.url)}">${h(MODUS.url)}</a> öffnen.</div>`}`;
  }

  function zeichneReiter() {
    $('#reiter').innerHTML = REITER.map((r) => `<button type="button" role="tab" data-a="reiter" data-v="${r.id}" aria-selected="${ui.reiter === r.id}">${r.name}</button>`).join('');
    $('#reiter').setAttribute('role', 'tablist');
  }

  function zeichneKonfig() {
    const box = $('#konfig');
    box.innerHTML = `
      <div class="konfig-box">
        <ol class="bausteine" id="bausteine" aria-label="Bezüge"></ol>
        <div class="eingabe-zeile">
          ${ui.command ? `<span class="cmd-chip">${h(ui.command)}<button type="button" data-a="cmd-weg" aria-label="Aktion entfernen">${icon('x')}</button></span>` : ''}
          <textarea id="prompt" rows="1" placeholder="${ui.command ? 'Optional: was genau? Enter für neue Zeile, Strg+Enter sendet' : 'Was soll Claude tun? Zum Beispiel: Hilf mir, meine Forschungsfrage zu schärfen.'}" aria-label="Auftrag an Claude">${h(ui.text)}</textarea>
        </div>
        <div class="werkzeuge">
          <span class="menue-anker">
            <button type="button" class="knopf still" data-a="menue" aria-haspopup="true" aria-expanded="false"><span class="mono">/</span> Aktion</button>
          </span>
          <button type="button" class="knopf still nur-live" data-a="upload" title="Dateien in den Eingang laden (quellen/eingang)">${icon('klammer')} Datei</button>
          <input type="file" id="datei-wahl" multiple hidden>
          <span class="luecke"></span>
          <span class="tasten">Strg+Enter</span>
          <button type="button" class="icon" data-a="kopieren" title="Auftrag kopieren" aria-label="Auftrag kopieren">${icon('kopieren')}</button>
          <button type="button" class="knopf haupt" data-a="senden" title="Öffnet Claude in VS Code mit diesem Auftrag">${icon('senden')} An Claude</button>
        </div>
      </div>`;
    zeichneBausteine();
    const p = $('#prompt');
    const hoehe = () => { p.style.height = 'auto'; p.style.height = Math.min(180, p.scrollHeight) + 'px'; };
    p.addEventListener('input', () => { ui.text = p.value; merke(); hoehe(); });
    p.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); senden(); } });
    hoehe();
  }

  function zeichneBausteine() {
    const ol = $('#bausteine'); if (!ol) return;
    const n = ui.bausteine.length;
    ol.classList.toggle('hat', n > 0);
    const zeigen = n > 3 && !ui.alleBausteine ? ui.bausteine.slice(0, 3) : ui.bausteine;
    ol.innerHTML = zeigen.map((b, i) => `<li><span class="nr">${i + 1}</span><span class="art">${h(b.art)}</span>
      <span class="lbl" title="${h(b.prompt)}">${h(b.label)}</span>
      <button type="button" class="weg" data-a="baustein-weg" data-i="${i}" aria-label="Entfernen">${icon('x')}</button></li>`).join('')
      + (n > 3 ? `<li><button type="button" class="mehr" data-a="bausteine-mehr">${ui.alleBausteine ? 'weniger zeigen' : `und ${n - 3} weitere`}</button></li>` : '');
  }

  function zeigeMenue(knopf) {
    schliesseMenue();
    const m = document.createElement('div');
    m.className = 'menue'; m.setAttribute('role', 'menu');
    m.innerHTML = COMMANDS.map((c) => `<button type="button" role="menuitem" data-a="cmd-waehlen" data-v="${c.cmd}"><span class="cmd">${c.cmd}</span><span class="erkl">${h(c.kurz)}</span></button>`).join('');
    knopf.parentElement.appendChild(m);
    knopf.setAttribute('aria-expanded', 'true');
    m.querySelector('button').focus();
  }
  function schliesseMenue() {
    document.querySelectorAll('.menue').forEach((m) => m.remove());
    document.querySelectorAll('[data-a="menue"]').forEach((k) => k.setAttribute('aria-expanded', 'false'));
  }

  // ---------- Übersicht ----------
  function pfadHtml() {
    return `<div class="pfad" role="list">${(S.phasen || []).map((ph, i) => `
      <button type="button" class="station ${ph.status}" role="listitem" data-a="phase" data-v="${ph.id}" aria-label="${h(ph.name)}: ${ph.status}">
        <span class="punkt">${ph.status === 'erledigt' ? icon('haken') : i + 1}</span>
        <span class="name">${h(ph.name)}</span>
        <span class="datum">${ph.status === 'erledigt' && ph.datum ? datumKurz(ph.datum) : ph.status === 'aktiv' ? 'jetzt' : ''}</span>
      </button>`).join('')}</div>`;
  }

  function aktivKlasse(e) {
    if (!e) return '';
    const ziel = S.tagesziel?.woerter;
    if (e.woerter > 0 && ziel) { const r = e.woerter / ziel; return r >= 1 ? 'a3' : r >= 0.5 ? 'a2' : 'a1'; }
    if (e.woerter > 600) return 'a3';
    if (e.woerter > 200) return 'a2';
    return (e.woerter || e.quellen || e.sessions) ? 'a1' : '';
  }

  function zahlenHtml() {
    const ab = S.abgabe || {}; const tz = S.tagesziel || {}; const w = S.woerter || {};
    const abgabe = ab.tage == null
      ? `<div class="zahl">offen</div><div class="zahl-sub">Datum mit /start festlegen</div>`
      : `<div class="zahl ${ab.tage < 0 ? 'rot' : ''}">${ab.tage < 0 ? 'vorbei' : zahl(ab.tage)} <small>${ab.tage < 0 ? '' : ab.tage === 1 ? 'Tag' : 'Tage'}</small></div><div class="zahl-sub">bis ${h(datumDe(ab.datum))}</div>`;
    const heute = tz.woerter
      ? `<div class="zahl">${zahl(tz.heute)} <small>/ ${zahl(tz.woerter)}</small></div>
         <div class="balken"><i style="width:${Math.min(100, Math.round((tz.heute / tz.woerter) * 100))}%"></i></div>
         <div class="zahl-sub">${tz.erreicht ? '<span class="ok">Tagesziel erreicht</span>' : `noch ${zahl(Math.max(0, tz.woerter - tz.heute))} Wörter`}</div>`
      : `<div class="zahl">${zahl(tz.heute || 0)} <small>Wörter</small></div><div class="zahl-sub">Tagesziel entsteht mit Abgabedatum und Gliederung</div>`;
    const heuteIso = isoTag(new Date());
    const tage = (S.letzte14 || []).map((t) => {
      const d = parseTag(t.tag); const a = aktivKlasse(t);
      const kl = ['tg', t.arbeitstag ? '' : 'frei', a, t.tag === heuteIso ? 'heute' : ''].filter(Boolean).join(' ');
      const tip = `${d ? WT[d.getDay()] + ' ' : ''}${datumDe(t.tag)}: ${a ? `${zahl(t.woerter)} Wörter, ${zahl(t.quellen)} Quellen` : t.arbeitstag ? 'nicht gearbeitet' : 'frei'}`;
      return `<span class="${kl}" title="${h(tip)}"><i></i><b>${d ? WT[d.getDay()].charAt(0) : ''}</b></span>`;
    }).join('');
    const serie = `<div class="zahl">${zahl(S.serie || 0)} <small>${S.serie === 1 ? 'Arbeitstag' : 'Arbeitstage'} am Stück</small></div>
      <div class="tage14" role="img" aria-label="Letzte 14 Tage, blau heißt gearbeitet">${tage}</div>`;
    const gesamt = `<div class="zahl">${zahl(w.gesamt || 0)} <small>${w.ziel ? '/ ' + zahl(w.ziel) : ''} Wörter</small></div>
      ${w.ziel ? `<div class="balken"><i style="width:${w.prozent || 0}%"></i></div>` : ''}
      <div class="zahl-sub">etwa ${zahl(w.seiten_geschaetzt || 0)} Seiten${w.ziel ? ` · ${w.prozent || 0} %` : ''}</div>`;
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
    return `<div class="abzeichen">${zeige.map((a) => `<span class="abz ${a.erreicht ? '' : 'offen'}" title="${h(a.beschreibung)}${a.datum ? ' · ' + datumDe(a.datum) : ''}">
      <span class="medaille">${icon('medaille')}</span>${h(a.name)}</span>`).join('')}</div>`;
  }

  function uebersicht() {
    const teile = [];
    if (!S.eingerichtet) {
      teile.push(`<section class="abschnitt"><div class="karte willkommen">
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
      teile.push(`<div class="hinweis"><span class="text">${S.sync.tage == null ? 'Deine Arbeit ist noch nie auf GitHub gesichert worden.' : `Letzte Sicherung auf GitHub vor ${S.sync.tage} Tagen.`} Geht dein Laptop kaputt, ist alles seitdem weg.</span>
        <button type="button" class="knopf" data-a="auftrag" data-cmd="/sync" data-sofort="1">Jetzt sichern</button></div>`);
    }
    const ph = ui.phaseInfo ? (S.phasen || []).find((x) => x.id === ui.phaseInfo) : null;
    teile.push(`<section class="abschnitt"><h2>Dein Weg</h2><div class="karte">${pfadHtml()}
      ${ph ? `<div class="pfad-erkl"><strong>${h(ph.name)}</strong> · ${h(ph.status)}${ph.datum ? ' seit ' + datumDe(ph.datum) : ''}<br>${h(ph.beschreibung)} Passender Befehl: <span class="mono">${h(ph.command)}</span></div>` : ''}
    </div></section>`);
    if (S.eingerichtet) {
      teile.push(`<section class="abschnitt"><div class="karte naechster">
        <div class="text"><div class="lbl">Nächster Schritt</div><div class="satz">${h(S.naechster_schritt)}</div></div>
        <button type="button" class="knopf" data-a="auftrag" data-cmd="${h(S.naechster_command)}">In den Auftrag</button>
        <button type="button" class="knopf haupt" data-a="auftrag" data-cmd="${h(S.naechster_command)}" data-sofort="1">${icon('senden')} Loslegen</button>
      </div></section>`);
      teile.push(`<section class="abschnitt">${zahlenHtml()}</section>`);
    }
    const bald = (S.termine || []).filter((t) => !t.erledigt && t.tage != null && t.tage <= 14);
    const links = [];
    const rechtsTeile = [];
    if (bald.length || S.abgabe?.tage != null) {
      links.push(`<section class="abschnitt"><h2>Demnächst <button type="button" class="knopf still klein rechts" data-a="reiter" data-v="plan">Plan</button></h2>
        <ul class="liste">${bald.map((t) => terminZeile(t, false)).join('') || '<li class="leer">In den nächsten zwei Wochen steht nichts an.</li>'}</ul></section>`);
    }
    const verlauf = (S.verlauf || []).slice(0, 8);
    if (verlauf.length) {
      rechtsTeile.push(`<section class="abschnitt"><h2>Zuletzt</h2><div class="karte"><ul class="verlauf">${verlauf.map((v) => `<li><span class="wann">${h(wann(v.datum))}</span><span>${h(anzeige(v.was))}</span></li>`).join('')}</ul></div></section>`);
    }
    links.push(`<section class="abschnitt"><h2>Abzeichen <button type="button" class="knopf still klein rechts" data-a="abz-alle">${ui.abzAlle ? 'weniger' : 'alle'}</button></h2><div class="karte">${abzeichenHtml(ui.abzAlle)}</div></section>`);
    teile.push(rechtsTeile.length ? `<div class="zwei gleich"><div>${links.join('')}</div><div>${rechtsTeile.join('')}</div></div>` : links.join(''));
    return teile.join('');
  }

  // ---------- Quellen ----------
  function relevanzHtml(r) {
    if (!r) return '';
    return `<span class="relevanz" title="Relevanz laut Claude: ${r} von 5">${'●'.repeat(r)}<span class="aus">${'●'.repeat(Math.max(0, 5 - r))}</span></span>`;
  }

  function quelleStatusText(q) {
    const teile = [];
    if (q.status === 'genommen') {
      teile.push(q.pdf_vorhanden ? 'PDF' : '<span class="blass">kein PDF</span>');
      teile.push(q.zitate ? `${q.zitate} Zitate` : '<span class="blass">nicht ausgewertet</span>');
    } else if (q.status === 'spaeter') teile.push('später');
    else if (q.status === 'verworfen') teile.push('verworfen');
    return teile.join(' · ');
  }

  function quelleZeile(q) {
    const offen = ui.offen.includes('q:' + q.id);
    const nurLesen = q.herkunft === 'bib';
    const meta = [autorKurz(q), q.jahr, q.venue].filter(Boolean).join(' · ');
    const entscheid = !nurLesen && q.status === 'vorschlag' ? `<span class="entscheid nur-live">
        <button type="button" class="knopf" data-a="q-status" data-id="${h(q.id)}" data-v="genommen">Nehmen</button>
        <button type="button" class="knopf still" data-a="q-status" data-id="${h(q.id)}" data-v="spaeter">Später</button>
        <button type="button" class="knopf still" data-a="q-status" data-id="${h(q.id)}" data-v="verworfen">Verwerfen</button></span>` : '';
    return `<li data-zeile="q:${h(q.id)}">
      <div class="zeile">
        ${waehlKnopf(bQuelle(q))}
        <div class="haupt" data-a="auf" data-id="q:${h(q.id)}" role="button" tabindex="0" aria-expanded="${offen}">
          <div class="titel">${h(q.titel || q.id)}</div>
          <div class="unter">${h(meta)}${q.warum && !offen ? ` <span class="blass">· ${h(q.warum)}</span>` : ''}</div>
        </div>
        <div class="rechts">
          ${q.stern ? `<span class="warm sterne-kurz" title="Deine Sterne">${'★'.repeat(q.stern)}</span>` : ''}
          ${relevanzHtml(q.relevanz)}
          ${q.status !== 'vorschlag' ? `<span class="status">${quelleStatusText(q)}</span>` : ''}
          ${entscheid}
        </div>
      </div>
      ${offen ? quelleDetails(q, nurLesen) : ''}
    </li>`;
  }

  function quelleDetails(q, nurLesen) {
    const doi = q.doi ? `<a href="https://doi.org/${h(q.doi)}" target="_blank" rel="noopener">doi.org/${h(q.doi)}</a>` : '';
    const url = !q.doi && q.url ? `<a href="${h(q.url)}" target="_blank" rel="noopener">${h(q.url.replace(/^https?:\/\//, '').slice(0, 60))}</a>` : '';
    const pdf = q.pdf_vorhanden && q.pdf ? `<a href="${LIVE ? '/datei/' + encodeURI(q.pdf) : dateiLink(q.pdf)}" target="_blank" rel="noopener">PDF öffnen</a>` : (q.open_access ? '<span class="grau">frei verfügbar, noch nicht geladen</span>' : '<span class="blass">noch kein PDF</span>');
    const zitate = q.bibkey && q.zitate ? ` · <a href="${dateiLink(`quellen/zitate/${q.bibkey}.md`)}">${q.zitate} Zitate ansehen</a>` : '';
    const statusWahl = nurLesen || q.status === 'vorschlag' ? '' : `<div class="feld nur-live"><span class="lbl">Entscheidung</span><span class="entscheid">
      ${['genommen', 'spaeter', 'verworfen', 'vorschlag'].filter((s) => s !== q.status).map((s) => `<button type="button" class="knopf klein${s === 'genommen' ? '' : ' still'}" data-a="q-status" data-id="${h(q.id)}" data-v="${s}">${{ genommen: 'Nehmen', spaeter: 'Später', verworfen: 'Verwerfen', vorschlag: 'Zurück zu Vorschlägen' }[s]}</button>`).join('')}
    </span></div>`;
    return `<div class="details">
      ${q.kurz ? `<div class="feld"><span class="lbl">Inhalt</span><span>${h(q.kurz)}</span></div>` : ''}
      ${q.warum ? `<div class="feld"><span class="lbl">Warum</span><span>${h(q.warum)}</span></div>` : ''}
      <div class="feld"><span class="lbl">Kapitel</span><span>${(q.kapitel || []).length ? h(q.kapitel.join(', ')) : '<span class="blass">noch nicht zugeordnet</span>'}</span></div>
      <div class="feld"><span class="lbl">Volltext</span><span>${pdf}${zitate}${doi ? ' · ' + doi : ''}${url ? ' · ' + url : ''}</span></div>
      ${nurLesen ? '<div class="feld"><span class="lbl">Herkunft</span><span class="grau">steht direkt in literatur.bib</span></div>' : `
      <div class="feld"><span class="lbl">Deine Sterne</span><span class="sterne">${[1, 2, 3].map((n) => `<button type="button" class="${(q.stern || 0) >= n ? 'an' : ''}" data-a="q-stern" data-id="${h(q.id)}" data-v="${(q.stern || 0) === n ? 0 : n}" aria-label="${n} Sterne" ${LIVE ? '' : 'disabled'}>${icon('stern')}</button>`).join('')}</span></div>
      <div class="feld"><span class="lbl">Markierungen</span><span class="marken">${MARKIERUNGEN.map((m) => `<button type="button" class="marke${(q.markierungen || []).includes(m) ? ' an' : ''}" data-a="q-marke" data-id="${h(q.id)}" data-v="${m}" aria-pressed="${(q.markierungen || []).includes(m)}" ${LIVE ? '' : 'disabled'}>${m}</button>`).join('')}</span></div>
      <div class="feld"><span class="lbl">Notiz</span><textarea data-notiz="${h(q.id)}" placeholder="Was dir auffällt, wofür du sie nutzen willst ..." ${LIVE ? '' : 'readonly'}>${h(q.notiz || '')}</textarea></div>
      ${statusWahl}`}
      <div class="feld"><span class="lbl">Schlüssel</span><span class="mono grau">${q.bibkey ? h(q.bibkey) : 'noch kein Schlüssel'} · ${h(q.herkunft || '')}${q.hinzugefuegt ? ' · ' + datumDe(q.hinzugefuegt) : ''}</span></div>
    </div>`;
  }

  function quellen() {
    const Q = S.quellen || { liste: [], zaehler: {}, eingang: [] };
    const z = Q.zaehler || {};
    const filter = [['vorschlag', 'Vorschläge'], ['genommen', 'Genommen'], ['spaeter', 'Später'], ['verworfen', 'Verworfen']];
    const such = ui.suche.trim().toLowerCase();
    let liste = (Q.liste || []).filter((q) => q.status === ui.filter);
    if (such) liste = liste.filter((q) => [q.titel, (q.autoren || []).join(' '), q.venue, q.notiz, q.bibkey, q.warum, (q.markierungen || []).join(' '), (q.kapitel || []).join(' ')].join(' ').toLowerCase().includes(such));
    const sort = {
      relevanz: (a, b) => ((b.stern || 0) - (a.stern || 0)) || ((b.relevanz || 0) - (a.relevanz || 0)),
      jahr: (a, b) => (Number(b.jahr) || 0) - (Number(a.jahr) || 0),
      neu: (a, b) => String(b.hinzugefuegt || '').localeCompare(String(a.hinzugefuegt || '')),
      kapitel: (a, b) => String((a.kapitel || [])[0] || 'zz').localeCompare(String((b.kapitel || [])[0] || 'zz'), 'de', { numeric: true }),
    }[ui.sortierung] || (() => 0);
    liste.sort(sort);
    const leerText = {
      vorschlag: 'Keine offenen Vorschläge. Lass Claude recherchieren oder lade eigene PDFs hoch.',
      genommen: 'Noch keine Quelle genommen.',
      spaeter: 'Nichts zurückgestellt.',
      verworfen: 'Nichts verworfen.',
    }[ui.filter];
    const eingang = (Q.eingang || []);
    return `
      ${eingang.length ? `<section class="abschnitt"><h2>Eingang <span class="rechts"><button type="button" class="knopf klein haupt" data-a="auftrag" data-cmd="/quellen" data-sofort="1">Claude verarbeiten lassen</button></span></h2>
        <ul class="liste">${eingang.map((d) => `<li><div class="zeile">${waehlKnopf(bDatei('quellen/eingang/' + d.name))}<div class="haupt"><div class="titel">${h(d.name)}</div><div class="unter mono">${Math.max(1, Math.round(d.groesse / 1024))} KB · ${h(wann(d.geaendert))}</div></div></div></li>`).join('')}</ul></section>` : ''}
      <div class="filter" role="group" aria-label="Filter">${filter.map(([id, name]) => `<button type="button" data-a="filter" data-v="${id}" aria-pressed="${ui.filter === id}">${name}<span class="zahl-klein">${z[id] || 0}</span></button>`).join('')}</div>
      <div class="leiste">
        <input type="search" id="suche" placeholder="Suchen in Titel, Autoren, Notizen ..." value="${h(ui.suche)}" aria-label="Quellen durchsuchen">
        <select id="sortierung" aria-label="Sortierung">
          ${[['relevanz', 'Wichtigste zuerst'], ['jahr', 'Neueste Jahre'], ['neu', 'Zuletzt hinzugefügt'], ['kapitel', 'Nach Kapitel']].map(([v, n]) => `<option value="${v}" ${ui.sortierung === v ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
        <button type="button" class="knopf" data-a="auftrag" data-cmd="/recherche">${icon('lupe')} Neue Recherche</button>
      </div>
      <section class="abschnitt">
        <ul class="liste">${liste.map(quelleZeile).join('') || `<li class="leer leer-zeile"><span>${h(leerText)}</span>${ui.filter === 'vorschlag' && !such ? `<button type="button" class="knopf haupt" data-a="auftrag" data-cmd="/recherche">${icon('lupe')} Recherche starten</button>` : ''}</li>`}</ul>
      </section>
      <section class="abschnitt nur-live">
        <div class="drop" id="drop" role="button" tabindex="0">PDFs oder andere Dateien hierher ziehen oder klicken. Sie landen im Eingang, Claude sortiert sie mit <span class="mono">/quellen</span> ein.</div>
      </section>
      <p class="grau" style="font-size:13px">${zahl(Q.bib_anzahl || 0)} Einträge im Literaturverzeichnis · ${zahl(Q.ausgewertet || 0)} ausgewertet · Claude schlägt vor, du entscheidest.</p>`;
  }

  // ---------- Kapitel ----------
  function kapitelZeile(k) {
    const pz = k.woerter_ziel ? Math.min(100, Math.round((k.woerter / k.woerter_ziel) * 100)) : 0;
    const freigabe = k.status !== 'final' && (k.status === 'entwurf' || k.status === 'geprueft');
    return `<li><div class="zeile">
      ${waehlKnopf(bKapitel(k))}
      <div class="haupt" ${k.vorhanden ? `data-a="link" data-href="${h(dateiLink(k.datei))}" role="link" tabindex="0" title="In VS Code öffnen"` : ''}>
        <div class="titel"><span class="mono grau">${h(k.nr)}</span> ${h(k.titel || 'ohne Titel')}</div>
        <div class="unter">${STATUS_NAME[k.status] || anzeige(k.status)}${k.note_schaetzung ? ` · Note etwa ${h(k.note_schaetzung)}` : ''}${k.offene_punkte ? ` · <span class="warm">${k.offene_punkte} offene Punkte</span>` : ''}${k.ueber_budget ? ' · <span class="warm">über Budget</span>' : ''}</div>
      </div>
      <div class="kap-balken"><span class="mono">${zahl(k.woerter)}${k.woerter_ziel ? ' / ' + zahl(k.woerter_ziel) : ''}</span>
        ${k.woerter_ziel ? `<div class="balken${k.ueber_budget ? ' warm' : ''}"><i style="width:${pz}%"></i></div>` : ''}</div>
      <div class="rechts kap-rechts">
        <button type="button" class="icon" data-a="auftrag" data-cmd="/schreiben" data-text="${h(k.nr)}" title="Schreiben oder überarbeiten" aria-label="Kapitel ${h(k.nr)} schreiben">${icon('stift')}</button>
        <button type="button" class="icon" data-a="auftrag" data-cmd="/pruefen" data-text="${h(k.nr)}" title="Prüfen lassen" aria-label="Kapitel ${h(k.nr)} prüfen">${icon('lupe')}</button>
        <span class="freigabe-platz">${freigabe ? `<button type="button" class="knopf klein nur-live" data-a="freigeben" data-nr="${h(k.nr)}">Freigeben</button>` : ''}</span>
      </div>
    </div></li>`;
  }

  function kapitel() {
    const K = S.kapitel || [];
    const doks = S.dokumente || {};
    const dokLinks = [['thema', 'Thema'], ['expose', 'Exposé'], ['gliederung', 'Gliederung'], ['stil', 'Stil'], ['tagebuch', 'Tagebuch']]
      .filter(([id]) => doks[id]).map(([id, n]) => `<a class="knopf klein" href="${h(dateiLink(doks[id].pfad))}">${icon('oeffnen')} ${n}</a>`).join('');
    const pdf = S.pdf?.vorhanden ? `<a class="knopf klein" href="${LIVE ? '/Arbeit.pdf' : dateiLink('Arbeit.pdf')}" target="_blank" rel="noopener">${icon('oeffnen')} Arbeit.pdf <span class="blass mono">${h(wann(S.pdf.geaendert))}</span></a>` : '';
    if (!K.length) {
      return `<section class="abschnitt"><div class="karte leer">Die Kapitel entstehen, sobald die Gliederung steht. Bis dahin führt dich <span class="mono">/weiter</span> durch Thema, Recherche und Exposé.
        <div style="margin-top:12px"><button type="button" class="knopf haupt" data-a="auftrag" data-cmd="${h(S.naechster_command || '/weiter')}" data-sofort="1">${icon('senden')} Nächster Schritt</button></div></div></section>
        ${dokLinks || pdf ? `<section class="abschnitt"><h2>Dokumente</h2><div class="dokumente">${dokLinks}${pdf}</div></section>` : ''}`;
    }
    const zaehl = {}; K.forEach((k) => { zaehl[k.status] = (zaehl[k.status] || 0) + 1; });
    const gruppen = new Map();
    K.forEach((k) => { const g = k.hauptkapitel; if (!gruppen.has(g)) gruppen.set(g, []); gruppen.get(g).push(k); });
    const w = S.woerter || {};
    const zeilen = [...gruppen.entries()].map(([nr, ks]) => {
      const summe = ks.reduce((s, k) => s + k.woerter, 0); const ziel = ks.reduce((s, k) => s + (k.woerter_ziel || 0), 0);
      const t = ks[0].hauptkapitel_titel || (S.hauptkapitel || []).find((x) => String(x.nr) === String(nr))?.titel || '';
      return `<li><div class="haupt-kopf"><span>${h(nr)} ${h(t || 'Kapitel ' + nr)}</span><span class="mono">${zahl(summe)}${ziel ? ' / ' + zahl(ziel) : ''} Wörter</span></div>
        <ul class="liste" style="border:0;border-radius:0">${ks.map(kapitelZeile).join('')}</ul></li>`;
    }).join('');
    const sonder = (S.sonderTexte || []).map((d) => `<a class="knopf klein" href="${h(dateiLink('arbeit/kapitel/' + d.name))}">${icon('oeffnen')} ${h(d.name.replace(/^\d+-|\.md$/g, ''))} <span class="blass mono">${zahl(d.woerter)}</span></a>`).join('');
    const ohne = (S.kapitelOhneEintrag || []).map((d) => `<li><div class="zeile"><div class="haupt" data-a="link" data-href="${h(dateiLink('arbeit/kapitel/' + d.name))}" role="link" tabindex="0"><div class="titel">${h(d.name)}</div><div class="unter">nicht in der Gliederung · ${zahl(d.woerter)} Wörter</div></div></div></li>`).join('');
    return `
      <section class="abschnitt"><h2>Stand <span class="rechts mono grau">${Object.entries(zaehl).map(([s, n]) => `${n} ${STATUS_NAME[s] || s}`).join(' · ')}</span></h2>
        <div class="karte"><div class="zahl">${zahl(w.gesamt)} <small>${w.ziel ? '/ ' + zahl(w.ziel) : ''} Wörter · etwa ${zahl(w.seiten_geschaetzt)} Seiten</small></div>
        ${w.ziel ? `<div class="balken"><i style="width:${w.prozent || 0}%"></i></div>` : ''}</div></section>
      <section class="abschnitt"><h2>Gliederung</h2><ul class="liste">${zeilen}</ul></section>
      ${ohne ? `<section class="abschnitt"><h2>Weitere Texte</h2><ul class="liste">${ohne}</ul></section>` : ''}
      ${dokLinks || pdf || sonder ? `<section class="abschnitt"><h2>Dokumente</h2><div class="dokumente">${dokLinks}${sonder}${pdf}</div></section>` : ''}`;
  }

  // ---------- Plan ----------
  function terminZeile(t, mitAktionen = true) {
    const rot = t.ueberfaellig;
    return `<li><div class="zeile">
      ${waehlKnopf(bTermin(t))}
      <div class="haupt"><div class="titel${t.erledigt ? ' durch' : ''}">${h(t.titel)}</div>
        <div class="unter"><span class="mono">${h(datumDe(t.datum))}${t.zeit ? ' ' + h(t.zeit) : ''}</span> · ${h(ART_NAME[t.art] || t.art)}${t.notiz ? ' · ' + h(t.notiz) : ''}</div></div>
      <div class="rechts"><span class="status ${rot ? 'rot' : ''}">${t.erledigt ? 'erledigt' : relTage(t.tage)}</span>
        ${mitAktionen ? `<button type="button" class="icon erledigt-knopf nur-live${t.erledigt ? ' an' : ''}" data-a="t-erledigt" data-id="${h(t.id)}" data-v="${t.erledigt ? '0' : '1'}" aria-pressed="${!!t.erledigt}" title="${t.erledigt ? 'Wieder öffnen' : 'Als erledigt abhaken'}" aria-label="${t.erledigt ? 'Wieder öffnen' : 'Erledigt'}: ${h(t.titel)}">${icon('haken')}</button>
        <button type="button" class="icon nur-live" data-a="t-loeschen" data-id="${h(t.id)}" title="Löschen" aria-label="Termin löschen: ${h(t.titel)}">${icon('muell')}</button>` : ''}</div>
    </div></li>`;
  }

  function wochenHtml() {
    const heute = new Date(); heute.setHours(0, 0, 0, 0);
    const start = new Date(heute); start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 7); // Montag der Vorwoche
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
      const kw = kalenderwoche(w);
      zeilen.push(`<div class="woche"><span class="kw">KW ${kw} · ${datumKurz(isoTag(w))}</span>${tage.join('')}<span class="was">${h(was.join(' · '))}</span></div>`);
    }
    return `<div class="wochen">${zeilen.join('')}</div>
      <p class="grau" style="font-size:12.5px;margin-top:8px">Farbig: an diesem Tag gearbeitet · Punkt: Termin · schraffiert: Pufferwoche vor der Abgabe · gestrichelt: freier Tag.</p>`;
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
    return `
      <div class="zwei">
        <div>
          <section class="abschnitt"><h2>Termine und Fristen</h2>
            <ul class="liste">${offen.map((t) => terminZeile(t)).join('') || '<li class="leer">Noch keine Termine. Trag Betreuungstreffen, Laborzeiten und Fristen ein.</li>'}
            ${erledigt.length ? `<li class="trenner">erledigt</li>${erledigt.slice(-10).reverse().map((t) => terminZeile(t)).join('')}` : ''}</ul>
          </section>
          <section class="abschnitt nur-live"><h2>Termin eintragen</h2>
            <form class="formular karte" id="termin-form">
              <input type="date" name="datum" required aria-label="Datum">
              <input type="time" name="zeit" aria-label="Uhrzeit">
              <input type="text" name="titel" required placeholder="Was steht an?" aria-label="Titel" class="titel-feld">
              <select name="art" aria-label="Art">${Object.entries(ART_NAME).map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select>
              <button type="submit" class="knopf haupt">Eintragen</button>
              <input type="text" name="notiz" placeholder="Notiz, optional" aria-label="Notiz" class="notiz-feld">
            </form>
          </section>
        </div>
        <div>
          <section class="abschnitt"><h2>Meilensteine</h2>
            <ul class="liste">${(S.phasen || []).map((ph, i) => `<li><div class="zeile"><span class="mono grau" style="width:18px">${i + 1}</span>
              <div class="haupt"><div class="titel" style="${ph.status === 'offen' ? 'font-weight:450;color:var(--text-2)' : ''}">${h(ph.name)}</div></div>
              <span class="status">${ph.status === 'erledigt' ? 'erledigt ' + (ph.datum ? datumKurz(ph.datum) : '') : ph.status === 'aktiv' ? 'jetzt' : ''}</span></div></li>`).join('')}
              ${S.abgabe?.datum ? `<li><div class="zeile"><span class="mono grau" style="width:18px"></span><div class="haupt"><div class="titel">Abgabetermin</div></div><span class="status ${S.abgabe.tage < 0 ? 'rot' : ''}">${h(datumDe(S.abgabe.datum))} · ${relTage(S.abgabe.tage)}</span></div></li>` : ''}
            </ul>
          </section>
        </div>
      </div>
      <section class="abschnitt"><h2>${S.abgabe?.datum ? 'Wochen bis zur Abgabe' : 'Die nächsten Wochen'}${S.abgabe?.datum ? '' : ' <span class="rechts grau" style="font-family:var(--sans);font-size:13px">Abgabedatum fehlt noch, /start legt es fest</span>'}</h2>${wochenHtml()}</section>`;
  }

  // ---------- Hilfe ----------
  const FAQ = [
    ['Ich klicke auf „An Claude“, aber nichts passiert.',
      'Dann blockiert der Browser den Sprung nach VS Code. Klick auf das Kopier-Symbol neben dem Knopf, öffne in VS Code das Claude-Fenster (Symbol oben rechts oder Strg+Esc) und füge den Auftrag mit Strg+V ein.'],
    ['Das Dashboard zeigt „Kopie“ statt „live“.',
      'Du siehst die statische Kopie (dashboard.html). Tipp in Claude /dashboard ein, dann startet die Live-Ansicht mit allen Knöpfen.'],
    ['Claude fragt so viel.',
      'Das ist Absicht: Jede Entscheidung über deine Arbeit triffst du. Wenn dich eine Art von Frage nervt, sag es Claude. Es merkt sich das in arbeit/stil.md unter „So arbeite ich“.'],
    ['Das PDF baut nicht.',
      'Tipp /pdf ein. Claude übersetzt die Fehlermeldung und repariert, was geht. Hilft das nicht: /hilfe das PDF baut nicht.'],
    ['Ich komme nicht an ein Paper (Login der Bibliothek).',
      'Sag Claude, welches Paper du brauchst. Es öffnet einen Browser, du meldest dich einmal selbst bei der Bibliothek an, danach kann Claude den Volltext laden. Passwörter gibst du nie an Claude weiter.'],
    ['Ich habe Angst, etwas kaputt zu machen.',
      'Alles ist versioniert. Mit /sync sicherst du auf GitHub, und nichts wird ohne Rückweg gelöscht. Im Zweifel: /hilfe.'],
  ];

  function hilfe() {
    const sys = !LIVE ? '<li class="leer">Den Systemcheck gibt es in der Live-Ansicht.</li>'
      : !checkErgebnis ? '<li class="leer">Prüfe ...</li>'
      : !checkErgebnis.verfuegbar ? '<li class="leer">Systemcheck ist noch nicht installiert. Tipp /hilfe ein.</li>'
      : checkErgebnis.ergebnisse.map((e) => `<li><div class="zeile"><span class="${e.ok ? 'ok' : e.ok === false ? 'warm' : 'blass'}" style="width:18px;display:inline-flex">${e.ok ? icon('haken') : e.ok === false ? '!' : '–'}</span>
          <div class="haupt"><div class="titel">${h(e.name)}</div>${e.wert && e.ok ? `<div class="unter mono wert" title="${h(e.wert)}">${h(String(e.wert))}</div>` : ''}${e.hinweis ? `<div class="unter" style="white-space:normal">${h(e.hinweis)}</div>` : ''}</div></div></li>`).join('');
    const docs = (S.dokumente?.docs || []);
    return `
      <section class="abschnitt"><h2>So arbeitest du mit dem Kit</h2><div class="karte">
        <ol style="margin:0;padding-left:20px;display:grid;gap:6px">
          <li><strong>Einmal einrichten</strong> mit <span class="mono">/start</span>. Claude fragt dich alles Nötige.</li>
          <li><strong>Jeden Tag</strong> mit <span class="mono">/weiter</span> beginnen. Claude sagt, was dran ist, und stellt dir Fragen dazu.</li>
          <li><strong>Hier im Dashboard</strong> behältst du den Überblick, entscheidest über Quellen und schickst Aufträge an Claude. Wähl mit dem Kreis an einer Zeile Kapitel, Quellen oder Termine als Bezug aus.</li>
          <li><strong>Am Ende des Tages</strong> <span class="mono">/sync</span>, damit alles auf GitHub gesichert ist.</li>
        </ol></div></section>
      <section class="abschnitt"><h2>Alle Befehle</h2><div class="befehle">${COMMANDS.map((c) => `<div class="befehl">
        <div class="kopf"><span class="cmd">${c.cmd}</span><span class="grau" style="font-size:13.5px">${h(c.kurz)}</span>
          <button type="button" class="knopf klein" data-a="auftrag" data-cmd="${c.cmd}">wählen</button></div>
        <p>${h(c.lang)}</p><span class="bsp">Beispiel: ${h(c.bsp)}</span></div>`).join('')}</div></section>
      <div class="zwei">
        <div>
          <section class="abschnitt faq"><h2>Wenn es hakt</h2><div class="karte">${FAQ.map(([f, a]) => `<details><summary>${h(f)}</summary><p>${h(a)}</p></details>`).join('')}</div></section>
          ${docs.length ? `<section class="abschnitt"><h2>Anleitungen</h2><div class="dokumente">${docs.map((d) => `<a class="knopf klein" href="${h(dateiLink('docs/' + d.name))}">${icon('oeffnen')} ${h(d.name.replace(/\.md$/, '').replace(/-/g, ' '))}</a>`).join('')}</div></section>` : ''}
        </div>
        <section class="abschnitt system"><h2>Technik <span class="rechts">
          <button type="button" class="knopf still klein nur-live" data-a="check-neu">neu prüfen</button>
          <button type="button" class="knopf klein" data-a="auftrag" data-cmd="/hilfe" data-text="Bitte prüfe die Technik und repariere, was geht.">Reparieren lassen</button></span></h2>
          <ul class="liste">${sys}</ul>
          <p class="fuss mono">Kit ${h(S.version || '?')} · <span title="${h(S.root || '')}">${h(String(S.root || '').split(/[\\/]/).filter(Boolean).slice(-1)[0] || '')}</span></p>
        </section>
      </div>`;
  }

  async function ladeCheck(neu) {
    if (!LIVE) return;
    if (checkErgebnis && !neu) return;
    try { checkErgebnis = await (await fetch('/api/check')).json(); }
    catch { checkErgebnis = { verfuegbar: false, ergebnisse: [] }; }
    if (ui.reiter === 'hilfe') zeichneInhalt();
  }

  // ---------- Zeichnen ----------
  function zeichneInhalt() {
    const main = $('#inhalt');
    const y = window.scrollY;
    const fn = { uebersicht, quellen, kapitel, plan, hilfe }[ui.reiter] || uebersicht;
    main.innerHTML = fn();
    window.scrollTo(0, y);
    markiereKreise();
    if (ui.reiter === 'hilfe') ladeCheck(false);
  }

  function zeichneAlles() {
    zeichneKopf(); zeichneReiter(); zeichneKonfig(); zeichneInhalt();
  }

  function darfNeuZeichnen() {
    if (Date.now() < sperreBis) return false;
    const a = document.activeElement;
    if (a && $('#inhalt').contains(a) && /^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName) && a.id !== 'suche') return false;
    return true;
  }

  let nachladenGeplant = null;
  async function holeStand() {
    try {
      const r = await fetch('/api/stand', { cache: 'no-store' });
      if (!r.ok) return;
      const neu = await r.json();
      S = neu;
      if (darfNeuZeichnen()) { zeichneKopf(); zeichneInhalt(); }
      else { clearTimeout(nachladenGeplant); nachladenGeplant = setTimeout(() => { if (darfNeuZeichnen()) { zeichneKopf(); zeichneInhalt(); } else holeStand(); }, 1500); }
    } catch {}
  }

  function verbinde() {
    if (!LIVE || !window.EventSource) return;
    let version = null;
    const es = new EventSource('/ereignisse');
    es.addEventListener('stand', (e) => {
      zeichneKopf.verbunden = true;
      let v; try { v = JSON.parse(e.data).version; } catch {}
      if (version !== null && v !== version) holeStand();
      else if (version === null) { $('.livepunkt')?.classList.add('an'); }
      version = v;
    });
    es.onerror = () => { zeichneKopf.verbunden = false; $('.livepunkt')?.classList.remove('an'); };
  }

  // ---------- Aktionen ----------
  function findeQuelle(id) { return (S.quellen?.liste || []).find((q) => q.id === id); }

  async function quelleSetzen(id, aenderung, zeileEl) {
    const q = findeQuelle(id); if (!q) return;
    const vorher = { status: q.status, stern: q.stern, markierungen: [...(q.markierungen || [])], notiz: q.notiz };
    const statusWechsel = aenderung.status && aenderung.status !== q.status;
    Object.assign(q, aenderung);
    if (statusWechsel && zeileEl) {
      // an Ort und Stelle wegschrumpfen, dann neu zeichnen
      sperreBis = Date.now() + 600;
      zeileEl.style.maxHeight = zeileEl.offsetHeight + 'px';
      requestAnimationFrame(() => { zeileEl.classList.add('schrumpft'); zeileEl.style.maxHeight = '0px'; });
      setTimeout(() => { sperreBis = 0; zeichneInhalt(); }, 420);
    } else zeichneInhalt();
    try {
      await post('/api/quelle', { id, ...aenderung });
      if (statusWechsel) {
        const wort = { genommen: 'Genommen', spaeter: 'Zurückgestellt', verworfen: 'Verworfen', vorschlag: 'Zurück bei den Vorschlägen' }[aenderung.status];
        toast(`${wort}: ${(q.titel || '').slice(0, 60)}`, async () => {
          Object.assign(q, { status: vorher.status });
          zeichneInhalt();
          try { await post('/api/quelle', { id, status: vorher.status }); } catch (e) { toast(e.message); }
        });
      }
    } catch (e) {
      Object.assign(q, vorher); zeichneInhalt(); toast(e.message);
    }
  }

  async function hochladen(dateien) {
    if (!LIVE) { toast('Hochladen geht nur in der Live-Ansicht.'); return; }
    const liste = [...dateien]; if (!liste.length) return;
    let ok = 0;
    for (const f of liste) {
      try {
        const r = await fetch('/api/upload?name=' + encodeURIComponent(f.name), { method: 'POST', body: f });
        const j = await r.json();
        if (!r.ok) throw new Error(j.fehler || 'Upload fehlgeschlagen');
        ui.bausteine.push(bDatei(j.pfad)); ok++;
      } catch (e) { toast(`${f.name}: ${e.message}`); }
    }
    if (ok) {
      if (!ui.command) ui.command = '/quellen';
      merke(); zeichneKonfig();
      toast(`${ok} ${ok === 1 ? 'Datei' : 'Dateien'} im Eingang. „An Claude“ lässt sie einsortieren.`);
      holeStand();
    }
  }

  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-a]');
    if (!e.target.closest('.menue-anker')) schliesseMenue();
    if (!el) return;
    const a = el.dataset.a;
    switch (a) {
      case 'reiter': ui.reiter = el.dataset.v; merke(); zeichneReiter(); zeichneInhalt(); window.scrollTo(0, 0); break;
      case 'waehl': { let b; try { b = JSON.parse(el.dataset.b); } catch { return; } schalteBaustein(b); break; }
      case 'baustein-weg': ui.bausteine.splice(Number(el.dataset.i), 1); merke(); zeichneBausteine(); markiereKreise(); break;
      case 'bausteine-mehr': ui.alleBausteine = !ui.alleBausteine; merke(); zeichneBausteine(); break;
      case 'cmd-weg': ui.command = ''; merke(); zeichneKonfig(); $('#prompt').focus(); break;
      case 'menue': if ($('.menue')) schliesseMenue(); else zeigeMenue(el); break;
      case 'cmd-waehlen': ui.command = el.dataset.v; merke(); schliesseMenue(); zeichneKonfig(); $('#prompt').focus(); break;
      case 'senden': senden(); break;
      case 'kopieren': kopieren(); break;
      case 'upload': $('#datei-wahl').click(); break;
      case 'auftrag': auftrag(el.dataset.cmd || '', el.dataset.text || '', el.dataset.sofort === '1'); break;
      case 'phase': ui.phaseInfo = ui.phaseInfo === el.dataset.v ? null : el.dataset.v; merke(); zeichneInhalt(); break;
      case 'abz-alle': ui.abzAlle = !ui.abzAlle; merke(); zeichneInhalt(); break;
      case 'auf': {
        const id = el.dataset.id; const i = ui.offen.indexOf(id);
        if (i >= 0) ui.offen.splice(i, 1); else ui.offen.push(id);
        ui.offen = ui.offen.slice(-30); merke(); zeichneInhalt(); break;
      }
      case 'link': window.location.href = el.dataset.href; break;
      case 'filter': ui.filter = el.dataset.v; merke(); zeichneInhalt(); break;
      case 'q-status': if (!LIVE) return; quelleSetzen(el.dataset.id, { status: el.dataset.v }, el.closest('li[data-zeile]')); break;
      case 'q-stern': if (!LIVE) return; quelleSetzen(el.dataset.id, { stern: Number(el.dataset.v) }); break;
      case 'q-marke': {
        if (!LIVE) return;
        const q = findeQuelle(el.dataset.id); if (!q) return;
        const m = new Set(q.markierungen || []); m.has(el.dataset.v) ? m.delete(el.dataset.v) : m.add(el.dataset.v);
        quelleSetzen(q.id, { markierungen: [...m] }); break;
      }
      case 'freigeben':
        try { await post('/api/kapitel/freigeben', { nr: el.dataset.nr }); toast(`Kapitel ${el.dataset.nr} freigegeben.`); holeStand(); }
        catch (err) { toast(err.message); }
        break;
      case 't-erledigt':
        try { await post('/api/termin/erledigt', { id: el.dataset.id, erledigt: el.dataset.v === '1' }); toast(el.dataset.v === '1' ? 'Abgehakt.' : 'Wieder offen.'); holeStand(); }
        catch (err) { toast(err.message); }
        break;
      case 't-loeschen': {
        const t = (S.termine || []).find((x) => x.id === el.dataset.id);
        try {
          await post('/api/termin/loeschen', { id: el.dataset.id });
          toast(`Gelöscht: ${t ? t.titel : 'Termin'}`, t ? async () => { await post('/api/termin', t); holeStand(); } : null);
          holeStand();
        } catch (err) { toast(err.message); }
        break;
      }
      case 'check-neu': checkErgebnis = null; zeichneInhalt(); ladeCheck(true); break;
      case 'toast-zurueck': if (toast.zurueck) { const f = toast.zurueck; toast.zurueck = null; $('#toast').classList.remove('an'); f(); } break;
    }
  });

  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.id === 'datei-wahl') { await hochladen(el.files); el.value = ''; return; }
    if (el.id === 'sortierung') { ui.sortierung = el.value; merke(); zeichneInhalt(); return; }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'suche') {
      ui.suche = e.target.value; merke();
      const pos = e.target.selectionStart;
      zeichneInhalt();
      const s = $('#suche'); if (s) { s.focus(); s.setSelectionRange(pos, pos); }
    }
  });

  document.addEventListener('focusout', async (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.notiz !== undefined && LIVE) {
      const q = findeQuelle(el.dataset.notiz);
      if (q && (q.notiz || '') !== el.value) {
        q.notiz = el.value;
        try { await post('/api/quelle', { id: q.id, notiz: el.value }); toast('Notiz gespeichert.'); } catch (err) { toast(err.message); }
      }
    }
  });

  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'termin-form') return;
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await post('/api/termin', Object.fromEntries(f.entries()));
      e.target.reset(); toast('Termin eingetragen.'); holeStand();
    } catch (err) { toast(err.message); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') schliesseMenue();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-a], [role="link"][data-a]')) { e.preventDefault(); e.target.click(); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.id === 'drop') { e.preventDefault(); $('#datei-wahl').click(); }
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
  document.addEventListener('click', (e) => { if (e.target.id === 'drop') $('#datei-wahl').click(); });

  // Schnittstelle für eigene Anpassungen (arbeit/dashboard-anpassungen.js)
  window.SW = {
    stand: () => S,
    neuZeichnen: () => zeichneAlles(),
    auftrag,
    baustein: (b) => schalteBaustein(b),
    reiter: (id) => { ui.reiter = id; merke(); zeichneReiter(); zeichneInhalt(); },
    toast,
  };

  zeichneAlles();
  verbinde();
})();
