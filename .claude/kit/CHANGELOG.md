# Changelog

> Neue Versionen oben. `/update` zeigt der Person die Abschnitte, die neuer sind als ihre Version.
> Überschriften exakt im Format `## x.y.z (YYYY-MM-DD)`.

## 3.0.0 (2026-10-01)

Neue Ordnerstruktur: links in VS Code steht nur noch deine Arbeit. Ruhigeres Dashboard,
Umfang in Seiten, deine Stilregeln als Schalter.

- **Breaking, neue Struktur.** Deine Kapitel liegen in `kapitel/`, Zitate und Kernaussagen je
  Quelle in `quellen/notizen/`. Einstellungen, Plan und Stand liegen im versteckten Ordner
  `.arbeit/`, das Kit komplett in `.claude/`, der PDF-Bau in `.lokal/`. Beim ersten Start nach
  dem Update zieht das Kit ein bestehendes Projekt selbst um, nichts geht verloren. Vorher
  `/sync` machen.
- **Eine lesbare Einstellungsdatei** `.arbeit/einstellungen.md` statt `projekt.json`. Du kannst
  sie selbst ändern oder Claude sagen, was anders sein soll.
- **Stilregeln als Schalter:** Ich-Form, Gedankenstriche, Semikolons, Satzlänge, Kommas. Passt
  zu den Vorgaben deiner Betreuung. Die Stilprüfung zählt jetzt ein Skript, zuverlässig und
  ohne Kontingent.
- **Umfang in Seiten** statt Wörtern: Seitenbereich der Arbeit, Anteil je Kapitel, nach dem
  PDF-Bau echte Seiten.
- **Plan mit Meilensteinen:** `/start` legt einen Zeitplan rückwärts von der Abgabe an, die
  Gliederung ergänzt Meilensteine je Kapitel. Termine wie bisher im Dashboard.
- **Dashboard:** ruhiger und lesbarer, Klick auf Datei oder Absatz öffnet VS Code an der
  Stelle, Quellen aufklappbar mit Zitaten, Fundstellen und Kernaussage, Formeln lesbar.
  Entfallen: Serie, Abzeichen, Suche mit Strg+K, Bearbeiten von Absätzen im Browser.
- **Freigabe nur nach Prüfung:** Ein Kapitel wird erst `final`, wenn es geprüft ist. Rückgängig
  entfernt auch den Eintrag im Verlauf.
- **Zitatseiten** sind die gedruckten Seiten wie im Heft, nicht die Seite im PDF-Programm.
- **„Mach weiter“** startet `/weiter` jetzt von selbst.
- **Sparsamer:** Prüfer schreiben ihre Ergebnisse selbst in Dateien, Claude liest nur noch
  das Wichtigste. Große Dateien werden nie mehr ganz gelesen.
- Hochschule und Bibliothek sind nicht mehr fest auf Dresden eingestellt, sondern stehen in
  deinen Einstellungen.
- **Gliederung so tief, wie du willst.** Eine Kapiteldatei ist eine Einheit mit Status, auf jeder
  Ebene: Kapitel 1 als eine Datei, Kapitel 3 aufgeteilt in 3.1 und 3.2, beides gemischt. Die
  Abschnitte darunter sind einfach Überschriften in der Datei, das Dashboard zeigt sie mit Wörtern
  und springt an die Zeile. Die geplante Gliederung steht von Anfang an als Überschriften in den
  Kapiteldateien. Wird ein Kapitel groß, schlägt Claude vor, es aufzuteilen
  (`zustand.mjs aufteilen`, zurück mit `zusammenfuehren`, nichts geht verloren).
- **PDF richtig gegliedert:** Ein Kapitel ohne Unterkapitel erscheint nicht mehr doppelt
  („1 Einleitung“ und „1.1 Einleitung“). Die Überschriftenebene folgt aus der Kapitelnummer.
  Word-Export mit derselben Gliederung und Nummerierung.
- **Seitenziele passend zum Fach:** Naturwissenschaft (Chemie, Physik, Biologie …) bekommt eigene
  Startanteile (Einleitung 8, Grundlagen 20, Experimenteller Teil 20, Ergebnisse und Diskussion 45,
  Zusammenfassung 7 Prozent). „Zusammenfassung“, „Fazit“, „Ausblick“ und „Schluss“ werden erkannt.
  Echte Seiten aus dem PDF stimmen auch bei Lücken in der Nummerierung, und nach einer Änderung
  gelten die Seiten aller späteren Kapitel als veraltet.
