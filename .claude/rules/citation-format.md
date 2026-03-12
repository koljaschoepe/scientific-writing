---
globs: ["sources/**"]
---

# Regeln für Quellendateien

## literature.md Format
- YAML-Blöcke mit --- Trennern
- Zweistufig: PART 1 (Stammdaten) und PART 2 (Zitate)
- quelle_id: immer nachname_jahr (lowercase, underscore)
- Bei Namenskollision: Suffix a, b, c

## Pflichtfelder Quelle
- quelle_id, autor, jahr, titel, quelle_typ

## Pflichtfelder Zitat
- id, quelle_id, seite (empfohlen), typ, inhalt

## Autorenformat
- Einzeln: "Nachname, V."
- Mehrere: "Nachname1/Nachname2" (Slash-getrennt)
- Bei 3+: Alle auflisten (Slash-getrennt)

## Quellentypen
- buch, journal, sammelband, konferenz, website, report

## Zitat-Typen
- indirekt: Paraphrase (sinngemäß)
- direkt: Wörtliches Zitat (in Anführungszeichen)

## Validierung
- Jede quelle_id in PART 2 muss in PART 1 existieren
- Keine verwaisten Zitate (ohne gültige quelle_id)
- Seitenzahlen müssen zur Quelle passen
