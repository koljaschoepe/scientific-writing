# Die ersten 30 Minuten

> Was nach der Installation passiert und wie ein normaler Arbeitstag aussieht.
> Stand: 2026-10-02

## So arbeitest du mit Claude

- **Claude fragt, du klickst.** Fast jede Rückfrage kommt als Auswahl mit Knöpfen. Die
  empfohlene Antwort steht oben. Passt keine, schreib unten ins freie Feld, was du meinst.
- **Claude widerspricht.** Das ist gewollt. Wenn deine Forschungsfrage zu breit ist oder
  eine Quelle schwach, sagt Claude das zuerst, freundlich und mit Begründung. Du entscheidest.
- **Du kannst jederzeit einfach schreiben.** „Ich verstehe den Unterschied zwischen
  Random Forest und neuronalen Netzen nicht“ ist eine völlig normale Eingabe.
- **Nichts geht kaputt.** Im Dashboard gibt es nach jeder Aktion „Rückgängig“, Claudes
  Änderungen nimmt der Rewind-Knopf zurück, und alles mit `/sync` Gesicherte lässt sich
  zurückholen. Mehr: [befehle.md](befehle.md#rückgängig-machen).
- **Claude fasst sich kurz.** Ein Satz Ergebnis, ein paar Stichpunkte, dann klickbare Links
  zu den geänderten Dateien.

## Minute 0 bis 10: /start

Tippe `/start`. Claude fragt in Runden nach:
1. deiner Arbeit (Art, Fach, Sprache)
2. dir und deiner Hochschule (Name, Institut, E-Mail)
3. Abgabe, Betreuung und Umfang in Seiten (z. B. 60 bis 80)
4. Thema, den Regeln für KI-Nutzung (wichtig für deine Selbstständigkeitserklärung) und wie
   ihr beim Schreiben zusammenarbeitet
5. den Formvorgaben (Zitierstil, Vorlage, Verzeichnisse). Hast du ein Merkblatt als PDF,
   leg es in `quellen/eingang/`, Claude liest die Vorgaben selbst heraus.

Am Ende stehen deine Einstellungen lesbar in `.arbeit/einstellungen.md` und dein Zeitplan
mit Meilensteinen im Dashboard.

## Minute 10 bis 15: Das Dashboard

Das Dashboard öffnet sich als Tab in VS Code (oder `/dashboard`). Es zeigt:
- den **Weg** durch die acht Phasen, von Einrichtung bis Abgabe, und wo du gerade stehst
- den **nächsten Schritt**, die Tage bis zur Abgabe und den Umfang in Seiten
- Reiter für **Quellen**, **Kapitel**, **Plan** und **Hilfe**

Oben rechts ist **Claude fragen**: Dort wählst du eine Aktion oder schreibst eine Nachricht.
Beim Absenden öffnet sich Claude mit der fertigen Nachricht, du drückst nur noch Enter.
Mehr: [dashboard.md](dashboard.md).

## Minute 15 bis 30: /weiter

`/weiter` (oder einfach „mach weiter“) macht immer den nächsten sinnvollen Schritt. Am Anfang ist das die Themenfindung:
Ist dein Thema vorgegeben, schärft Claude mit dir Forschungsfrage und Abgrenzung. Ist es
noch offen, entwickelt Claude mit dir drei Varianten und prüft sie auf Machbarkeit.

## Mit Cursor

Arbeitest du lieber in Cursor als in VS Code: geht genauso. Einmal die Erweiterung „Claude Code“
in Cursor installieren (Erweiterungen, „Claude Code“ suchen, Installieren, bzw. „Install for
Cursor“ auf der Seite der Erweiterung). Links öffnen dann von selbst in Cursor. Details:
[installation-windows.md](installation-windows.md#cursor-statt-vs-code).

## Ein normaler Arbeitstag

1. VS Code (oder Cursor) öffnen. Claude begrüßt dich mit dem Stand: Phase, nächster Schritt, Tage bis
   zur Abgabe.
2. `/weiter`, oder gezielt `/recherche`, `/schreiben 2.1`, `/pruefen 2.1`.
3. Zwischendurch im Dashboard Quellen sichten, Kapitel lesen oder das PDF aktualisieren.
   Ein Klick auf einen Absatz öffnet ihn im Editor. Claude erfährt bei deiner nächsten Nachricht,
   was du im Dashboard getan hast.
4. Am Ende: `/sync`. Damit ist alles auf GitHub gesichert. Das passiert **nicht**
   automatisch. Claude erinnert dich, wenn es länger als zwei Tage her ist.

Alle Befehle: [befehle.md](befehle.md).
