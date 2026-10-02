---
name: sync
description: Sichert die Arbeit und gleicht sie mit GitHub ab (lokal sichern, neuesten Stand holen, hochladen). Nur manuell über /sync.
disable-model-invocation: true
gruppe: technik
---

# /sync: Sichern und mit GitHub abgleichen

**Wichtig:** Nur manuell, direkt auf `main`, keine Branches. Nie `git push --force`, nie
`git reset --hard`, nie eine Fassung stillschweigend verwerfen. Alle Git-Schritte über
`node .claude/kit/werkzeuge/sync.mjs`, eigene Git-Befehle nur zum Anzeigen (`git show`).
Keine Git-Begriffe gegenüber der Person: „sichern“, „holen“, „hochladen“, „deine Fassung“,
„Fassung auf GitHub“.

## Ablauf

1. `node .claude/kit/werkzeuge/sync.mjs --json`, Feld `code` auswerten.
2. **code 0:** ein Satz aus `meldung`, fertig. Kein Interview.
3. **Jeder andere code:** `sync/sonderfaelle.md` lesen und befolgen.

## Ausgabe

Ein bis zwei Sätze ohne Git-Jargon, z. B. „Gesichert und hochgeladen. Neu dabei: Kapitel 2.1
und drei Quellen.“ Interview nur nach Konflikt oder Sonderfall: „Weiterarbeiten
(Empfohlen)“, „Fertig für heute“.
