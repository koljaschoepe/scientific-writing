# Phase: Prüfen

> Geladen von `/weiter`, wenn `phase` = `pruefen`.
> Ziel: die ganze Arbeit als Einheit prüfen und auf Abgabeniveau bringen.
> Einzelkapitel wurden in der Schreibphase schon geprüft. Hier geht es um das Ganze.

## Woran du erkennst, was schon erledigt ist

| Schritt | erledigt, wenn |
| --- | --- |
| 1 Gesamtlektüre | `arbeit/pruefung/gesamt.md` existiert |
| 2 Umfang | Arbeit im Rahmen ±10 % oder Kürzungsplan umgesetzt |
| 3 Zitattreue gesamt | alle Kapitel mit Zitatprüfung ohne hohe Funde |
| 4 Korrekturen | alle Kapitel `final` |
| 5 Final-Gate | `arbeit/pruefung/final.md` ohne Rot |

## Schritte

1. **Gesamtlektüre** (pruefer-argumentation über die ganze Arbeit, kapitelweise mit
   Zusammenfassungen, um Kontext zu sparen): roter Faden über alle Kapitel, Wiederholungen,
   Widersprüche, Forschungsfrage in Einleitung und Fazit deckungsgleich, Gewichtung.
   Ergebnis mit Notenschätzung der ganzen Arbeit nach `arbeit/pruefung/gesamt.md`.
2. **Umfang:** Wortstand über `node kit/werkzeuge/stand.mjs`. Bei Überschreitung Kürzungsplan
   (Redundanzen zuerst, dann Grundlagen, dann Nebenaspekte in den Anhang) per Interview
   entscheiden lassen und mit Agent `autor` (Modus `kuerzen`) umsetzen.
3. **Zitattreue gesamt:** Kapitel ohne aktuelle Zitatprüfung nachprüfen (`/pruefen <nr>` nur
   mit Prüfer Zitate). Aus der Bachelorarbeit: Die gefährlichsten Fehler tauchten erst hier auf.
4. **Korrekturen** umsetzen, Kapitel auf `final` setzen (Interview je Kapitel oder gesammelt).
5. **Final-Gate:** `/pruefen final`.
6. **Probelesen durch Menschen** anregen: Interview, ob jemand (Betreuung, Kommilitonin,
   Familie) die Arbeit oder Teile lesen soll, Entwurfs-PDF dafür erzeugen.

## Fertig, wenn

Final-Gate ohne Rot, Person gibt frei. Nächste Phase: `abgabe`.
