---
name: start
description: Richtet das Projekt per Interview ein (Arbeit, Person, Fristen, KI-Regeln, Format, Werkzeuge) oder ändert bestehende Einstellungen.
argument-hint: "[bereich, z. B. fristen]"
disable-model-invocation: true
---

# /start: Projekt einrichten

## Wann

- Erster Start: `arbeit/projekt.json → eingerichtet` ist `false` oder die Datei fehlt.
- Später: Einstellungen ändern (Fristen, Zitierstil, Schreibmodus, Betreuung ...).
  Ein Argument wie `/start fristen` springt direkt zum Bereich.

## Kontext laden

1. `node kit/werkzeuge/zustand.mjs init` (legt fehlende Dateien aus `kit/vorlagen/arbeit/` an).
2. `arbeit/projekt.json`, `arbeit/zustand.json`, `arbeit/plan.json` lesen.
3. `kit/leitfaeden/interview.md` beachten. Jede Frage über AskUserQuestion.

## Ablauf bei bestehender Einrichtung

Wenn `eingerichtet: true` und kein Argument: ein Interview „Was möchtest du ändern?“
(header „Ändern“, multiSelect true) mit den Optionen:
- „Fristen und Termine“: Runde 3
- „Arbeit und Thema“: Runden 1 und 4
- „Format und Zitierstil“: Runde 5
- „Werkzeuge und Systemcheck“: Runde 6

Nur die gewählten Runden durchlaufen, danach speichern und Abschluss wie unten.
Weitere Bereiche (Name, Betreuung, KI-Regeln, Schreibmodus) erreicht die Person über Freitext.

## Ablauf bei Ersteinrichtung

### Begrüßung (einziger Text ohne Interview)

„Hallo! Ich bin dein Begleiter für die ganze Arbeit, von der Themenfindung bis zum PDF.
Ich stelle dir jetzt ein paar Fragen, meistens zum Anklicken. Das dauert etwa 10 Minuten.
Wenn du etwas nicht weißt, wähl einfach ‚Später klären‘. Nichts davon ist endgültig.“

Vor der ersten Frage still den Systemcheck laufen lassen: `node kit/werkzeuge/check.mjs --json`
(falls vorhanden). Ergebnis erst in der Zusammenfassung verwenden.

### Runde 1: Die Arbeit (4 Fragen)

1. „Was für eine Arbeit schreibst du?“ header „Arbeitstyp“
   - „Diplomarbeit“: meist 60 bis 100 Seiten, z. B. Chemie, Ingenieurwesen
   - „Masterarbeit“: meist 50 bis 100 Seiten
   - „Bachelorarbeit“: meist 30 bis 60 Seiten
   - „Kleinere Arbeit“: Seminar-, Haus-, Projektarbeit (Folgefrage, welche)
   Dissertation über Freitext.
2. „In welchem Fach?“ header „Fach“ → `fachprofil`
   - „Naturwissenschaft“: Chemie, Physik, Biologie, Pharmazie
   - „Technik/Informatik“: Informatik, Ingenieurwesen, Data Science
   - „Wirtschaft/Sozial“: BWL, VWL, Psychologie, Soziologie
   - „Geisteswissenschaft“: Geschichte, Philosophie, Literatur, Sprachen
   Das konkrete Fach (z. B. „Chemie“) in einer Folgefrage oder aus dem Freitext → `fachgebiet`.
3. „In welcher Sprache schreibst du die Arbeit?“ header „Sprache“
   - „Deutsch“ / „Englisch“ / „Noch offen“ (Hinweis: in der Chemie oft Englisch, mit Betreuung klären)
   Die Bedienung bleibt immer deutsch.
4. „Wie arbeitest du hauptsächlich?“ header „Methodik“, Optionen passend zum Fachprofil:
   - Naturwissenschaft: „Experimentell (Labor)“, „Computational (Modelle, Simulation, KI)“,
     „Beides“, „Literaturarbeit“
   - Wirtschaft/Sozial: „Literatur/Konzept“, „Empirisch qualitativ“, „Empirisch quantitativ“, „Gemischt“
   - andere: sinnvoll analog
   → `methodik` (experimentell, computational, gemischt, literatur, empirisch-qualitativ, empirisch-quantitativ)

### Runde 2: Du und deine Hochschule (4 Fragen)

1. „Wie heißt du?“ header „Name“: „Aus Git übernehmen“ (`git config user.name`), „Später klären“.
2. „An welcher Hochschule?“ header „Hochschule“: Hinweisoptionen „z. B. TU Dresden“,
   „Später klären“. Name über Freitext. Ort ableiten, wenn eindeutig.
3. „Welche Fakultät bzw. welches Institut?“ header „Institut“: „z. B. Fakultät Chemie und
   Lebensmittelchemie“, „Später klären“.
