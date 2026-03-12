# Literaturdatenbank

> Alle Quellen und Zitate für deine Abschlussarbeit.
> Nutze `/cite` um neue Einträge hinzuzufügen, oder bearbeite diese Datei manuell.

---

## Format-Anleitung

Diese Datenbank nutzt eine **zweistufige Struktur** im YAML-Format:

1. **PART 1: Quellen-Stammdaten** -- Einmal pro Quelle alle bibliografischen Informationen
2. **PART 2: Zitate** -- Einzelne Passagen aus den Quellen mit Seitenangaben

### Vorteile
- Quellinformationen nur einmal erfassen (DRY-Prinzip)
- Änderungen an Quelldaten wirken sich auf alle Zitate aus
- Literaturverzeichnis direkt aus Stammdaten generierbar
- Übersichtliche Trennung von Metadaten und Zitat-Inhalten

### Vorlage: Neue Quelle (PART 1)

```yaml
---
quelle_id: nachname_jahr          # Eindeutige ID: nachname_jahr (lowercase)
autor: "Nachname, V."             # Bei mehreren: "Nachname1/Nachname2"
jahr: 2024                        # Erscheinungsjahr
titel: "Vollständiger Titel"      # Titel des Werks
quelle_typ: buch                  # buch | journal | sammelband | konferenz | website | report
# --- Je nach Typ zusätzlich: ---
verlag: "Verlagsname"             # Bei Buch/Sammelband
ort: "Erscheinungsort"            # Bei Buch/Sammelband
auflage: 3                        # Bei Buch (optional)
journal: "Zeitschriftname"        # Bei Journal
jahrgang: 12                      # Bei Journal
ausgabe: 4                        # Bei Journal
seiten: "45-67"                   # Bei Journal/Sammelband
doi: "10.xxxx/xxxxx"              # Falls vorhanden
url: "https://..."                # Bei Website/Online-Quelle
abruf: "15.03.2026"               # Abrufdatum bei Online-Quellen
herausgeber: "Nachname, V."       # Bei Sammelband
sammelbandtitel: "Titel"          # Bei Sammelband
notizen: |                        # Optionale Notizen
  Kurze Beschreibung der Relevanz für die Arbeit.
---
```

### Vorlage: Neues Zitat (PART 2)

```yaml
---
id: nachname_jahr_z1              # Eindeutige Zitat-ID: quelle_id + _z + Nummer
quelle_id: nachname_jahr          # Verweis auf die Quelle in PART 1
seite: "42"                       # Seitenzahl oder Bereich ("42-45")
typ: indirekt                     # indirekt (Paraphrase) | direkt (wörtlich)
inhalt: "Kernaussage oder wörtliches Zitat"
kontext: "In welchem Zusammenhang steht das Zitat"
zugeordnet_zu: ""                 # Kapitelnummer (z.B. "2.3") -- wird in Phase 3 gesetzt
---
```

### Regeln

- `quelle_id`: Immer `nachname_jahr` in Kleinbuchstaben mit Unterstrich
- Bei mehreren Autoren: Nur Erstautor für ID (`mueller_2024`)
- Bei gleichem Autor+Jahr: Suffix anhängen (`mueller_2024a`, `mueller_2024b`)
- `autor`: Slash-Trennung bei mehreren (`Mueller/Schmidt/Weber`)
- `seite`: Zahl (`42`), Bereich (`42-45`), Bereich mit f. (`42 f.`) oder leer bei Websites
- `typ`: `indirekt` für Paraphrasen, `direkt` für wörtliche Übernahmen
- `zugeordnet_zu`: Wird in Phase 3 automatisch gesetzt, kann aber manuell eingetragen werden

---

# PART 1: QUELLEN-STAMMDATEN

> Für jede Quelle einen YAML-Block anlegen. Sortierung: alphabetisch nach quelle_id.



---

# PART 2: ZITATE

> Für jedes verwendete Zitat einen YAML-Block anlegen.

