---
globs: ["output/**/*.md"]
---

# Regeln für generierte Texte

## Wissenschaftliche Sprache
- Keine Ich-Form ("Ich denke..." -> "Es lässt sich argumentieren...")
- Sachlich-neutral formulieren
- Keine Umgangssprache
- Keine journalistischen Übertreibungen ("revolutionär", "bahnbrechend")
- Keine Absolutismen ohne Beleg ("immer", "nie", "alle")

## Zitationen

**Zitationsdichte nach Arbeitstyp** (config.projekt.typ):
- dissertation: 8-12 Zitationen pro Seite
- master: 6-10 Zitationen pro Seite
- bachelor: 5-10 Zitationen pro Seite
- hausarbeit: 3-6 Zitationen pro Seite
- seminararbeit: 3-5 Zitationen pro Seite
- Bei `quellen.workflow: "keine"`: 0 Zitationen (Argumentation durch Logik und Beispiele)

**Allgemeine Regeln** (nur wenn quellen.workflow NICHT "keine"):
- Jede faktische Behauptung mit Quelle belegen
- Zitate NUR aus sources/literature.md verwenden
- Zitationsformat aus dem konfigurierten Stil laden (config.yaml)
- Ca. 80% indirekte, 20% direkte Zitate

## Absatzstruktur (MEAL)
- Main Point: Kernaussage als erster Satz
- Evidence: Beleg durch Quelle
- Analysis: Eigene Einordnung
- Link: Verbindung zum nächsten Gedanken
- 80-150 Wörter pro Absatz

## Übergänge
- KEIN letzter Satz der das nächste Kapitel ankündigt
- KEIN erster Satz der das vorherige Kapitel zusammenfasst
- KEINE expliziten Kapitelverweise ("Wie in Kapitel X dargelegt...")
- Verbindung durch Konzeptnamen, nicht durch Verweise

## Vermeiden
- Gleiche Wörter in benachbarten Sätzen
- Gedankenstriche (Kommas bevorzugen)
- Eingeschobene Nebensätze die den Lesefluss stören
- Schwache Verben ("Es gibt...", "Man kann sagen...")
- Übertriebene Nominalisierungen

## Beachten
- Fachbegriffe beim ersten Auftreten definieren
- Zahlen in Sätze integrieren (nicht in Klammern)
- Wörter aus preferences.md vermeiden