- **Cursor:** Das Kit läuft auch in Cursor. Links aus Dashboard und Chat öffnen im richtigen
  Editor (automatisch erkannt oder `technik.editor` in den Einstellungen).
- **PDFs:** Das Dashboard kennt Arbeit und Exposé, nimmt `Arbeit-neu.pdf`, wenn das PDF beim Bauen
  geöffnet war, und öffnet beide auf Wunsch im PDF-Programm.
- **Quellen-Abgleich:** zitiert, aber nicht in der Literaturliste; in der Liste, aber nie zitiert;
  zitiert ohne Notiz oder ohne PDF. PDFs werden auch über das Zotero-Feld `file` gefunden, doppelte
  Vorschläge über die DOI erkannt.
- **Umbenannte Kapiteldatei:** wird erkannt und zugeordnet, `check.mjs --reparieren` trägt sie ein.
- Weniger Last: Das Dashboard rechnet nur bei Änderungen neu, Git wird höchstens einmal pro Minute
  gefragt.

## 2.1.0 (2026-09-30)

Mehr Dashboard, weniger Text, sparsamer mit dem Claude-Kontingent.

- Dashboard: Kapitel lesen, zuletzt geänderte Absätze sehen und direkt korrigieren oder an
  Claude schicken. PDF auf Knopfdruck aktualisieren und rechts ansehen, auch Quell-PDFs.
  Textstelle markieren und als Zitat speichern. Suche mit Strg+K (Mac Cmd+K).
- Rückgängig für jede Aktion im Dashboard. `/hilfe` erklärt, wie man Claudes Änderungen
  zurücknimmt und wo die Grenzen sind.
- Claude erfährt beim nächsten Auftrag von selbst, was du im Dashboard entschieden hast.
- Werkzeugkasten: alle Befehle im Dashboard ansehen, eigene Befehle anlegen lassen. Eigene
  Befehle überstehen `/update`.
- Word-Export für die Betreuung: `/pdf docx`.
- Zotero: Better BibTeX kann direkt nach `quellen/literatur.bib` exportieren, sonst Import
  per `/quellen`.
- Claude antwortet kürzer: ein Satz Ergebnis, Stichpunkte, klickbare Links zu den
  geänderten Dateien. Rückfragen nur noch dort, wo du wirklich entscheidest.
- Recherche, Quellen, Schreiben, Prüfen, PDF und Hilfe startet Claude bei passenden
  Aufträgen selbst.
- Beschädigte Einstellungsdateien werden nie mehr überschrieben, vor jedem Speichern entsteht
  eine Sicherung (`.bak`).
- Rechnerbezogene Daten liegen in `.lokal/` und verursachen keine Konflikte mehr beim Sync.
- Empfohlene VS-Code-Erweiterungen: LTeX+ (Rechtschreibung und Grammatik), Data Wrangler
  (Messdaten als Tabelle).
- Neue Struktur `AGENTS.md` (Regeln für alle KI-Werkzeuge), `CLAUDE.md` bindet sie ein.

## 2.0.0 (2026-09-30)

Kompletter Neuaufbau.

- Windows und macOS gleichwertig: alle Werkzeuge und Hooks in Node, Einrichtungs-Skripte
  für beide Systeme (`install/`).
- Dashboard mit Prozesspfad, Fristen, Tagesziel, Kapitelstand, Quellen-Triage, Upload und
  Auftragsfeld, das Claude in VS Code startet.
- Elf deutsche Befehle statt dreizehn englischer: `/start`, `/weiter`, `/recherche`,
  `/quellen`, `/schreiben`, `/pruefen`, `/pdf`, `/sync`, `/update`, `/hilfe`, `/dashboard`.
- Interview-Tool bei jeder Entscheidung, Challenge in jeder Phase.
- Neue Phasen Recherche und Exposé, Themenfindung mit Verzweigung (vorgegeben oder offen).
- Fachprofile, Naturwissenschaft voll ausgebaut (experimenteller Teil, siunitx, mhchem,
  chemfig, Code-Teil mit uv).
- LaTeX neu: KOMA-Vorlage, Pandoc, BibLaTeX mit wählbarem Stil, Hilfsmittelverzeichnis.
- Prüfung mit Zitattreue gegen das Original, Sprachschwellen, Notenschätzung, Kürzungsplan.
- `/sync` für GitHub (manuell, Konflikte per Interview), `/update` nur für Kit-Dateien.
- Playwright-Browserzugriff für SLUB, Verlage, Scholar, mit Profil außerhalb des Repos.
