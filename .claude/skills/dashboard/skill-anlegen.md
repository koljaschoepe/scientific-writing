# Eigener Skill im Werkzeugkasten (`/dashboard skill <name>`)

Kommt meist vom Knopf „Neu“ oder „Ändern“ im Werkzeugkasten.

1. Per Interview klären: Was soll der Skill tun, wann soll Claude ihn nutzen, darf Claude ihn
   selbst starten oder nur per Slash?
2. Anlegen unter `.claude/skills/<name>/SKILL.md` (Kleinbuchstaben, Bindestriche):
   ```yaml
   ---
   name: <name>
   description: <ein Satz, was er für die Person tut>
   when_to_use: <Auslösesätze, und wofür er nicht gedacht ist>
   disable-model-invocation: true   # nur wenn ausschließlich per Slash
   ---
   ```
   Darunter oben die wichtigsten Regeln, dann die Schritte. Kurz halten. Das Dashboard ordnet
   eigene Skills selbst der Gruppe „eigene“ zu.
3. Eigene Skills stehen nicht in `.claude/kit/manifest.json`, deshalb lässt `/update` sie in
   Ruhe. Kit-Skills nicht umschreiben, sondern einen eigenen daneben anlegen.
4. Hinweis: Neue Skills wirken nach einem Neustart von Claude.
