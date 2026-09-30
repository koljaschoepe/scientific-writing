#!/usr/bin/env node
// PDF bauen: Kapitel (Markdown) per Pandoc nach LaTeX, dann LuaLaTeX + Biber.
//
// Aufruf:
//   node kit/werkzeuge/pdf.mjs                fertiges PDF nach Arbeit.pdf
//   node kit/werkzeuge/pdf.mjs entwurf        Entwurf mit Platzhaltern und Wasserzeichen
//   node kit/werkzeuge/pdf.mjs expose         Exposé (arbeit/expose/expose.md) als eigenes PDF
//   node kit/werkzeuge/pdf.mjs check          nur prüfen, ob Pandoc und LaTeX da sind
// Optionen:
//   --json      Ergebnis als JSON auf stdout (für Skills und Dashboard)
//   --nur-tex   nur LaTeX-Dateien erzeugen, nicht kompilieren
//   --oeffnen   PDF nach Erfolg im Standardprogramm öffnen
//
// Nur Node-Built-ins, läuft auf Windows und macOS. Exit-Codes: 0 ok,
// 1 Fehler beim Bauen, 2 Werkzeug fehlt.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WIN = process.platform === 'win32';
const MAC = process.platform === 'darwin';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const P = (...teile) => path.join(ROOT, ...teile);
const VORLAGE = P('latex', 'vorlage');
const KAPITEL_TEX = P('latex', 'kapitel');
const BUILD = P('latex', 'build');

// ---------------------------------------------------------------------------
// Kleine Helfer
// ---------------------------------------------------------------------------

