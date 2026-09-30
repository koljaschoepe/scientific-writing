# Changelog

> Neue Versionen oben. `/update` zeigt der Person die Abschnitte, die neuer sind als ihre Version.
> Überschriften exakt im Format `## x.y.z (YYYY-MM-DD)`.

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
