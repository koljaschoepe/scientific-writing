# Zitierstil: Harvard (deutsch, mit „vgl.“)

> Wird geladen, wenn `arbeit/projekt.json → zitation.stil` den Wert `harvard-de` hat.
> Biblatex-Stil: `authoryear (mit „vgl.“-Präfix)`. Stand: 2026-09-30

## So zitierst du im Markdown

Im Kapiteltext steht nie ein fertig formatierter Beleg, sondern ein Pandoc-Zitierbefehl.
Biblatex setzt daraus Beleg und Literaturverzeichnis im gewählten Stil.

| Zweck | Markdown | Ergebnis im PDF |
| --- | --- | --- |
| indirekt | `[vgl. @mueller2022, S. 15]` | (vgl. Müller 2022, S. 15) |
| direkt | `[@mueller2022, S. 15]` | (Müller 2022, S. 15) |
| Autor im Satz | `@mueller2022 [S. 15] zeigt ...` | Müller (2022, S. 15) zeigt ... |
| mehrere | `[vgl. @a2020; @b2021]` | (vgl. A 2020; B 2021) |

Die Beispiele und Regeln unten beschreiben, wie das Ergebnis aussehen muss. Sie dienen
zum Prüfen (vollständige bib-Felder, richtige Autorenangaben), nicht zum Abtippen.
Literaturverzeichnis: setzt biblatex automatisch aus `quellen/literatur.bib`.


## Grundprinzip

Kurzbeleg im Text, Vollbeleg im Literaturverzeichnis.
Jede Behauptung muss eindeutig belegt und nachprüfbar sein.

---

## Indirektes Zitat (sinngemäß)

Für Paraphrasen und sinngemäße Übernahmen:

```
(vgl. Autor Jahr, S. X)
(vgl. Autor Jahr, S. X f.)      -> folgende Seite
(vgl. Autor Jahr, S. X ff.)     -> mehrere folgende Seiten
```

Beispiele:
```
Die Implementierung erfordert strukturelle Anpassungen (vgl. Mueller 2021, S. 3).
Graph Neural Networks modellieren Moleküle als Graphen (vgl. Gilmer et al. 2017).
Kleine Datensätze begrenzen die Übertragbarkeit (vgl. Merkel/Garrel 2022, S. 454).
```

## Direktes Zitat (wörtlich)

OHNE "vgl.", in Anführungszeichen:

```
(Autor Jahr, S. X)
```

Beispiel:
```
"Die fehlenden Strukturen stellen eine Herausforderung dar" (Wintergerst 2024, S. 49).
```

## Autorenanzahl

| Anzahl | Format |
|--------|--------|
| 1 Autor | `(vgl. Mueller 2022, S. 15)` |
| 2 Autoren | `(vgl. Mueller/Schmidt 2022, S. 15)` |
| 3+ Autoren | `(vgl. Mueller et al. 2022, S. 15)` |

## Mehrere Werke eines Autors im selben Jahr

```
(vgl. Mueller 2025a, S. 70)
(vgl. Mueller 2025b, S. 130)
```

## Bezug auf vorherige Quelle

```
(vgl. ebd., S. 78)      -> selbe Quelle, andere Seite
(vgl. ebd.)             -> selbe Quelle, selbe Seite
```

---

## Positionierung

### Am Satzende (Standard)
```
Die Plattform eröffnet neue Möglichkeiten (vgl. Kok et al. 2024, S. 51).
```

### Mehrere Quellen im Satz
Jede Aussage separat belegen:
```
Im privaten Alltag sind KI-Tools verbreitet (vgl. Mueller 2023, S. 12),
im Mittelstand herrscht Zurückhaltung (vgl. Merkel/Garrel 2022, S. 454).
```

---

## Spezialfälle

### Internetquellen (ohne Seitenangabe)
```
(vgl. KPMG 2024)
```

### Gesetze und Verordnungen
```
(vgl. Art. 4 Nr. 7 DSGVO)
(vgl. EU AI Act, Art. 1 Abs. 1)
```

### Auslassungen in direkten Zitaten
```
"Die Lücke [...] wird durch Spezifikationen überbrückt" (Mueller 2023, S. 12).
```

### Sekundärzitat (VERMEIDEN)
Nur wenn Original nicht zugänglich:
```
(Originalautor Jahr, S. X, zitiert nach Sekundärautor Jahr, S. Y)
```

---

## Literaturverzeichnis

### Buch
```
Nachname, V. (Jahr): Titel. Auflage. Verlag, Ort.
```

### Journal-Artikel
```
Nachname, V./Nachname, V. (Jahr): Titel. In: Journalname, Jg. X, Nr. Y, S. X-Y.
```

### Sammelband
```
Nachname, V. (Jahr): Titel. In: Herausgeber, V. (Hrsg.): Sammelband. Verlag, Ort, S. X-Y.
```

### Internetquelle
```
Nachname, V./Organisation (Jahr): Titel. URL: [vollständige URL], Abruf: TT.MM.JJJJ.
```

### Sortierung
- Alphabetisch nach Nachname
- Dann chronologisch aufsteigend
- Bei gleichem Jahr: a, b, c anhängen

---

## Richtwerte

**Zitationsdichte nach Arbeitstyp** (aus `arbeit/projekt.json → arbeit.typ`; im Fachprofil Naturwissenschaft gelten dessen Belegregeln):
- Dissertation: 8-12 Zitationen pro Seite
- Masterarbeit: 6-10 Zitationen pro Seite
- Bachelorarbeit: 5-10 Zitationen pro Seite
- Hausarbeit: 3-6 Zitationen pro Seite
- Seminararbeit: 3-5 Zitationen pro Seite

**Verhältnis:**
- **Ca. 80% indirekte Zitate** (Paraphrasen mit "vgl.")
- **Ca. 20% direkte Zitate** (wörtlich, nur bei prägnanten Formulierungen)