function leseJson(datei, standard) {
  try { return JSON.parse(fs.readFileSync(datei, 'utf8')); } catch { return standard; }
}
function leseText(datei) {
  try { return fs.readFileSync(datei, 'utf8'); } catch { return ''; }
}
function schreibe(datei, inhalt) {
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  fs.writeFileSync(datei, inhalt, 'utf8');
}
function kopiereOrdner(von, nach) {
  if (!fs.existsSync(von)) return;
  fs.mkdirSync(nach, { recursive: true });
  for (const e of fs.readdirSync(von, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const a = path.join(von, e.name), b = path.join(nach, e.name);
    if (e.isDirectory()) kopiereOrdner(a, b); else fs.copyFileSync(a, b);
  }
}
function istLeer(v) { return v === undefined || v === null || String(v).trim() === ''; }

// LaTeX-Sonderzeichen in Config-Werten maskieren.
function tex(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

const MONATE_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONATE_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function datumLang(iso, englisch) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return String(iso || '');
  const [j, mo, t] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  return englisch ? `${MONATE_EN[mo]} ${t}, ${j}` : `${t}. ${MONATE_DE[mo]} ${j}`;
}

// Programm im PATH und an den üblichen Installationsorten suchen.
function findeProgramm(name) {
  const home = os.homedir();
  const extra = [];
  if (WIN) {
    const lad = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const pfx86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    extra.push(
      path.join(lad, 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64'),
      path.join(pf, 'MiKTeX', 'miktex', 'bin', 'x64'),
      path.join(pfx86, 'MiKTeX', 'miktex', 'bin'),
      path.join(lad, 'Pandoc'), path.join(pf, 'Pandoc'),
      path.join(home, '.cargo', 'bin'),
      path.join(lad, 'Microsoft', 'WinGet', 'Links'),
    );
    for (const j of [2027, 2026, 2025, 2024]) extra.push(`C:\\texlive\\${j}\\bin\\windows`, `C:\\texlive\\${j}\\bin\\win64`);
  } else {
    extra.push('/Library/TeX/texbin', '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', path.join(home, '.cargo', 'bin'));
    for (const j of [2027, 2026, 2025, 2024]) {
      extra.push(`/usr/local/texlive/${j}/bin/universal-darwin`, `/usr/local/texlive/${j}/bin/x86_64-linux`, `/usr/local/texlive/${j}/bin/aarch64-linux`);
    }
  }
  const dirs = [...(process.env.PATH || '').split(path.delimiter), ...extra].filter(Boolean);
  const endungen = WIN ? ['.exe', '.cmd', '.bat'] : [''];
  for (const d of dirs) {
    for (const e of endungen) {
      const p = path.join(d, name + e);
      try { if (fs.statSync(p).isFile()) return p; } catch { /* weiter */ }
    }
  }
  return null;
}

function starte(programm, args, optionen = {}) {
  const r = spawnSync(programm, args, {
    cwd: optionen.cwd || ROOT,
    input: optionen.input,
    encoding: 'utf8',
    timeout: optionen.timeout || 10 * 60 * 1000,
    maxBuffer: 64 * 1024 * 1024,
    shell: WIN && /\.(cmd|bat)$/i.test(programm),
    env: { ...process.env, ...(optionen.env || {}) },
    windowsHide: true,
  });
  return { code: r.status ?? (r.error ? -1 : 0), out: r.stdout || '', err: r.stderr || '', fehler: r.error };
}

// ---------------------------------------------------------------------------
// Werkzeuge prüfen
// ---------------------------------------------------------------------------

function installHinweise(fehlend) {
  const h = [];
  if (fehlend.includes('pandoc')) {
    h.push(WIN ? 'Pandoc: winget install --id JohnMacFarlane.Pandoc -e'
      : MAC ? 'Pandoc: brew install pandoc' : 'Pandoc: sudo apt install pandoc');
  }
  if (fehlend.includes('latex')) {
    h.push(WIN ? 'LaTeX: winget install --id MiKTeX.MiKTeX -e (danach MiKTeX Console öffnen, "Pakete automatisch installieren" auf Ja stellen)'
      : MAC ? 'LaTeX: brew install --cask mactex-no-gui (rund 6 GB) oder schlank: brew install tectonic'
        : 'LaTeX: sudo apt install texlive-full biber');
  }
  return h;
}

function pruefeWerkzeuge() {
  const w = {
    pandoc: findeProgramm('pandoc'),
    lualatex: findeProgramm('lualatex'),
    biber: findeProgramm('biber'),
    tectonic: findeProgramm('tectonic'),
  };
  w.miktex = false;
  if (w.lualatex) {
    const v = starte(w.lualatex, ['--version'], { timeout: 60000 });
    w.miktex = /MiKTeX/i.test(v.out + v.err);
  }
  w.engine = w.lualatex ? 'lualatex' : (w.tectonic ? 'tectonic' : null);
  const fehlend = [];
  if (!w.pandoc) fehlend.push('pandoc');
  if (!w.engine) fehlend.push('latex');
  w.fehlend = fehlend;
  w.hinweise = installHinweise(fehlend);
  w.pandocVersion = null;
  if (w.pandoc) {
    const v = starte(w.pandoc, ['--version'], { timeout: 60000 });
    const m = /pandoc(?:\.exe)?\s+(\d+)\.(\d+)/i.exec(v.out);
    if (m) w.pandocVersion = [Number(m[1]), Number(m[2])];
  }
  return w;
}

// ---------------------------------------------------------------------------
// Config -> kit-daten.tex
// ---------------------------------------------------------------------------

const TYPEN = {
  seminararbeit: ['Seminararbeit', 'Seminar Paper'],
  hausarbeit: ['Hausarbeit', 'Term Paper'],
  projektarbeit: ['Projektarbeit', 'Project Thesis'],
  bachelorarbeit: ['Bachelorarbeit', 'Bachelor Thesis'],
  masterarbeit: ['Masterarbeit', 'Master Thesis'],
  diplomarbeit: ['Diplomarbeit', 'Diploma Thesis'],
  dissertation: ['Dissertation', 'Dissertation'],
};
const TUDSCR_THESIS = { bachelorarbeit: 'bachelor', masterarbeit: 'master', diplomarbeit: 'diploma', dissertation: 'doctoral' };

// zitation.stil -> biblatex-Optionen und Nachlade-Code.
function bibStil(stil, englisch) {
  switch (stil) {
    case 'chem-acs': return { opt: 'style=chem-acs,biblabel=brackets', extra: '' };
    case 'chem-rsc': return { opt: 'style=chem-rsc', extra: '' };
    case 'chem-angew': return { opt: 'style=chem-angew', extra: '' };
    case 'ieee': return { opt: 'style=ieee', extra: '' };
    case 'apa': return { opt: 'style=apa', extra: '' };
    case 'numeric': return { opt: 'style=numeric-comp,sorting=none', extra: '' };
    case 'authoryear': return { opt: 'style=authoryear,autocite=inline,maxcitenames=2,uniquelist=false', extra: '' };
    case 'harvard-de':
    default:
      // Harvard wie im DACH-Raum üblich: (vgl. Müller/Schmidt 2024, S. 4).
      // "vgl." schreibt man im Markdown als Präfix: [vgl. @key, S. 4].
      return {
        opt: 'style=authoryear,autocite=inline,maxcitenames=2,uniquelist=false,dashed=false,giveninits=true',
        extra: englisch ? '' : '\\DeclareDelimFormat{multinamedelim}{\\addslash}\\DeclareDelimFormat{finalnamedelim}{\\addslash}\\DeclareDelimFormat{nameyeardelim}{\\addspace}',
      };
  }
}

function kitDaten(projekt, optionen) {
  const a = projekt.arbeit || {}, au = projekt.autor || {}, h = projekt.hochschule || {};
  const b = projekt.betreuung || {}, ab = projekt.abgabe || {}, l = projekt.latex || {};
  const v = l.verzeichnisse || {}, r = l.raender_cm || {};
  const en = a.sprache === 'en';
  const typ = (TYPEN[a.typ] || [a.typ || 'Wissenschaftliche Arbeit', a.typ || 'Thesis'])[en ? 1 : 0];
  const tudscr = l.vorlage === 'tudscr';
  const zweiseitig = !!l.zweiseitig;
  const groesse = Number(l.schriftgroesse) || 11;
  const klassenopt = [
    `fontsize=${groesse}pt`, 'paper=a4', zweiseitig ? 'twoside' : 'oneside',
    'parskip=half', 'listof=totoc', 'numbers=noenddot', 'toc=flat',
    zweiseitig ? 'open=right' : 'open=any',
  ];
  if (tudscr) klassenopt.push('cd=true');
  if (optionen.expose) klassenopt.splice(0, klassenopt.length, `fontsize=${groesse}pt`, 'paper=a4', 'oneside', 'parskip=half');
  const logo = logoPfad(projekt);
  const def = (name, wert) => `\\def\\${name}{${wert}}`;
  const flag = (name, an) => `\\newif\\if${name}\\${name}${an ? 'true' : 'false'}`;
  const stil = bibStil((projekt.zitation || {}).stil, en);
  const rand = (x, std) => `${Number(x) || std}cm`;

  const zeilen = [];
  const zeile = (de, eng, wert) => { if (!istLeer(wert)) zeilen.push(`${en ? eng : de}: & ${tex(wert)}\\\\`); };
  zeile('Eingereicht von', 'Submitted by', au.name);
  zeile('Matrikelnummer', 'Student ID', au.matrikel);
  zeile('Studiengang', 'Degree programme', h.studiengang);
  if (zeilen.length) zeilen[zeilen.length - 1] += '[0.5cm]';
  const vorGutachter = zeilen.length;
  zeile('Betreuung', 'Supervisor', b.betreuer);
  zeile('Erstgutachten', 'First examiner', b.erstgutachter);
  zeile('Zweitgutachten', 'Second examiner', b.zweitgutachter);
  if (zeilen.length > vorGutachter) zeilen[zeilen.length - 1] += '[0.5cm]';
  zeile('Abgabe', 'Submission', datumLang(ab.datum, en));

  const w = (de, eng) => (en ? eng : de);
  const zeilenTexte = [
    '% Automatisch erzeugt von kit/werkzeuge/pdf.mjs aus arbeit/projekt.json. Nicht bearbeiten.',
    def('kitKlasse', tudscr ? 'tudscrreprt' : 'scrreprt'),
    def('kitKlassenoptionen', klassenopt.join(',')),
    def('kitTitel', tex(a.titel || w('Titel der Arbeit', 'Thesis title'))),
    def('kitUntertitel', tex(a.untertitel)),
    def('kitTyp', tex(typ)),
    def('kitTudscrThesis', TUDSCR_THESIS[a.typ] || 'diploma'),
    def('kitAutor', tex(au.name || w('Vorname Nachname', 'First Last'))),
    def('kitMatrikel', tex(au.matrikel)),
    def('kitHochschule', tex(h.name)),
    def('kitFakultaet', tex(h.fakultaet)),
    def('kitInstitut', tex(h.institut)),
    def('kitStudiengang', tex(h.studiengang)),
    def('kitOrt', tex(h.ort)),
    def('kitBetreuer', tex(b.betreuer)),
    def('kitErstgutachter', tex(b.erstgutachter)),
    def('kitZweitgutachter', tex(b.zweitgutachter)),
    def('kitAbgabe', tex(datumLang(ab.datum, en))),
    def('kitSchrift', tex(l.schrift)),
    def('kitZeilenabstand', String(Number(l.zeilenabstand) || 1.5)),
    def('kitRandOben', rand(r.oben, 2.5)),
    def('kitRandUnten', rand(r.unten, 2.5)),
    def('kitRandInnen', rand(r.innen, 3)),
    def('kitRandAussen', rand(r.aussen, 2.5)),
    def('kitLogo', logo ? logo.replace(/\\/g, '/') : ''),
    def('kitBibOptionen', stil.opt),
    `\\def\\kitBibNachladen{${stil.extra}}`,
    def('kitDeckblattZeilen', zeilen.join('\n  ')),
    def('kitWortEntwurf', w('ENTWURF', 'DRAFT')),
    def('kitWortExpose', w('Exposé', 'Research Proposal')),
    def('kitWortBetreuung', w('Betreuung', 'Supervisor')),
    def('kitHeute', tex(datumLang(new Date().toISOString().slice(0, 10), en))),
    def('kitWortPlatzhalter', w('Dieses Unterkapitel ist noch nicht geschrieben.', 'This section has not been written yet.')),
    def('kitWortSperrvermerk', w('Sperrvermerk', 'Confidentiality Notice')),
    def('kitWortDanksagung', w('Danksagung', 'Acknowledgements')),
    def('kitWortAbkuerzungen', w('Abkürzungsverzeichnis', 'List of Abbreviations')),
    def('kitWortFormelzeichen', w('Formelzeichen und Symbole', 'List of Symbols')),
    def('kitWortSymbol', w('Symbol', 'Symbol')),
    def('kitWortBedeutung', w('Bedeutung', 'Meaning')),
    def('kitWortEinheit', w('Einheit', 'Unit')),
    def('kitWortHilfsmittel', w('Hilfsmittelverzeichnis und Erklärung zur Nutzung generativer KI', 'List of Aids and Declaration on the Use of Generative AI')),
    def('kitWortVerantwortung', w('Verantwortungsvoller Umgang mit KI-Werkzeugen', 'Responsible Use of AI Tools')),
    def('kitWortAussage', w('Aussage', 'Statement')),
    def('kitWortJa', w('Ja', 'Yes')),
    def('kitWortErklaerung', w('Selbstständigkeitserklärung', 'Declaration of Authorship')),
    def('kitHmAussageEins', w('Ich bin über die Möglichkeiten und Grenzen der verwendeten generativen KI-Werkzeuge informiert.', 'I am informed about the capabilities and limitations of the generative AI tools I used.')),
    def('kitHmAussageZwei', w('Ich habe die Ergebnisse der KI-Werkzeuge auf Richtigkeit geprüft und wo nötig korrigiert.', 'I have checked the results of the AI tools for accuracy and corrected them where necessary.')),
    def('kitHmAussageDrei', w('Die Verantwortung für den Inhalt der Arbeit liegt bei mir, nicht bei den KI-Werkzeugen.', 'I bear responsibility for the content of this thesis, not the AI tools.')),
    flag('kitEnglisch', en),
    flag('kitTudscr', tudscr),
    flag('kitEntwurf', optionen.entwurf),
    flag('kitLogo', !!logo),
    flag('kitAbbildungen', v.abbildungen !== false && optionen.hat.abbildungen),
    flag('kitTabellen', v.tabellen !== false && optionen.hat.tabellen),
    flag('kitAbkuerzungen', v.abkuerzungen !== false && optionen.hat.abkuerzungen),
    flag('kitFormelzeichen', !!v.formelzeichen && optionen.hat.formelzeichen),
    flag('kitHilfsmittel', v.hilfsmittel !== false),
    flag('kitZusammenfassung', (v.zusammenfassung !== false || v.abstract !== false) && (optionen.hat.zusammenfassung || optionen.hat.abstract)),
    flag('kitHatZusammenfassung', v.zusammenfassung !== false && optionen.hat.zusammenfassung),
    flag('kitHatAbstract', v.abstract !== false && optionen.hat.abstract),
    flag('kitErklaerung', v.erklaerung !== false),
    flag('kitSperrvermerk', !!v.sperrvermerk),
    flag('kitDanksagung', !!v.danksagung && optionen.hat.danksagung),
    flag('kitLiteratur', optionen.hat.literatur),
    flag('kitAnhang', optionen.hat.anhang),
  ];
  return zeilenTexte.join('\n') + '\n';
}

function logoPfad(projekt) {
  const l = projekt.latex || {};
  const kandidaten = [];
  if (!istLeer(l.logo)) kandidaten.push(l.logo);
  for (const e of ['pdf', 'png', 'jpg', 'jpeg']) kandidaten.push(`abbildungen/logo.${e}`);
  for (const k of kandidaten) {
    const abs = path.isAbsolute(k) ? k : P(k);
    if (fs.existsSync(abs)) {
      // Im Build-Ordner liegt abbildungen/ als Kopie, sonst absolut verweisen.
      const rel = path.relative(ROOT, abs);
      return rel.startsWith('abbildungen') ? rel.split(path.sep).join('/') : abs;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Markdown-Hilfen: begriffe.md, hilfsmittel.md, zusammenfassung.md
// ---------------------------------------------------------------------------

// Alle Pipe-Tabellen einer Markdown-Datei mit der zugehörigen Überschrift.
function mdTabellen(text) {
  const tabellen = [];
  let ueberschrift = '', aktuell = null;
  for (const roh of text.split(/\r?\n/)) {
    const z = roh.trim();
    const h = /^#{1,6}\s+(.*)$/.exec(z);
    if (h) { ueberschrift = h[1].trim(); aktuell = null; continue; }
    if (z.startsWith('|')) {
      const zellen = z.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      if (zellen.every((c) => /^:?-{2,}:?$/.test(c) || c === '')) continue;
      if (!aktuell) {
        // Zeilen, die nach einem Kommentar oder einer Leerzeile unter derselben
        // Überschrift weitergeführt wurden, gehören zur vorigen Tabelle.
        const vorige = tabellen[tabellen.length - 1];
        if (vorige && vorige.ueberschrift === ueberschrift && vorige.kopf.length === zellen.length && /^\d{4}-\d{2}-\d{2}/.test(zellen[0])) {
          aktuell = vorige; aktuell.zeilen.push(zellen);
        } else { aktuell = { ueberschrift, kopf: zellen.map((c) => c.toLowerCase()), zeilen: [] }; tabellen.push(aktuell); }
      } else aktuell.zeilen.push(zellen);
    } else if (z !== '') aktuell = null;
  }
  return tabellen;
}
const spalte = (kopf, ...namen) => kopf.findIndex((k) => namen.some((n) => k.startsWith(n)));

function begriffeAuswerten(text) {
  const abk = [], formel = [];
  for (const t of mdTabellen(text)) {
    const iAbk = spalte(t.kopf, 'abkürzung', 'abkuerzung', 'abk', 'abbreviation');
    const iSym = spalte(t.kopf, 'symbol', 'formelzeichen');
    if (iAbk >= 0) {
      const iBed = (() => {
        const i = spalte(t.kopf, 'bedeutung', 'langform', 'ausgeschrieben', 'begriff', 'meaning', 'term');
        return i >= 0 && i !== iAbk ? i : (iAbk === 0 ? 1 : 0);
      })();
      for (const z of t.zeilen) if (!istLeer(z[iAbk])) abk.push([z[iAbk], z[iBed] || '']);
    } else if (iSym >= 0) {
      const iBed = spalte(t.kopf, 'bedeutung', 'beschreibung', 'meaning', 'name');
      const iEin = spalte(t.kopf, 'einheit', 'unit');
      for (const z of t.zeilen) if (!istLeer(z[iSym])) formel.push([z[iSym], iBed >= 0 ? z[iBed] : '', iEin >= 0 ? z[iEin] : '']);
    }
  }
  abk.sort((a, b) => a[0].localeCompare(b[0], 'de', { sensitivity: 'base' }));
  return { abk, formel };
}

// Zelleninhalt: Formeln ($...$) und Befehle (\ce{..}, \si{..}) bleiben LaTeX,
// alles andere wird maskiert.
function zelle(s) {
  const teile = String(s || '').split(/(\$[^$]+\$|\\[a-zA-Z]+(?:\{[^}]*\})+)/);
  return teile.map((t, i) => (i % 2 ? t : tex(t))).join('');
}

// Formate (beide werden verstanden):
// - Werkzeugtabelle: | Werkzeug | Version/Modell | Zweck |  (optional Spalte Art: KI/Software)
// - Protokolltabelle unter "## Protokoll": | Datum | Werkzeug | Tätigkeit | Betroffener Teil | Art der Nutzung |
//   oder Listenzeilen "- 2026-10-01 · Werkzeug · Was"
// - optional Nutzungstabelle: | Arbeitsschritt | Werkzeug | Beschreibung |
// - optional Abschnitt "## Eigenleistung" als Fließtext
const KI_NAMEN = /claude|chatgpt|gpt|openai|copilot|gemini|perplexity|notebooklm|deepl|grammarly|elicit|consensus|scite|mistral|llama|ki\b|\bai\b/i;
function hilfsmittelAuswerten(text, englisch) {
  const w = (de, en) => (englisch ? en : de);
  const werkzeuge = [], nutzung = [], protokoll = [];
  for (const t of mdTabellen(text)) {
    const iWerk = spalte(t.kopf, 'werkzeug', 'tool');
    const iArt = spalte(t.kopf, 'art', 'typ', 'kategorie', 'type');
    const iZweck = spalte(t.kopf, 'einsatz', 'zweck', 'purpose');
    const iAkt = spalte(t.kopf, 'aktivität', 'aktivitaet', 'arbeitsschritt', 'activity');
    const iBes = spalte(t.kopf, 'beschreibung', 'description');
    const iDat = spalte(t.kopf, 'datum', 'date');
    const iTaet = spalte(t.kopf, 'tätigkeit', 'taetigkeit', 'was', 'task');
    const iTeil = spalte(t.kopf, 'betroffen', 'teil', 'kapitel', 'part');
    const iArtN = spalte(t.kopf, 'art der nutzung', 'nutzung', 'use');
    const istProtokoll = iDat >= 0 || /^(protokoll|log)/i.test(t.ueberschrift);
    if (istProtokoll) {
      for (const z of t.zeilen) {
        const was = [iTaet >= 0 ? z[iTaet] : '', iTeil >= 0 && z[iTeil] ? `(${z[iTeil]})` : ''].filter(Boolean).join(' ');
        if (!was && !(iArtN >= 0 && z[iArtN])) continue;
        protokoll.push({ datum: iDat >= 0 ? z[iDat] : '', werkzeug: iWerk >= 0 ? z[iWerk] || '' : '', was, art: iArtN >= 0 ? z[iArtN] || '' : '' });
      }
    } else if (iAkt >= 0) {
      for (const z of t.zeilen) nutzung.push([z[iAkt] || '', iWerk >= 0 ? z[iWerk] || '' : '', iBes >= 0 ? z[iBes] || '' : '']);
    } else if (iWerk >= 0) {
      for (const z of t.zeilen) {
        const name = z[iWerk] || '';
        if (!name.trim()) continue;
        const art = (iArt >= 0 ? z[iArt] : '') || '';
        werkzeuge.push({ name, ki: /ki|ai|generativ/i.test(art) || (!art && KI_NAMEN.test(name)), zweck: iZweck >= 0 ? z[iZweck] || '' : '' });
      }
    }
  }
  const eigenleistung = [];
  let imProtokoll = false, inEigen = false;
  for (const roh of text.split(/\r?\n/)) {
    const h = /^#{1,6}\s+(.*)$/.exec(roh.trim());
    if (h) {
      const t = h[1].toLowerCase();
      imProtokoll = t.startsWith('protokoll') || t.startsWith('log');
      inEigen = t.startsWith('eigenleistung') || t.startsWith('eigenständig') || t.startsWith('own contribution');
      continue;
    }
    if (imProtokoll) {
      const m = /^\s*[-*]\s*(\d{4}-\d{2}-\d{2})\s*[·|,-]\s*([^·|]+?)\s*[·|]\s*(.+)$/.exec(roh);
      if (m) protokoll.push({ datum: m[1], werkzeug: m[2].trim(), was: m[3].trim(), art: '' });
    }
    if (inEigen && !/^\s*(>|<!--)/.test(roh)) eigenleistung.push(roh);
  }
  // Protokoll nach Art der Nutzung bündeln, wenn keine eigene Nutzungstabelle da ist.
  if (!nutzung.length && protokoll.length) {
    const gruppen = new Map();
    for (const p of protokoll) {
      const schluessel = (p.art || w('Laufende Arbeit', 'Ongoing work')).trim();
      if (!gruppen.has(schluessel)) gruppen.set(schluessel, { werkzeuge: new Set(), was: [] });
      const g = gruppen.get(schluessel);
      if (p.werkzeug) g.werkzeuge.add(p.werkzeug);
      if (p.was) g.was.push(p.was);
    }
    for (const [art, g] of gruppen) {
      const was = [...new Set(g.was)];
      const text = was.slice(0, 8).join('; ') + (was.length > 8 ? w(`; und ${was.length - 8} weitere`, `; and ${was.length - 8} more`) : '');
      nutzung.push([art, [...g.werkzeuge].join(', '), text]);
    }
  }
  // Werkzeuge aus dem Protokoll ergänzen, die in keiner Werkzeugtabelle stehen.
  for (const p of protokoll) {
    if (p.werkzeug && !werkzeuge.some((x) => x.name.toLowerCase() === p.werkzeug.toLowerCase())) {
      werkzeuge.push({ name: p.werkzeug, ki: KI_NAMEN.test(p.werkzeug), zweck: '' });
    }
  }

  const out = [];
  const ki = werkzeuge.filter((x) => x.ki);
  const sonst = werkzeuge.filter((x) => !x.ki);
  const tabelle = (titel, liste) => {
    if (!liste.length) return;
    out.push(`\\subsection*{${titel}}`, '{\\small', '\\begin{tabularx}{\\linewidth}{@{}p{4.2cm}X@{}}', '\\toprule',
      `\\textbf{${w('Werkzeug', 'Tool')}} & \\textbf{${w('Einsatzzweck', 'Purpose')}}\\\\`, '\\midrule');
    liste.forEach((x, i) => out.push(`${zelle(x.name)} & ${zelle(x.zweck)}\\\\${i < liste.length - 1 ? '[3pt]' : ''}`));
    out.push('\\bottomrule', '\\end{tabularx}}', '');
  };
  out.push(`\\section*{${w('Verwendete Hilfsmittel', 'Aids Used')}}`);
  if (!werkzeuge.length) out.push(w('\\textit{Noch keine Werkzeuge in arbeit/hilfsmittel.md eingetragen.}', '\\textit{No tools listed in arbeit/hilfsmittel.md yet.}'), '');
  tabelle(w('Generative KI-Werkzeuge', 'Generative AI tools'), ki);
  tabelle(w('Software und Recherche', 'Software and research'), sonst);
  if (nutzung.length) {
    out.push(`\\section*{${w('Nutzung der KI-Werkzeuge im Einzelnen', 'Detailed Use of AI Tools')}}`,
      '{\\small\\renewcommand{\\arraystretch}{1.1}',
      '\\begin{longtable}{@{}p{3.2cm}p{3cm}p{\\dimexpr\\linewidth-6.2cm-4\\tabcolsep\\relax}@{}}', '\\toprule',
      `\\textbf{${w('Arbeitsschritt', 'Activity')}} & \\textbf{${w('Werkzeug', 'Tool')}} & \\textbf{${w('Beschreibung', 'Description')}}\\\\`,
      '\\midrule', '\\endhead');
    nutzung.forEach((n) => out.push(`${zelle(n[0])} & ${zelle(n[1])} & ${zelle(n[2])}\\\\[5pt]`));
    out.push('\\bottomrule', '\\end{longtable}}', '');
  }
  const eigen = eigenleistung.join('\n').trim();
  if (eigen) {
    out.push(`\\section*{${w('Eigenständige Leistung', 'Own Contribution')}}`);
    out.push(eigen.split(/\n\s*\n/).map((a) => zelle(a.replace(/\s*\n\s*/g, ' '))).join('\n\n'), '');
  }
  return out.join('\n');
}

// Abschnitte "## Zusammenfassung" und "## Abstract" aus arbeit/zusammenfassung.md.
function abschnitte(text) {
  const erg = {};
  let name = null, puffer = [];
  const ende = () => { if (name) erg[name] = puffer.join('\n').trim(); };
  for (const roh of text.split(/\r?\n/)) {
    const h = /^#{1,3}\s+(.*)$/.exec(roh.trim());
    if (h) { ende(); name = h[1].trim().toLowerCase(); puffer = []; continue; }
    if (name) puffer.push(roh);
  }
  ende();
  return erg;
}

// ---------------------------------------------------------------------------
// Kapitel sammeln und mit Pandoc wandeln
// ---------------------------------------------------------------------------

// "2-1-grundlagen.md" -> [2, 1]; "2-einleitung.md" -> [2]
function nummerAusDatei(name) {
  const teile = path.basename(name, '.md').split('-');
  const nr = [];
  for (const t of teile) { if (/^\d+$/.test(t)) nr.push(Number(t)); else break; }
  return nr;
}
const nrText = (arr) => arr.join('.');
const vergleicheNr = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? -1) - (b[i] ?? -1);
    if (d) return d;
  }
  return 0;
};

// Titel der Hauptkapitel: 1. zustand.hauptkapitel, 2. Kapiteleintrag ohne Punkt,
// 3. arbeit/gliederung/gliederung.md, 4. "Kapitel N".
function hauptkapitelTitel(zustand) {
  const titel = {};
  const hk = zustand.hauptkapitel;
  if (Array.isArray(hk)) for (const e of hk) { if (e && e.nr) titel[String(e.nr)] = e.titel; }
  else if (hk && typeof hk === 'object') Object.assign(titel, hk);
  for (const k of zustand.kapitel || []) {
    if (k && k.nr && !String(k.nr).includes('.') && k.titel && !titel[String(k.nr)]) titel[String(k.nr)] = k.titel;
  }
  const gl = leseText(P('arbeit', 'gliederung', 'gliederung.md'));
  for (const roh of gl.split(/\r?\n/)) {
    const m = /^\s*(?:#{1,6}\s*|[-*]\s*)?(?:Kapitel\s+)?(\d+)\.?\s+(?!\d)(.+?)\s*$/.exec(roh);
    if (m && !titel[m[1]]) titel[m[1]] = m[2].replace(/[*_`]/g, '').replace(/\s*\(.*?Seiten?.*?\)\s*$/i, '').trim();
  }
  return titel;
}

// Markdown vor Pandoc aufbereiten:
// - Überschriften-Nummern entfernen: "## 2.1 Titel" -> "## Titel"
// - "$$ ... $$ {#eq:name}" -> nummerierte equation mit \label
// - Abkürzungen mit schmalem Leerzeichen: "z. B." -> "z.\,B."
function bereiteMarkdownVor(md) {
  let s = md.replace(/^(#{1,6})\s+\d+(?:\.\d+)*\.?\s+/gm, '$1 ');
  s = s.replace(/\$\$([\s\S]+?)\$\$\s*\{#(eq:[^}\s]+)\}/g, (_, formel, label) => `\n\\begin{equation}\n${formel.trim()}\n\\label{${label}}\n\\end{equation}\n`);
  const teile = s.split(/(```[\s\S]*?```|`[^`\n]*`|\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/);
  const abk = [['z. B.', 'z.\\,B.'], ['d. h.', 'd.\\,h.'], ['u. a.', 'u.\\,a.'], ['o. Ä.', 'o.\\,Ä.'], ['i. d. R.', 'i.\\,d.\\,R.'], ['s. o.', 's.\\,o.'], ['s. u.', 's.\\,u.'], ['u. U.', 'u.\\,U.'], ['z. T.', 'z.\\,T.'], ['Z. B.', 'Z.\\,B.'], ['D. h.', 'D.\\,h.']];
  for (let i = 0; i < teile.length; i += 2) {
    for (const [a, b] of abk) teile[i] = teile[i].split(a).join(b);
  }
  return teile.join('');
}

function pandocArgs(werkzeuge, englisch) {
  const args = [
    '-f', 'markdown+raw_tex+tex_math_dollars+pipe_tables+implicit_figures+link_attributes+smart',
    '-t', 'latex', '--biblatex', '--top-level-division=chapter', '--wrap=preserve',
    '-M', `lang=${englisch ? 'en-GB' : 'de-DE'}`,
  ];
  const v = werkzeuge.pandocVersion;
  if (v && (v[0] > 3 || (v[0] === 3 && v[1] >= 8))) args.push('--syntax-highlighting=none');
  else args.push('--no-highlight');
  return args;
}

function wandle(werkzeuge, md, englisch) {
  const r = starte(werkzeuge.pandoc, pandocArgs(werkzeuge, englisch), { input: bereiteMarkdownVor(md), timeout: 120000 });
  if (r.code !== 0) throw new Error(r.err.trim() || 'Pandoc ist fehlgeschlagen.');
  // alt={...} kennt graphicx erst ab LaTeX 2023, ältere Distributionen brechen ab.
  return r.out.replace(/,alt=\{[^{}]*\}/g, '');
}

function sammleKapitel(zustand) {
  const ordner = P('arbeit', 'kapitel');
  const dateien = fs.existsSync(ordner) ? fs.readdirSync(ordner).filter((f) => f.endsWith('.md') && !f.startsWith('_') && !f.startsWith('.')) : [];
  const nachNr = new Map();
  for (const f of dateien) {
    const nr = nummerAusDatei(f);
    // 00-* (Zusammenfassung, Abstract) und 99-* (Hilfsmittel) sind Sonderdateien.
    if (!nr.length || nr[0] === 0 || nr[0] === 99) continue;
    nachNr.set(nrText(nr), path.join(ordner, f));
  }
  // Eintraege aus zustand.json zuerst (legen Reihenfolge und Titel fest).
  const liste = [];
  const gesehen = new Set();
  for (const k of zustand.kapitel || []) {
    if (!k || !k.nr) continue;
    const nr = String(k.nr);
    let datei = null;
    if (k.datei && fs.existsSync(P(k.datei))) datei = P(k.datei);
    else if (nachNr.has(nr)) datei = nachNr.get(nr);
    liste.push({ nr, arr: nr.split('.').map(Number), titel: k.titel || '', datei, status: k.status || 'offen' });
    gesehen.add(nr);
    if (datei) gesehen.add(path.resolve(datei));
  }
  for (const [nr, datei] of nachNr) {
    if (gesehen.has(nr) || gesehen.has(path.resolve(datei))) continue;
    liste.push({ nr, arr: nr.split('.').map(Number), titel: '', datei, status: 'entwurf', ungelistet: true });
  }
  liste.sort((a, b) => vergleicheNr(a.arr, b.arr));
  return liste;
}

// ---------------------------------------------------------------------------
// Fehler aus dem LaTeX-Log verständlich machen
// ---------------------------------------------------------------------------

const MUSTER = [
  [/! LaTeX Error: File `([^']+)' not found/, (m) => `Das LaTeX-Paket oder die Datei "${m[1]}" fehlt. ${WIN ? 'In der MiKTeX Console unter Einstellungen "Fehlende Pakete automatisch installieren" auf "Immer" stellen und /pdf erneut starten.' : 'Mit "sudo tlmgr install <paket>" nachinstallieren oder die volle TeX-Distribution nutzen.'}`],
  [/Unable to load picture or PDF file '([^']+)'|File `([^']+)' not found|Cannot determine size of graphic in (\S+)/, (m) => `Eine Abbildung wurde nicht gefunden: "${m[1] || m[2] || m[3]}". Liegt die Datei wirklich in abbildungen/ und stimmt der Name samt Endung?`],
  [/! Undefined control sequence/, () => 'Ein LaTeX-Befehl ist unbekannt, meist ein Tippfehler nach einem Backslash (z. B. \\ce, \\qty, \\cref) im Kapiteltext.'],
  [/! Missing \$ inserted/, () => 'Ein Formelzeichen steht außerhalb einer Formel, zum Beispiel ein _ oder ^ im Fließtext. Formeln in $...$ setzen, Unterstriche in normalem Text mit \\_ schreiben.'],
  [/! Package fontspec Error: The font "([^"]+)" cannot be found/, (m) => `Die Schrift "${m[1]}" ist auf diesem Rechner nicht installiert. In arbeit/projekt.json latex.schrift leeren oder die Schrift installieren.`],
  [/Found biblatex control file version (\d+(?:\.\d+)*), expected version (\d+(?:\.\d+)*)/, (m) => `Biber und biblatex passen nicht zusammen (Datei ${m[1]}, erwartet ${m[2]}). Die TeX-Distribution aktualisieren (MiKTeX Console: Updates).`],
  [/! Package biblatex Error: Style '([^']+)' not found/, (m) => `Der Zitierstil "${m[1]}" ist nicht installiert. ${WIN ? 'MiKTeX installiert ihn meist automatisch, sonst in der MiKTeX Console das Paket biblatex-chem bzw. biblatex-ieee/biblatex-apa installieren.' : 'Paket biblatex-chem bzw. biblatex-ieee/biblatex-apa installieren.'}`],
  [/! Package mhchem Error/, () => 'Eine chemische Formel in \\ce{...} ist fehlerhaft geschrieben. Schreibweise prüfen, z. B. \\ce{H2SO4}, \\ce{A -> B}, Ladungen \\ce{Fe^3+}.'],
  [/! Package siunitx Error/, () => 'Eine Zahl oder Einheit in \\qty{...}{...} bzw. \\unit{...} ist fehlerhaft, z. B. Komma statt Punkt in der Zahl (\\qty{5.0}{\\milli\\litre}) oder eine unbekannte Einheit.'],
  [/! Misplaced alignment tab character &/, () => 'Ein &-Zeichen steht im Fließtext. In normalem Text als \\& schreiben.'],
  [/! Package inputenc Error|Invalid UTF-8/, () => 'Die Datei enthält ein ungültiges Zeichen. Datei in UTF-8 speichern.'],
  [/! LaTeX Error: Environment (\S+) undefined/, (m) => `Die LaTeX-Umgebung "${m[1]}" ist unbekannt. Tippfehler oder fehlendes Paket.`],
  [/! (?:TeX capacity exceeded|Emergency stop)/, () => 'LaTeX musste abbrechen. Meist ist eine Klammer { } nicht geschlossen.'],
  [/! Paragraph ended before (\S+) was complete/, (m) => `Bei ${m[1]} fehlt eine schließende Klammer }.`],
  [/! Extra }, or forgotten/, () => 'Eine geschweifte Klammer } ist zu viel oder eine { fehlt.'],
];

function uebersetzeLog(log, texNachMd) {
  const zeilen = log.split(/\r?\n/);
  const fehler = [];
  const warnungen = [];
  // Datei-Stack grob verfolgen über "(./kapitel/x.tex" und file-line-error-Format.
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    const fle = /^(?:\.\/)?([^\s:]+\.tex):(\d+):\s*(.*)$/.exec(z);
    const ist = z.startsWith('!') || fle;
    if (!ist) continue;
    const block = zeilen.slice(i, i + 12).join('\n');
    const texDatei = fle ? fle[1] : null;
    const texZeile = fle ? Number(fle[2]) : null;
    const lzeile = /\nl\.(\d+)\s+(.*)/.exec(block);
    let erklaerung = null;
    for (const [re, f] of MUSTER) {
      const m = re.exec(block);
      if (m) { erklaerung = f(m); break; }
    }
    const roh = (fle ? fle[3] : z.replace(/^!\s*/, '')).trim();
    const eintrag = { meldung: roh, erklaerung: erklaerung || 'LaTeX meldet einen Fehler. Die genaue Stelle steht unten.', datei: texDatei, zeile: texZeile || (lzeile ? Number(lzeile[1]) : null) };
    // Rückverfolgung auf die Markdown-Quelle über den Kontext-Schnipsel.
    const schnipsel = lzeile ? lzeile[2].replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}$]/g, ' ').trim() : '';
    if (texDatei && texNachMd[path.basename(texDatei)]) {
      const md = texNachMd[path.basename(texDatei)];
      eintrag.quelle = path.relative(ROOT, md).split(path.sep).join('/');
      const wort = schnipsel.split(/\s+/).filter((x) => x.length > 3).slice(-3).join(' ');
      if (wort) {
        const mdZeilen = leseText(md).split(/\r?\n/);
        const idx = mdZeilen.findIndex((x) => x.includes(wort));
        if (idx >= 0) eintrag.quelleZeile = idx + 1;
      }
    }
    // Ohne Dateiangabe (Tectonic, kein -file-line-error): Schnipsel in allen
    // erzeugten Kapiteln suchen.
    if (!eintrag.quelle && lzeile) {
      const roh2 = lzeile[2].replace(/^\.\.\./, '').trim();
      for (const [name, md] of Object.entries(texNachMd)) {
        const texInhalt = leseText(path.join(BUILD, 'kapitel', name)) || leseText(path.join(ROOT, 'latex', 'build-expose', name));
        if (roh2 && texInhalt.includes(roh2)) {
          eintrag.quelle = path.relative(ROOT, md).split(path.sep).join('/');
          const woerter = roh2.replace(/\\[a-zA-Z]+/g, ' ').split(/[\s{}$]+/).filter((x) => x.length > 3).sort((a, b) => b.length - a.length);
          const mdZeilen = leseText(md).split(/\r?\n/);
          let idx = -1;
          for (const wort of woerter) { idx = mdZeilen.findIndex((x) => x.includes(wort)); if (idx >= 0) break; }
          if (idx >= 0) eintrag.quelleZeile = idx + 1;
          break;
        }
      }
    }
    if (schnipsel) eintrag.kontext = schnipsel.slice(-80);
    if (!fehler.some((f) => f.meldung === eintrag.meldung && f.zeile === eintrag.zeile)) fehler.push(eintrag);
    if (fehler.length >= 5) break;
  }
  for (const z of zeilen) {
    let m;
    if ((m = /Citation '([^']+)' (?:on page \d+ )?undefined/.exec(z)) || (m = /I didn't find a database entry for '([^']+)'/.exec(z))) {
      warnungen.push(`Quelle "${m[1]}" steht nicht in quellen/literatur.bib. Mit /quellen aufnehmen oder den Schlüssel im Text korrigieren.`);
    } else if ((m = /Reference `([^']+)' on page \d+ undefined/.exec(z))) {
      warnungen.push(`Verweis auf "${m[1]}" ins Leere. Gibt es die Abbildung oder Tabelle mit {#${m[1]}}?`);
    }
  }
  return { fehler, warnungen: [...new Set(warnungen)].slice(0, 15) };
}

