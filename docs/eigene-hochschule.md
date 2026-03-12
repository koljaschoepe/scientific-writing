# Eigene Hochschule einrichten

Das Framework ist für jede Hochschule konfigurierbar. Hier erfährst du,
wie du es an die Vorgaben deiner Uni anpasst.

## Automatisch: Merkblatt-PDF

Der einfachste Weg: Lade das Merkblatt oder den Leitfaden deiner Hochschule
als PDF und gib den Pfad bei `/setup` an. Claude extrahiert automatisch:

- Seitenränder
- Schriftart und -größe
- Zeilenabstand
- Seitenumfang (min/max)
- Pflichtverzeichnisse
- Deckblatt-Anforderungen

## Manuell: config.yaml

Falls kein PDF vorhanden, kannst du alle Werte in `config.yaml` manuell setzen:

```yaml
formatierung:
  zitationsstil: "harvard-inline"   # Welcher Stil an deiner Uni?
  seitenumfang:
    min: 40                         # Mindest-Seitenzahl laut Prüfungsordnung
    max: 60                         # Maximal-Seitenzahl
  schriftart: "Times New Roman"     # Arial, Calibri, etc.
  schriftgroesse: 12                # Oft 11 oder 12
  zeilenabstand: 1.5               # 1.0, 1.15, 1.5 oder 2.0
  seitenraender:
    oben: 2.5
    unten: 2.5
    links: 3.0                      # Manche Unis wollen links 3cm (Bindung)
    rechts: 2.5
```

## Hochschul-Logo

Lege das Logo deiner Hochschule in `assets/img/` ab:
- Format: JPG, PNG oder PDF
- Empfohlene Breite: mindestens 500px
- Dateiname: beliebig (wird automatisch erkannt)

Das Logo erscheint auf dem Deckblatt der fertigen Arbeit.

## Pflichtverzeichnisse

Manche Hochschulen verlangen spezielle Verzeichnisse. Konfiguriere in `config.yaml`:

```yaml
verzeichnisse:
  hilfsmittelverzeichnis: true      # KI-Tools dokumentieren
  sperrvermerk: true                # Bei Unternehmenskooperationen
  abkuerzungsverzeichnis: true      # Fachbegriffe
```

## Zitationsstil

Falls deine Hochschule einen Stil verwendet, der nicht mitgeliefert wird:

1. Kopiere `base/guides/citation-systems/_vorlage.md`
2. Fülle die Vorlage mit den Regeln deiner Hochschule
3. Speichere als `base/guides/citation-systems/mein-stil.md`
4. Setze in `config.yaml`:
   ```yaml
   formatierung:
     zitationsstil: "mein-stil"
   ```

## Deckblatt

Das Deckblatt wird automatisch aus den Daten in `config.yaml` generiert.
Falls deine Hochschule ein spezielles Layout verlangt, kannst du nach dem
Kompilieren die Datei `output/phase-07-latex/latex/chapters/deckblatt.tex`
manuell anpassen und erneut `/compile` ausführen.
