# Konfiguration

Alle Optionen in `config.yaml` im Überblick. Diese Datei wird von `/setup` automatisch generiert.

## Projekt

```yaml
projekt:
  titel: "Dein Arbeitstitel"        # Wird in Phase 1/2 festgelegt
  sprache: "de"                     # de | en
  typ: "bachelor"                   # seminararbeit | hausarbeit | bachelor | master | dissertation
  methodik: "literatur"             # literatur | empirisch-qualitativ | empirisch-quantitativ
```

### Arbeitstypen und empfohlene Seitenumfänge

| Typ | Seitenumfang (Richtwert) | Kapitelmodell |
|-----|--------------------------|---------------|
| seminararbeit | 10-20 Seiten | 3-Kapitel |
| hausarbeit | 15-25 Seiten | 3- oder 4-Kapitel |
| bachelor | 30-60 Seiten | 4- bis 5-Kapitel |
| master | 50-100 Seiten | 5- bis 6-Kapitel |
| dissertation | 150+ Seiten | 6+-Kapitel |

## Autor

```yaml
autor:
  name: "Max Mustermann"
  matrikelnummer: "12345"
  hochschule: "Technische Universität Berlin"
  fakultaet: "Wirtschaftswissenschaften"
  studiengang: "Betriebswirtschaftslehre"
```

## Betreuung

```yaml
betreuung:
  erstgutachter: "Prof. Dr. Anna Müller"
  zweitgutachter: "Prof. Dr. Klaus Schmidt"
```

## Abgabe

```yaml
abgabe:
  datum: "15.09.2026"
  ort: "Berlin"                     # Für Selbstständigkeitserklärung
```

## Formatierung

```yaml
formatierung:
  zitationsstil: "harvard-inline"   # harvard-inline | apa7 | ieee | chicago
  seitenumfang:
    min: 40                         # Minimale Seitenzahl (Textteil)
    max: 60                         # Maximale Seitenzahl (Textteil)
  schriftart: "Times New Roman"     # Beliebige Schriftart (muss installiert sein)
  schriftgroesse: 12                # In pt
  zeilenabstand: 1.5               # 1.0, 1.15, 1.5 oder 2.0
  seitenraender:
    oben: 2.5                       # In cm
    unten: 2.5
    links: 2.5
    rechts: 2.5
```

## Verzeichnisse

```yaml
verzeichnisse:
  inhaltsverzeichnis: true          # Immer true
  abbildungsverzeichnis: true       # Nur wenn Abbildungen vorhanden
  tabellenverzeichnis: true         # Nur wenn Tabellen vorhanden
  abkuerzungsverzeichnis: true      # Empfohlen bei Facharbeiten
  literaturverzeichnis: true        # Immer true
  hilfsmittelverzeichnis: false     # Manche Unis verlangen das
  selbststaendigkeitserklaerung: true
  sperrvermerk: false               # Bei Unternehmenskooperationen
```

## Quellen

```yaml
quellen:
  workflow: "bibtex"                # bibtex | pdf-extraktion | manuell | keine
  import_pfad: "./literatur.bib"   # Pfad zur .bib oder Zotero-Exportdatei (CSV/RIS)
```

| Workflow | Beschreibung |
|----------|-------------|
| `bibtex` | Import aus .bib-Datei (BibTeX/BibLaTeX) |
| `pdf-extraktion` | KI-basierte Extraktion aus PDF-Dateien |
| `manuell` | Quellen einzeln per `/cite` erfassen |
| `keine` | Ohne Quellen arbeiten (nur seminararbeit/hausarbeit) |

## LaTeX

```yaml
latex:
  auto_compile: true                # latexmk -pvc Watcher nach erster Kompilierung
  installation_geprueft: false      # Wird automatisch von /setup oder /compile gesetzt
```

## Logo

```yaml
logo:
  pfad: "assets/img/uni-logo.png"   # Relativer Pfad zum Hochschul-Logo
  erkannt: true                     # Vom Setup automatisch gesetzt
```

## Fortschritt

```yaml
fortschritt:
  aktuelle_phase: 3                 # 0-7
  abgeschlossene_phasen: [1, 2]
  gestartet_am: "2026-03-12"
  letztes_update: "2026-03-15"
```

## Eigenen Zitationsstil hinzufügen

1. Kopiere `base/guides/citation-systems/_vorlage.md`
2. Benenne die Kopie (z.B. `mein-stil.md`)
3. Fülle die Vorlage aus
4. Trage den Dateinamen (ohne .md) in config.yaml ein:
   ```yaml
   formatierung:
     zitationsstil: "mein-stil"
   ```