// ---------------------------------------------------------------------------
// Bauen
// ---------------------------------------------------------------------------

function baue(optionen) {
  const ergebnis = { ok: false, modus: optionen.entwurf ? 'entwurf' : 'final', pdf: null, seiten: null, engine: null, fehler: [], warnungen: [], fehlende_kapitel: [], fehlende_werkzeuge: [], hinweise: [] };
  const werkzeuge = pruefeWerkzeuge();
  ergebnis.engine = werkzeuge.engine;
  if (!werkzeuge.pandoc) {
    ergebnis.fehlende_werkzeuge = werkzeuge.fehlend;
    ergebnis.hinweise = werkzeuge.hinweise;
    ergebnis.code = 2;
    return ergebnis;
  }

  const projekt = leseJson(P('arbeit', 'projekt.json'), {});
  const zustand = leseJson(P('arbeit', 'zustand.json'), {});
  const englisch = (projekt.arbeit || {}).sprache === 'en';

  fs.rmSync(BUILD, { recursive: true, force: true });
  fs.mkdirSync(BUILD, { recursive: true });
  fs.rmSync(KAPITEL_TEX, { recursive: true, force: true });
  fs.mkdirSync(KAPITEL_TEX, { recursive: true });
  kopiereOrdner(VORLAGE, BUILD);
  for (const f of ['eigene-praeambel.tex', 'eigene-erklaerung.tex']) {
    if (fs.existsSync(P('latex', f))) fs.copyFileSync(P('latex', f), path.join(BUILD, f));
  }
  kopiereOrdner(P('abbildungen'), path.join(BUILD, 'abbildungen'));
  const bib = leseText(P('quellen', 'literatur.bib'));
  schreibe(path.join(BUILD, 'literatur.bib'), bib);
  const hatBib = /@\w+\s*\{/.test(bib);

  // Kapitel
  const kapitel = sammleKapitel(zustand);
  const titel = hauptkapitelTitel(zustand);
  const texNachMd = {};
  const liste = [];
  let aktuellesHaupt = null, hatAbb = false, hatTab = false, geschrieben = 0;
  const hauptNummern = [...new Set(kapitel.map((k) => k.arr[0]))];
  for (const k of kapitel) {
    const haupt = k.arr[0];
    if (haupt !== aktuellesHaupt) {
      aktuellesHaupt = haupt;
      const t = titel[String(haupt)] || (englisch ? `Chapter ${haupt}` : `Kapitel ${haupt}`);
      liste.push(`\\chapter{${tex(t)}}\\label{kap:${haupt}}`);
    }
    if (k.datei) {
      const md = leseText(k.datei);
      if (!md.trim()) { if (optionen.entwurf) liste.push(`\\kitPlatzhalter{${tex(k.titel || k.nr)}}`); continue; }
      let latex;
      try { latex = wandle(werkzeuge, md, englisch); } catch (e) {
        ergebnis.fehler.push({ meldung: String(e.message).split('\n')[0], erklaerung: 'Pandoc konnte die Datei nicht lesen. Meist ein kaputter Tabellen- oder Bildaufbau im Markdown.', quelle: path.relative(ROOT, k.datei).split(path.sep).join('/') });
        continue;
      }
      // Kapiteleintrag ohne Punkt ist Einleitungstext des Hauptkapitels:
      // eine eigene #-Überschrift darin würde ein zweites \chapter erzeugen.
      if (k.arr.length === 1) latex = latex.replace(/^\\chapter\{[^\n]*\}(\\label\{[^}]*\})?\s*$/m, '');
      const name = path.basename(k.datei, '.md') + '.tex';
      schreibe(path.join(KAPITEL_TEX, name), latex);
      texNachMd[name] = k.datei;
      if (/\\begin\{figure\}|\\includegraphics/.test(latex)) hatAbb = true;
      if (/\\begin\{longtable\}|\\begin\{table\}|\\begin\{tabular/.test(latex)) hatTab = true;
      liste.push(`\\input{kapitel/${name.replace(/\.tex$/, '')}}`);
      geschrieben++;
      if (k.ungelistet) ergebnis.warnungen.push(`${path.basename(k.datei)} steht nicht in arbeit/zustand.json und wurde nach der Dateinummer einsortiert.`);
    } else if (k.arr.length > 1) {
      ergebnis.fehlende_kapitel.push(k.nr);
      if (optionen.entwurf) liste.push(`\\kitPlatzhalter{${tex(k.titel || k.nr)}}`);
    }
  }
  if (!liste.length) {
    liste.push(englisch ? '\\chapter{Introduction}\n\\kitPlatzhalter{No chapters yet}' : '\\chapter{Einleitung}\n\\kitPlatzhalter{Noch keine Kapitel}');
  }
  kopiereOrdner(KAPITEL_TEX, path.join(BUILD, 'kapitel'));
  schreibe(path.join(BUILD, 'kapitel-liste.tex'), liste.join('\n') + '\n');
  if (!optionen.entwurf && ergebnis.fehlende_kapitel.length) {
    ergebnis.warnungen.push(`Noch nicht geschrieben: ${ergebnis.fehlende_kapitel.join(', ')}. Für ein PDF mit Platzhaltern: /pdf entwurf.`);
  }

  // Anhang
  const anhangOrdner = P('arbeit', 'anhang');
  const anhang = fs.existsSync(anhangOrdner) ? fs.readdirSync(anhangOrdner).filter((f) => f.endsWith('.md')).sort() : [];
  const anhangListe = [];
  for (const f of anhang) {
    try {
      const md = leseText(path.join(anhangOrdner, f));
      const latex = wandle(werkzeuge, md.replace(/^##\s/gm, '# ').replace(/^###\s/gm, '## '), englisch);
      const name = 'anhang-' + path.basename(f, '.md');
      schreibe(path.join(BUILD, 'kapitel', name + '.tex'), latex);
      texNachMd[name + '.tex'] = path.join(anhangOrdner, f);
      anhangListe.push(`\\input{kapitel/${name}}`);
    } catch (e) { ergebnis.fehler.push({ meldung: String(e.message).split('\n')[0], erklaerung: 'Pandoc konnte den Anhang nicht lesen.', quelle: `arbeit/anhang/${f}` }); }
  }
  schreibe(path.join(BUILD, 'anhang-liste.tex'), anhangListe.join('\n') + '\n');

  // Zusammenfassung, Danksagung
  // Quelle: arbeit/zusammenfassung.md (## Zusammenfassung / ## Abstract), sonst
  // arbeit/kapitel/00-zusammenfassung.md und 00-abstract.md.
  const zf = abschnitte(leseText(P('arbeit', 'zusammenfassung.md')));
  const sonder = (name, ...titel) => {
    const t = leseText(P('arbeit', 'kapitel', name));
    if (!t.trim()) return '';
    const a = abschnitte(t);
    for (const k of titel) if (a[k]) return a[k];
    return t.replace(/^#{1,3}\s+.*$/m, '').trim();
  };
  const zfDe = zf.zusammenfassung || zf.kurzfassung || sonder('00-zusammenfassung.md', 'zusammenfassung', 'kurzfassung');
  const zfEn = zf.abstract || sonder('00-abstract.md', 'abstract') || abschnitte(leseText(P('arbeit', 'kapitel', '00-zusammenfassung.md'))).abstract || '';
  schreibe(path.join(BUILD, 'zusammenfassung-de.tex'), zfDe ? wandle(werkzeuge, zfDe, false) : '');
  schreibe(path.join(BUILD, 'zusammenfassung-en.tex'), zfEn ? wandle(werkzeuge, zfEn, true) : '');
  const dank = leseText(P('arbeit', 'danksagung.md')).replace(/^#.*$/m, '').trim();
  schreibe(path.join(BUILD, 'danksagung-inhalt.tex'), dank ? wandle(werkzeuge, dank, englisch) : '');

  // Verzeichnisse aus begriffe.md und hilfsmittel.md
  const { abk, formel } = begriffeAuswerten(leseText(P('arbeit', 'begriffe.md')));
  schreibe(path.join(BUILD, 'abkuerzungen-inhalt.tex'), abk.map(([a, b]) => `${zelle(a)} & ${zelle(b)}\\\\`).join('\n') + '\n');
  schreibe(path.join(BUILD, 'formelzeichen-inhalt.tex'), formel.map(([s, b, e]) => `${/\$/.test(s) ? s : `$${s}$`} & ${zelle(b)} & ${zelle(e)}\\\\`).join('\n') + '\n');
  schreibe(path.join(BUILD, 'hilfsmittel-inhalt.tex'), hilfsmittelAuswerten(leseText(P('arbeit', 'hilfsmittel.md')) || leseText(P('arbeit', 'kapitel', '99-hilfsmittel.md')), englisch) + '\n');

  const hat = {
    abbildungen: hatAbb, tabellen: hatTab, abkuerzungen: abk.length > 0, formelzeichen: formel.length > 0,
    zusammenfassung: !!zfDe, abstract: !!zfEn, danksagung: !!dank, literatur: hatBib && /\\(auto|text|paren|foot|super)?cite/.test(liste.join('') + fs.readdirSync(path.join(BUILD, 'kapitel')).map((f) => leseText(path.join(BUILD, 'kapitel', f))).join('')),
    anhang: anhangListe.length > 0,
  };
  schreibe(path.join(BUILD, 'kit-daten.tex'), kitDaten(projekt, { entwurf: !!optionen.entwurf, hat }));
  ergebnis.kapitel_geschrieben = geschrieben;
  ergebnis.hauptkapitel = hauptNummern.length;

  if (optionen.nurTex) { ergebnis.ok = ergebnis.fehler.length === 0; ergebnis.code = ergebnis.ok ? 0 : 1; ergebnis.build = path.relative(ROOT, BUILD); return ergebnis; }
  if (!werkzeuge.engine) {
    ergebnis.fehlende_werkzeuge = werkzeuge.fehlend;
    ergebnis.hinweise = werkzeuge.hinweise;
    ergebnis.code = 2;
    return ergebnis;
  }
  if (ergebnis.fehler.length) { ergebnis.code = 1; return ergebnis; }

  kompiliere(werkzeuge, { build: BUILD, haupt: 'main', literatur: hat.literatur, texNachMd, ergebnis, ziel: 'Arbeit.pdf' });
  ergebnis.code = ergebnis.ok ? 0 : 1;
  return ergebnis;
}

// LuaLaTeX -> Biber -> LuaLaTeX x2 (ohne latexmk, also ohne Perl), sonst Tectonic.
// Kopiert das Ergebnis nach `ziel` (relativ zur Projektwurzel).
function kompiliere(werkzeuge, { build, haupt, literatur, texNachMd, ergebnis, ziel }) {
  let log = '';
  const logDatei = path.join(build, `${haupt}.log`);
  if (werkzeuge.engine === 'lualatex') {
    const latexArgs = ['-interaction=nonstopmode', '-file-line-error', '-halt-on-error', `${haupt}.tex`];
    if (werkzeuge.miktex) latexArgs.unshift('--enable-installer');
    const lauf = () => {
      const r = starte(werkzeuge.lualatex, latexArgs, { cwd: build });
      log = leseText(logDatei) || r.out;
      return r.code === 0;
    };
    let ok = lauf();
    if (ok && literatur) {
      if (!werkzeuge.biber) {
        ergebnis.warnungen.push('Biber fehlt, das Literaturverzeichnis bleibt leer. Biber gehört zu MiKTeX/TeX Live und wird dort mitinstalliert.');
      } else {
        const b = starte(werkzeuge.biber, [haupt], { cwd: build });
        const blg = leseText(path.join(build, `${haupt}.blg`));
        if (b.code !== 0) {
          const m = /ERROR - (.+)/.exec(blg + b.out);
          let erklaerung = 'Das Literaturverzeichnis konnte nicht erzeugt werden. Meist ein kaputter Eintrag in quellen/literatur.bib (fehlende Klammer oder Komma).';
          for (const [re, f] of MUSTER) { const mm = re.exec(blg + b.out); if (mm) { erklaerung = f(mm); break; } }
          ergebnis.fehler.push({ meldung: m ? m[1] : 'Biber ist fehlgeschlagen.', erklaerung, quelle: 'quellen/literatur.bib' });
          ok = false;
        }
        log += '\n' + blg;
      }
    }
    if (ok) ok = lauf();
    if (ok) ok = lauf();
    if (!ok && !ergebnis.fehler.length) ergebnis.fehler.push(...uebersetzeLog(log, texNachMd).fehler);
  } else {
    const r = starte(werkzeuge.tectonic, ['-X', 'compile', `${haupt}.tex`, '--keep-logs', '--keep-intermediates'], { cwd: build });
    log = (leseText(logDatei) || '') + '\n' + r.out + '\n' + r.err + '\n' + leseText(path.join(build, `${haupt}.blg`));
    if (r.code !== 0) {
      const u = uebersetzeLog(log, texNachMd).fehler;
      if (u.length) ergebnis.fehler.push(...u);
      else {
        const z = (r.err || r.out).split('\n').filter((x) => /error/i.test(x)).slice(0, 3).join(' ');
        let erklaerung = `Tectonic konnte das PDF nicht bauen. Details stehen in ${path.relative(ROOT, logDatei).split(path.sep).join('/')}.`;
        for (const [re, f] of MUSTER) { const m = re.exec(r.err + r.out); if (m) { erklaerung = f(m); break; } }
        if (/biblatex control file version/.test(r.err + r.out)) erklaerung += ' Bei Tectonic muss Biber 2.17 installiert sein. Dauerhafte Lösung: MiKTeX bzw. MacTeX statt Tectonic.';
        ergebnis.fehler.push({ meldung: z || 'Tectonic ist fehlgeschlagen.', erklaerung });
      }
    }
  }
  // Warnungen nur aus einem vollständigen Lauf, sonst sind Zitate scheinbar undefiniert.
  if (!ergebnis.fehler.length) ergebnis.warnungen.push(...uebersetzeLog(log, texNachMd).warnungen);
  const pdfBuild = path.join(build, `${haupt}.pdf`);
  if (!ergebnis.fehler.length && fs.existsSync(pdfBuild)) {
    const m = new RegExp(`Output written on ${haupt}\\.pdf \\((\\d+) pages?`).exec(log);
    ergebnis.seiten = m ? Number(m[1]) : zaehleSeiten(pdfBuild);
    const zielAbs = P(ziel);
    try { fs.copyFileSync(pdfBuild, zielAbs); ergebnis.pdf = ziel; } catch {
      const alt = zielAbs.replace(/\.pdf$/, '-neu.pdf');
      fs.copyFileSync(pdfBuild, alt);
      ergebnis.pdf = path.relative(ROOT, alt).split(path.sep).join('/');
      ergebnis.warnungen.push(`${ziel} ist gerade in einem anderen Programm geöffnet und konnte nicht ersetzt werden. Das neue PDF liegt als ${ergebnis.pdf} daneben. PDF-Programm schließen und /pdf erneut starten.`);
    }
    ergebnis.ok = true;
  }
}

// Exposé als eigenständiges kurzes PDF: arbeit/expose/expose.md -> arbeit/expose/expose.pdf
function baueExpose(optionen) {
  const ergebnis = { ok: false, modus: 'expose', pdf: null, seiten: null, engine: null, fehler: [], warnungen: [], fehlende_kapitel: [], fehlende_werkzeuge: [], hinweise: [] };
  const werkzeuge = pruefeWerkzeuge();
  ergebnis.engine = werkzeuge.engine;
  if (!werkzeuge.pandoc || (!werkzeuge.engine && !optionen.nurTex)) {
    ergebnis.fehlende_werkzeuge = werkzeuge.fehlend; ergebnis.hinweise = werkzeuge.hinweise; ergebnis.code = 2; return ergebnis;
  }
  const quelle = P('arbeit', 'expose', 'expose.md');
  let md = leseText(quelle);
  if (!md.trim()) {
    ergebnis.fehler.push({ meldung: 'arbeit/expose/expose.md fehlt oder ist leer.', erklaerung: 'Es gibt noch kein Exposé. Mit /weiter in der Phase Exposé entsteht es.' });
    ergebnis.code = 1; return ergebnis;
  }
  const projekt = leseJson(P('arbeit', 'projekt.json'), {});
  const englisch = (projekt.arbeit || {}).sprache === 'en';
  // Erste #-Überschrift ist der Titel, falls in der Config noch keiner steht.
  const h1 = /^#\s+(.+)$/m.exec(md);
  if (h1) {
    md = md.replace(h1[0], '');
    const t = h1[1].replace(/^(Exposé|Expose|Exposee)\s*[:\-]?\s*/i, '').trim();
    if (t && istLeer((projekt.arbeit || {}).titel)) projekt.arbeit = { ...(projekt.arbeit || {}), titel: t };
  }
  // Überschriften so verschieben, dass die höchste Ebene eine \section wird.
  const ebenen = [...md.matchAll(/^(#{1,6})\s/gm)].map((m) => m[1].length);
  const minimum = ebenen.length ? Math.min(...ebenen) : 1;
  if (minimum > 1) md = md.replace(/^(#{1,6})(\s)/gm, (_, h, sp) => h.slice(minimum - 1) + sp);

  const build = P('latex', 'build-expose');
  fs.rmSync(build, { recursive: true, force: true });
  kopiereOrdner(VORLAGE, build);
  kopiereOrdner(P('abbildungen'), path.join(build, 'abbildungen'));
  const bib = leseText(P('quellen', 'literatur.bib'));
  schreibe(path.join(build, 'literatur.bib'), bib);
  let latex;
  try {
    const args = pandocArgs(werkzeuge, englisch).map((a) => (a === '--top-level-division=chapter' ? '--top-level-division=section' : a));
    const r = starte(werkzeuge.pandoc, args, { input: bereiteMarkdownVor(md), timeout: 120000 });
    if (r.code !== 0) throw new Error(r.err.trim() || 'Pandoc ist fehlgeschlagen.');
    latex = r.out.replace(/,alt=\{[^{}]*\}/g, '');
  } catch (e) {
    ergebnis.fehler.push({ meldung: String(e.message).split('\n')[0], erklaerung: 'Pandoc konnte das Exposé nicht lesen.', quelle: 'arbeit/expose/expose.md' });
    ergebnis.code = 1; return ergebnis;
  }
  schreibe(path.join(build, 'expose-inhalt.tex'), latex);
  const hat = { literatur: /@\w+\s*\{/.test(bib) && /\\(auto|text|paren|foot|super)?cite/.test(latex) };
  schreibe(path.join(build, 'kit-daten.tex'), kitDaten(projekt, { entwurf: false, expose: true, hat }));
  if (optionen.nurTex) { ergebnis.ok = true; ergebnis.code = 0; ergebnis.build = path.relative(ROOT, build); return ergebnis; }
  kompiliere(werkzeuge, { build, haupt: 'expose', literatur: hat.literatur, texNachMd: { 'expose-inhalt.tex': quelle }, ergebnis, ziel: path.join('arbeit', 'expose', 'expose.pdf') });
  if (ergebnis.pdf) ergebnis.pdf = ergebnis.pdf.split(path.sep).join('/');
  ergebnis.code = ergebnis.ok ? 0 : 1;
  return ergebnis;
}

function zaehleSeiten(datei) {
  try {
    const s = fs.readFileSync(datei, 'latin1');
    const m = s.match(/\/Type\s*\/Page(?!s)/g);
    return m ? m.length : null;
  } catch { return null; }
}

function oeffne(datei) {
  const abs = P(datei);
  if (WIN) spawnSync('cmd', ['/c', 'start', '', abs], { windowsHide: true });
  else spawnSync(MAC ? 'open' : 'xdg-open', [abs]);
}

// ---------------------------------------------------------------------------
// Ausgabe
// ---------------------------------------------------------------------------

function ausgabeText(e) {
  const z = [];
  if (e.fehlende_werkzeuge && e.fehlende_werkzeuge.length) {
    z.push('Es fehlt Software zum Bauen des PDFs:');
    for (const h of e.hinweise) z.push(`  ${h}`);
    z.push('Nach der Installation ein neues Terminal bzw. VS Code neu öffnen und /pdf erneut starten.');
    return z.join('\n');
  }
  if (e.build) {
    z.push(`LaTeX-Dateien erzeugt in ${e.build}.`);
  } else if (e.ok) {
    z.push(`PDF fertig (${e.modus}): ${e.pdf}${e.seiten ? `, ${e.seiten} Seiten` : ''}, gebaut mit ${e.engine}.`);
  } else {
    z.push('Das PDF konnte nicht gebaut werden.');
  }
  for (const f of e.fehler) {
    z.push('', `Fehler: ${f.erklaerung}`);
    if (f.quelle) z.push(`  Stelle: ${f.quelle}${f.quelleZeile ? `, Zeile ${f.quelleZeile}` : ''}`);
    else if (f.datei) z.push(`  Stelle: latex/build/${f.datei}${f.zeile ? `, Zeile ${f.zeile}` : ''}`);
    if (f.kontext) z.push(`  Umgebung: ...${f.kontext}`);
    z.push(`  LaTeX sagt: ${f.meldung}`);
  }
  if (e.warnungen.length) {
    z.push('', 'Hinweise:');
    for (const w of e.warnungen) z.push(`  - ${w}`);
  }
  return z.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  if (args.includes('check')) {
    const w = pruefeWerkzeuge();
    const erg = { ok: w.fehlend.length === 0, pandoc: w.pandoc, lualatex: w.lualatex, biber: w.biber, tectonic: w.tectonic, miktex: w.miktex, engine: w.engine, fehlend: w.fehlend, hinweise: w.hinweise };
    if (json) console.log(JSON.stringify(erg, null, 2));
    else {
      console.log(`Pandoc:  ${w.pandoc || 'fehlt'}`);
      console.log(`LaTeX:   ${w.lualatex || (w.tectonic ? `Tectonic (${w.tectonic})` : 'fehlt')}${w.miktex ? ' (MiKTeX)' : ''}`);
      console.log(`Biber:   ${w.biber || (w.tectonic && !w.lualatex ? 'über Tectonic' : 'fehlt')}`);
      for (const h of w.hinweise) console.log(`  ${h}`);
    }
    process.exit(erg.ok ? 0 : 2);
  }
  let e;
  try {
    e = args.includes('expose')
      ? baueExpose({ nurTex: args.includes('--nur-tex') })
      : baue({ entwurf: args.includes('entwurf'), nurTex: args.includes('--nur-tex') });
  } catch (err) {
    e = { ok: false, code: 1, fehler: [{ meldung: String(err && err.message || err), erklaerung: 'Unerwarteter Fehler im PDF-Werkzeug.' }], warnungen: [] };
  }
  if (json) console.log(JSON.stringify(e, null, 2));
  else console.log(ausgabeText(e));
  if (e.ok && e.pdf && args.includes('--oeffnen')) oeffne(e.pdf);
  process.exit(e.code ?? (e.ok ? 0 : 1));
}

main();
