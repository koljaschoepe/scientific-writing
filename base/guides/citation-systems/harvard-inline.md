# Zitationsstil: Harvard Inline

> Dieser Stil wird geladen, wenn `config.yaml` den Wert `harvard-inline` enthält.

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
Change Management beschreibt die Anpassung von Strategien (vgl. Schewe 2018).
Viele Unternehmen agieren zurückhaltend (vgl. Merkel/Garrel 2022, S. 454).
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

**Zitationsdichte nach Arbeitstyp** (aus config.projekt.typ):
- Dissertation: 8-12 Zitationen pro Seite
- Masterarbeit: 6-10 Zitationen pro Seite
- Bachelorarbeit: 5-10 Zitationen pro Seite
- Hausarbeit: 3-6 Zitationen pro Seite
- Seminararbeit: 3-5 Zitationen pro Seite

**Verhältnis:**
- **Ca. 80% indirekte Zitate** (Paraphrasen mit "vgl.")
- **Ca. 20% direkte Zitate** (wörtlich, nur bei prägnanten Formulierungen)
