# Pandoc und LaTeX installieren

In zwei Sätzen erklären (Pandoc wandelt um, LaTeX setzt), dann Interview „Jetzt installieren
(Empfohlen)“, „Anleitung zeigen“ (Befehle aus `hinweise`), „Später“.

- **Windows:** `winget install --id JohnMacFarlane.Pandoc -e --accept-source-agreements --accept-package-agreements`
  und `winget install --id MiKTeX.MiKTeX -e --accept-source-agreements --accept-package-agreements`,
  danach `initexmf --set-config-value=[MPM]AutoInstall=1` (unter
  `%LOCALAPPDATA%\Programs\MiKTeX\miktex\bin\x64\`). Das erste PDF lädt Pakete nach, einmalig
  einige Minuten.
- **macOS:** `brew install pandoc` und `brew install --cask mactex-no-gui` (rund 6 GB, das
  Passwort tippt die Person selbst). Schlanke Alternative: `brew install tectonic`.

Danach VS Code einmal neu starten, dann erneut bauen.