4. „Deine E-Mail-Adresse?“ header „E-Mail“: „Aus Git übernehmen“ (`git config user.email`),
   „Später klären“. Begründung in der Beschreibung: wird für Literaturdatenbanken gebraucht
   (höfliche Anfragen) und steht auf dem Deckblatt nur, wenn du willst.

Matrikelnummer und Studiengang: im Freitext oder später über `/start`, nicht aktiv abfragen,
wenn die Person es eilig hat.

### Runde 3: Zeit und Betreuung (bis 4 Fragen)

Rechne relative Angaben in echte Daten um (heutiges Datum per `node -e "console.log(new Date().toISOString().slice(0,10))"`).

1. „Wann hast du angefangen bzw. fängst du an?“ header „Beginn“: „Heute“, „Vor 1 Monat“,
   „z. B. 2026-11-01“, „Später klären“.
2. „Wann ist die Abgabe?“ header „Abgabe“: „In 6 Monaten (<Datum>)“, „In 9 Monaten (<Datum>)“,
   „z. B. 2027-04-30“, „Später klären“. Diplom- und Masterarbeiten haben meist eine feste
   Bearbeitungszeit laut Prüfungsordnung: in der Beschreibung erwähnen.
3. „Wer betreut dich?“ header „Betreuung“: „z. B. Dr. Müller (Betreuer), Prof. Schmidt
   (Gutachter)“, „Später klären“.
4. „Gibt es schon einen Termin mit deiner Betreuung?“ header „Termin“: „z. B. 2026-10-15“,
   „Noch keiner“, „Regelmäßig (z. B. alle 2 Wochen)“.
   Termine als `art: betreuung` in `arbeit/plan.json` eintragen, Abgabe zusätzlich als
   `art: frist`.

### Runde 4: Thema, KI-Regeln, Schreibmodus, Umfang (4 Fragen)

1. „Wie weit ist dein Thema?“ header „Thema“
   - „Vorgegeben von der Arbeitsgruppe“: wir schärfen es
   - „Grob umrissen“: wir machen daraus eine Forschungsfrage
   - „Noch offen“: wir finden gemeinsam eins
   Freitext: Arbeitstitel oder Stichworte. In `arbeit/thema/thema.md` notieren (Abschnitt „Ausgangslage“).
2. „Was erlaubt deine Prüfungsordnung bzw. deine Betreuung beim Einsatz von KI?“ header „KI-Regeln“
   - „Erlaubt, muss angegeben werden“: → `erlaubt-mit-deklaration`
   - „Nur eingeschränkt“ (z. B. keine Textentwürfe): → `eingeschraenkt`
   - „Weiß ich nicht“: → `unbekannt`, kommt auf die Liste für das erste Betreuungsgespräch
   - „Verboten“: → `verboten`
   Beschreibung ehrlich: „Du unterschreibst am Ende, dass du die Arbeit selbstständig verfasst
   hast. Deshalb protokolliere ich jede KI-Nutzung für dein Hilfsmittelverzeichnis.“
3. „Wie sollen wir beim Schreiben zusammenarbeiten?“ header „Schreiben“
   - „Claude schreibt Entwürfe, ich überarbeite (Empfohlen)“: `claude-schreibt`
   - „Gemeinsam: ich schreibe, Claude überarbeitet“: `gemeinsam`
   - „Claude berät nur, ich schreibe selbst“: `coach`
   Wenn KI-Regeln `eingeschraenkt` oder `verboten`: `coach` empfehlen und das in der
   Beschreibung begründen. Die Entscheidung bleibt bei der Person.
4. „Wie lang soll die Arbeit werden?“ header „Umfang“: Optionen nach Arbeitstyp, z. B.
   Diplomarbeit „60 bis 80 Seiten“, „80 bis 100 Seiten“, „Vorgabe kenne ich nicht“.
   Setze `seiten.min/max`, `woerter_ziel` = Mittelwert × 280 (nur Fließtext, ohne Verzeichnisse
   und Anhang; bei Naturwissenschaft × 230, weil Abbildungen Platz brauchen).

### Runde 5: Format (bis 4 Fragen)

1. „Welcher Zitierstil?“ header „Zitierstil“, Optionen nach Fachprofil:
   - Naturwissenschaft: „ACS (Empfohlen)“ `chem-acs`, „RSC“ `chem-rsc`,
     „Angewandte Chemie“ `chem-angew`, „Vorgabe der Gruppe“ (Freitext)
   - Technik/Informatik: „IEEE (Empfohlen)“, „Autor-Jahr“ `authoryear`, „APA“
   - Wirtschaft/Sozial: „Harvard mit vgl. (Empfohlen)“ `harvard-de`, „APA 7“ `apa`
   - Geistes: „Chicago“, „Autor-Jahr“, „Vorgabe“
