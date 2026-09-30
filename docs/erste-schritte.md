# Die ersten 30 Minuten

> Was nach der Installation passiert und wie ein normaler Arbeitstag aussieht.
> Stand: 2026-09-30

## So arbeitest du mit Claude

- **Claude fragt, du klickst.** Fast jede Rückfrage kommt als Auswahl mit Knöpfen. Die
  empfohlene Antwort steht oben. Passt keine, schreib unten ins freie Feld, was du meinst.
- **Claude widerspricht.** Das ist gewollt. Wenn deine Forschungsfrage zu breit ist oder
  eine Quelle schwach, sagt Claude das zuerst, freundlich und mit Begründung. Du entscheidest.
- **Du kannst jederzeit einfach schreiben.** „Ich verstehe den Unterschied zwischen
  Random Forest und neuronalen Netzen nicht“ ist eine völlig normale Eingabe.
- **Nichts geht kaputt.** Alles liegt in Git. Was schiefgeht, lässt sich zurückholen.

## Minute 0 bis 10: /start

Tippe `/start`. Claude fragt in Runden nach:
1. dir und deiner Hochschule (Name, Studiengang, Betreuung)
2. deiner Arbeit (Art, Sprache, Umfang, Abgabedatum, Thema falls schon bekannt)
3. den Regeln für KI-Nutzung bei dir (wichtig für deine Selbstständigkeitserklärung)
4. den Formvorgaben (Zitierstil, Vorlage, Verzeichnisse). Hast du ein Merkblatt als PDF,
   leg es in `quellen/eingang/`, Claude liest die Vorgaben selbst heraus.

Am Ende steht dein Fahrplan im Dashboard.

## Minute 10 bis 15: Das Dashboard

Das Dashboard öffnet sich als Tab in VS Code (oder `/dashboard`). Es zeigt:
- den **Weg** durch die acht Phasen, von Einrichtung bis Abgabe, und wo du gerade stehst
- den **nächsten Schritt** und dein **Tagesziel**
- Reiter für **Quellen**, **Kapitel**, **Plan** und **Hilfe**

Oben ist ein Eingabefeld: Dort wählst du eine Aktion oder schreibst einen Auftrag. Beim
Absenden öffnet sich Claude mit dem fertigen Auftrag, du drückst nur noch Enter.
Mehr: [dashboard.md](dashboard.md).

## Minute 15 bis 30: /weiter

`/weiter` macht immer den nächsten sinnvollen Schritt. Am Anfang ist das die Themenfindung:
Ist dein Thema vorgegeben, schärft Claude mit dir Forschungsfrage und Abgrenzung. Ist es
noch offen, entwickelt Claude mit dir drei Varianten und prüft sie auf Machbarkeit.

## Ein normaler Arbeitstag

1. VS Code öffnen. Claude begrüßt dich mit dem Stand: Phase, nächster Schritt, Tage bis
   zur Abgabe.
2. `/weiter`, oder gezielt `/recherche`, `/schreiben 2.1`, `/pruefen 2.1`.
3. Zwischendurch im Dashboard Quellen sichten: nehmen, verwerfen, Stern vergeben.
4. Am Ende: `/sync`. Damit ist alles auf GitHub gesichert. Das passiert **nicht**
   automatisch. Claude erinnert dich, wenn es länger als zwei Tage her ist.

Alle Befehle: [befehle.md](befehle.md).
