# Changelog

> Neue Versionen oben. `/update` zeigt der Person die Abschnitte, die neuer sind als ihre Version.
> Überschriften exakt im Format `## x.y.z (YYYY-MM-DD)`.

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