2. „Gibt es eine Vorlage oder ein Merkblatt für das Layout?“ header „Vorlage“
   - „Nein, nimm die Standardvorlage (Empfohlen)“: `koma`, schlicht und hochschulneutral
   - „Ja, ein Merkblatt als PDF“: Person legt es nach `quellen/eingang/` (oder nennt den Pfad),
     du liest es und überträgst Ränder, Schrift, Zeilenabstand, Pflichtbestandteile.
     Werte danach per Interview bestätigen lassen.
   - „Ja, eine LaTeX-Vorlage der Arbeitsgruppe“: `eigene`, Dateien nach `latex/vorlage-ag/`
   - „TU-Dresden-Klasse tudscr“: `tudscr`, Hinweis: nutzt noch das alte Corporate Design (Stand 2026-09)
3. „Sollen Deckblatt und Verzeichnisse wie üblich angelegt werden?“ header „Verzeichnisse“
   - „Ja, Standard (Empfohlen)“: Abbildungen, Tabellen, Abkürzungen, Hilfsmittel, Abstract,
     Zusammenfassung, Erklärung
   - „Ich wähle selbst“: Folgefrage mit multiSelect
4. „Hast du ein Logo deiner Hochschule für das Deckblatt?“ header „Logo“
   - „Später“ / „Ja, lege ich nach abbildungen/logo.png“ / „Kein Logo“

### Runde 6: Werkzeuge (bis 4 Fragen, nur relevante)

1. Nur wenn `methodik` computational, gemischt oder empirisch-quantitativ:
   „Gehört Programmieren oder Datenauswertung zu deiner Arbeit?“ header „Code“
   - „Ja, richte es ein (Empfohlen)“: `uv init code` im Projekt, danach `uv add numpy pandas matplotlib`
     (Chemie zusätzlich `rdkit`, bei ML `scikit-learn`). Erklären: „Du musst nichts über
     Python wissen, ich übernehme das.“
   - „Später“ / „Nein“
2. „Nutzt du Zotero für Literatur?“ header „Zotero“
   - „Nein, Claude verwaltet die Quellen (Empfohlen)“ / „Ja“ (dann Anleitung aus
     `kit/leitfaeden/recherche.md`, Abschnitt Zotero, `werkzeuge.zotero: true`)
3. „Soll ich dir den Browser-Zugang zur Bibliothek einrichten?“ header „Bibliothek“
   - „Ja, jetzt (Empfohlen)“: Playwright öffnet die Anmeldeseite der Bibliothek (bei TU Dresden
     `https://katalog.slub-dresden.de`, Login über ZIH/Shibboleth). Person meldet sich selbst an.
     Du tippst nie Passwörter.
   - „Später“: kommt bei der ersten Recherche
4. Nur wenn der Systemcheck Probleme meldet: „Einige Programme fehlen noch (<Liste in Klartext>).
   Soll ich sie jetzt reparieren?“ header „Reparieren“ – „Ja (Empfohlen)“, „Später mit /hilfe“.

## Speichern

1. `arbeit/projekt.json` mit allen Antworten schreiben. „Später klären“ als leerer String.
   `eingerichtet: true`.
2. `arbeit/plan.json`: Abgabe und Termine.
3. `arbeit/thema/thema.md` mit Abschnitt „Ausgangslage“ (Lage, Stichworte, Datum).
4. `arbeit/hilfsmittel.md`: erste Zeile „Claude Code, Einrichtung des Projekts“ mit Datum
   und Modell.
5. `arbeit/tagebuch.md`: Eintrag „Projekt eingerichtet“ mit den wichtigsten Entscheidungen.
6. Offene Punkte für die Betreuung (z. B. KI-Regeln unbekannt, Sprache offen) nach
   `arbeit/betreuung/offene-fragen.md`.
7. Zustand:
   ```
   node kit/werkzeuge/zustand.mjs phase thema
   node kit/werkzeuge/zustand.mjs verlauf "Projekt eingerichtet"
   node kit/werkzeuge/zustand.mjs pruefe-abzeichen
   ```

## Ausgabe

Kurze Zusammenfassung als Tabelle (Arbeit, Fach, Sprache, Abgabe mit Tagen bis dahin,
Betreuung, KI-Regeln, Schreibmodus, Zitierstil, Systemcheck in Klartext). Dann ein Satz
zum Dashboard: „Deinen Überblick findest du im Dashboard (`/dashboard`).“

## Abschluss-Interview

„Wie möchtest du weitermachen?“ header „Weiter“
- „Mit dem Thema starten (Empfohlen)“: direkt `/weiter` ausführen (Phase thema)
- „Erst das Dashboard ansehen“: `/dashboard`
- „Ich schaue mir das später an“: Hinweis, dass `/weiter` jederzeit fortsetzt, `/sync` sichert
