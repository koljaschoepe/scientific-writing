---
name: review
description: Startet die Qualitätsprüfung für ein Kapitel. Nutze diesen Skill wenn der User /review eingibt, optional mit Kapitelnummer wie /review 2.3.
---

# Qualitätsprüfung

Prüft ein geschriebenes Kapitel durch drei spezialisierte Reviewer-Agenten.

## Ablauf

### 1. Kapitelnummer bestimmen

**Mit Parameter (z.B. /review 2.3):**
- Verwende die angegebene Kapitelnummer

**Ohne Parameter (/review):**
- Finde das nächste Kapitel das geschrieben aber noch nicht reviewed ist
- Falls kein Kapitel gefunden: "Alle Kapitel sind bereits geprüft."

### 2. Vorbedingungen prüfen

- [ ] Kapitel existiert in `output/phase-05-writing/final/[X-X].md`
  (oder in draft/ falls der User explizit draft prüfen will)
- [ ] config.yaml existiert

Falls das Kapitel noch nicht geschrieben ist:
"Kapitel [X.X] ist noch nicht geschrieben. Nutze /write [X.X] zuerst."

### 3. Drei Reviewer PARALLEL starten

Erkläre dem User:
"Ich prüfe Kapitel [X.X] mit drei spezialisierten Agenten parallel:
1. Sprachprüfung (Stil, verbotene Wörter, Wiederholungen)
2. Zitationsprüfung (Format, Dichte, Vollständigkeit)
3. Argumentationsprüfung (Logik, Roter Faden, Übergänge)
Das dauert einen Moment..."

**WICHTIG: Starte alle drei Agents gleichzeitig (parallel), nicht nacheinander.**
Die drei Reviews sind unabhängig voneinander und können parallel laufen:

- Starte `.claude/agents/reviewer-language.md`
- Starte `.claude/agents/reviewer-citations.md`
- Starte `.claude/agents/reviewer-argumentation.md`

### 4. Ergebnisse konsolidieren

Sobald alle drei fertig sind, fasse die Berichte zusammen:

```
=== Review-Ergebnis: Kapitel [X.X] ===

| Prüfbereich | Funde | Schwere |
|-------------|-------|---------|
| Sprache & Stil | [X] | [hoch/mittel/niedrig] |
| Zitationen | [X] | [hoch/mittel/niedrig] |
| Argumentation | [X] | [hoch/mittel/niedrig] |

Gesamtempfehlung: [Freigabe / Kleine Überarbeitung / Größere Revision]
```

Falls Korrekturen nötig:
- Zeige die wichtigsten Funde (max. 10)
- Biete an: "Soll ich die Korrekturen automatisch umsetzen?"

### 5. Korrekturen umsetzen (falls gewünscht)

Wenn der User zustimmt:
- Setze sprachliche Korrekturen um
- Setze Zitationskorrekturen um
- Melde Argumentations-Probleme die manuelle Entscheidung brauchen

### 6. Speichern

Speichere den Review-Bericht in: `output/phase-06-review/draft/[X-X]-reviewed.md`
Falls Korrekturen umgesetzt: Aktualisiere das Kapitel in `output/phase-05-writing/draft/`

Empfehle: "Prüfe die Änderungen und nutze /approve um das Review freizugeben."
