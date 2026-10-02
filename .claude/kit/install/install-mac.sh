#!/bin/bash
# Scientific Writing Kit - Einrichtung für macOS
#
# Installiert alles, was du für deine wissenschaftliche Arbeit mit Claude brauchst,
# legt dein privates GitHub-Repo an und öffnet es in VS Code.
#
# Start im Terminal:
#   curl -fsSL https://raw.githubusercontent.com/koljaschoepe/scientific-writing/main/.claude/kit/install/install-mac.sh | bash
# oder als Datei:
#   bash .claude/kit/install/install-mac.sh            alles einrichten
#   bash .claude/kit/install/install-mac.sh --pruefen  nur prüfen
#
# Wiederholbar: Was schon da ist, wird übersprungen.
#
# LaTeX-Entscheidung: MacTeX ohne Oberfläche (mactex-no-gui, rund 6 GB) statt BasicTeX.
# BasicTeX ist klein, aber jedes fehlende Paket muss mit "sudo tlmgr install" nachinstalliert
# werden. Genau diese Fehler ("File xyz.sty not found") kann eine nicht technische Person
# nicht selbst lösen. MacTeX enthält alles, einmal installiert, nie wieder Paketprobleme.
# Bei weniger als 12 GB freiem Speicher bietet das Skript BasicTeX mit den nötigen Paketen an.

set -u
VORLAGE="${VORLAGE:-koljaschoepe/scientific-writing}"
LOG="${TMPDIR:-/tmp}/scientific-writing-install.log"
exec > >(tee -a "$LOG") 2>&1

BLAU=$'\033[36m'; GRUEN=$'\033[32m'; GELB=$'\033[33m'; ROT=$'\033[31m'; GRAU=$'\033[90m'; AUS=$'\033[0m'
SCHRITT=0
titel()   { SCHRITT=$((SCHRITT+1)); printf '\n%s[%s] %s%s\n' "$BLAU" "$SCHRITT" "$1" "$AUS"; }
ok()      { printf '    %sOK%s    %s\n' "$GRUEN" "$AUS" "$1"; }
info()    { printf '          %s%s%s\n' "$GRAU" "$1" "$AUS"; }
warnung() { printf '    %sACHTUNG%s  %s\n' "$GELB" "$AUS" "$1"; }
fehler()  { printf '    %sFEHLER%s   %s\n' "$ROT" "$AUS" "$1"; }
da()      { command -v "$1" >/dev/null 2>&1; }
# Eingaben kommen vom Terminal, auch wenn das Skript per "curl | bash" läuft
frage()   { local a; printf '    %s [%s]: ' "$1" "$2" > /dev/tty; read -r a < /dev/tty || a=""; echo "${a:-$2}"; }

pfad_auffrischen() {
  [ -x /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"
  [ -x /usr/local/bin/brew ] && eval "$(/usr/local/bin/brew shellenv)"
  [ -d /Library/TeX/texbin ] && export PATH="/Library/TeX/texbin:$PATH"
  [ -d "$HOME/.local/bin" ] && export PATH="$HOME/.local/bin:$PATH"
  [ -d "/Applications/Visual Studio Code.app/Contents/Resources/app/bin" ] && export PATH="$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin"
  [ -d "/Applications/Cursor.app/Contents/Resources/app/bin" ] && export PATH="$PATH:/Applications/Cursor.app/Contents/Resources/app/bin"
  hash -r
}
pfad_auffrischen

printf '\n  Scientific Writing Kit - Einrichtung\n  %s------------------------------------%s\n  %sProtokoll: %s%s\n' "$GRAU" "$AUS" "$GRAU" "$LOG" "$AUS"

ERWEITERUNGEN=(anthropic.claude-code MS-CEINTL.vscode-language-pack-de james-yu.latex-workshop tomoki1207.pdf ms-python.python)

# ------------------------------------------------------------ nur prüfen
if [ "${1:-}" = "--pruefen" ]; then
  titel 'Prüfe installierte Programme'
  for b in brew git node pandoc lualatex biber gh uv code claude; do
    if da "$b"; then ok "$(printf '%-9s' "$b") $("$b" --version 2>/dev/null | head -1)"; else fehler "$b fehlt"; fi
  done
  da gh && { gh auth status >/dev/null 2>&1 && ok 'GitHub-Anmeldung vorhanden' || fehler 'GitHub: nicht angemeldet'; }
  exit 0
fi

# ------------------------------------------------------------ 1. Homebrew
titel 'Prüfe Homebrew (Paketmanager für macOS)'
if ! da brew; then
  info 'Homebrew wird installiert. Du wirst nach deinem Mac-Passwort gefragt (Eingabe bleibt unsichtbar).'
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" < /dev/tty
  pfad_auffrischen
  # Homebrew dauerhaft in die Shell eintragen
  if [ -x /opt/homebrew/bin/brew ] && ! grep -q 'brew shellenv' "$HOME/.zprofile" 2>/dev/null; then
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
  fi
fi
da brew && ok 'Homebrew ist da' || { fehler 'Homebrew fehlt. Bitte https://brew.sh öffnen und dort installieren, dann Skript erneut starten.'; exit 1; }

# ------------------------------------------------------------ 2. Programme
titel 'Installiere die Programme (beim ersten Mal 10 bis 30 Minuten)'
installiere() { # befehl formel [cask]
  if da "$1"; then ok "$(printf '%-9s' "$1") schon da"; return; fi
  info "Installiere $2 ..."
  if [ "${3:-}" = cask ]; then brew install --cask "$2"; else brew install "$2"; fi
  pfad_auffrischen
  da "$1" && ok "$1 installiert" || fehler "$2 konnte nicht installiert werden"
}
installiere git git
installiere node node
installiere pandoc pandoc
installiere gh gh
installiere uv uv
installiere code visual-studio-code cask

if ! da claude; then
  info 'Installiere Claude Code ...'
  curl -fsSL https://claude.ai/install.sh | bash
  pfad_auffrischen
fi
da claude && ok 'Claude Code ist da' || warnung 'Claude Code im Terminal fehlt (die VS-Code-Erweiterung bringt Claude trotzdem mit)'

# ------------------------------------------------------------ 3. LaTeX
titel 'Installiere LaTeX (für das PDF)'
if da lualatex && da biber; then
  ok 'LaTeX ist schon da'
else
  frei_gb=$(df -g "$HOME" | awk 'NR==2 {print $4}')
  if [ "${frei_gb:-0}" -ge 12 ]; then
    info 'Installiere MacTeX (rund 6 GB, dauert). Du wirst nach deinem Mac-Passwort gefragt.'
    brew install --cask mactex-no-gui
  else
    warnung "Nur ${frei_gb} GB frei. Installiere das kleine BasicTeX und die nötigen Pakete."
    brew install --cask basictex
    pfad_auffrischen
    sudo tlmgr update --self
    sudo tlmgr install latexmk biber biblatex biblatex-chem koma-script mhchem chemfig siunitx \
      csquotes babel-german hyphen-german booktabs cleveref microtype setspace lm fontspec \
      luatexbase luaotfload hyperref xcolor float caption enumitem
  fi
  pfad_auffrischen
  da lualatex && ok 'LaTeX installiert' || warnung 'LaTeX erst nach einem neuen Terminal-Fenster sichtbar'
fi

# ------------------------------------------------------------ 4. Git
titel 'Stelle Git auf dich ein'
g_name=$(git config --global user.name || true)
g_mail=$(git config --global user.email || true)
[ -z "$g_name" ] && g_name=$(frage 'Dein Vor- und Nachname (steht an jeder Sicherung)' '') && [ -n "$g_name" ] && git config --global user.name "$g_name"
[ -z "$g_mail" ] && g_mail=$(frage 'Deine E-Mail-Adresse (dieselbe wie bei GitHub)' '') && [ -n "$g_mail" ] && git config --global user.email "$g_mail"
git config --global init.defaultBranch main
git config --global core.quotepath false
ok "Git kennt dich als: $g_name <$g_mail>"

# ------------------------------------------------------------ 5. Editor-Erweiterungen
titel 'Installiere die Erweiterungen (VS Code, Cursor)'
editoren=0
for ed in code cursor; do
  da "$ed" || continue
  editoren=1
  vorhanden=$("$ed" --list-extensions 2>/dev/null | tr '[:upper:]' '[:lower:]')
  for e in "${ERWEITERUNGEN[@]}"; do
    klein=$(echo "$e" | tr '[:upper:]' '[:lower:]')
    if echo "$vorhanden" | grep -qx "$klein"; then ok "$ed: $e schon da"; continue; fi
    "$ed" --install-extension "$e" --force >/dev/null 2>&1 && ok "$ed: $e installiert" || warnung "$ed: $e nicht installiert"
  done
done
[ "$editoren" = 0 ] && warnung 'Weder VS Code noch Cursor gefunden. Erweiterungen schlägt der Editor beim Öffnen des Projekts vor.'

# ------------------------------------------------------------ 6. Browser-Zugriff
titel 'Bereite den Browser-Zugriff für Claude vor (Bibliothek, Verlage, Suche)'
if da npx; then
  npx -y @playwright/mcp@latest --help >/dev/null 2>&1 && ok 'Playwright ist bereit' || warnung 'Playwright wird beim ersten Gebrauch vorbereitet'
  if [ ! -d "/Applications/Google Chrome.app" ] && [ ! -d "/Applications/Microsoft Edge.app" ]; then
    info 'Kein Chrome oder Edge gefunden, lade den Playwright-Browser ...'
    npx -y playwright install chromium >/dev/null 2>&1 && ok 'Browser geladen' || warnung 'Browser wird beim ersten Gebrauch geladen'
  fi
fi

# ------------------------------------------------------------ 7. GitHub
titel 'Melde dich bei GitHub an'
gh_ok=0
if da gh; then
  if gh auth status >/dev/null 2>&1; then ok 'Schon angemeldet'; gh_ok=1
  else
    info 'Noch kein GitHub-Konto? Kostenlos anlegen: https://github.com/signup'
    info 'Gleich erscheint ein Code. Im Browser eingeben und "Authorize" klicken.'
    frage 'Enter drücken, wenn du bereit bist' '' >/dev/null
    gh auth login --web --git-protocol https --hostname github.com < /dev/tty && { ok 'Angemeldet'; gh_ok=1; } || fehler 'Anmeldung fehlgeschlagen. Später: gh auth login --web'
  fi
  [ $gh_ok = 1 ] && gh auth setup-git >/dev/null 2>&1
fi

# ------------------------------------------------------------ 8. Eigenes Repo
titel 'Lege dein privates Arbeits-Repo an'
ziel=""
if [ $gh_ok = 1 ]; then
  name=$(frage 'Name für dein Projekt (ohne Leerzeichen)' 'diplomarbeit')
  name=$(echo "$name" | sed 's/[^A-Za-z0-9._-]/-/g')
  # Nicht in ~/Documents: dort synchronisiert oft iCloud mit, das verträgt sich schlecht mit Git
  basis=$(frage 'In welchem Ordner soll es liegen?' "$HOME/Arbeiten")
  mkdir -p "$basis"
  ziel="$basis/$name"
  if [ -d "$ziel/.git" ]; then
    ok "Projekt existiert schon: $ziel"
  else
    konto=$(gh api user --jq .login)
    if ! gh repo view "$konto/$name" >/dev/null 2>&1; then
      info "Erzeuge privates Repo $konto/$name aus der Vorlage ..."
      gh repo create "$name" --private --template "$VORLAGE" --description 'Meine wissenschaftliche Arbeit'
    fi
    for i in 1 2 3 4 5 6 7 8 9 10; do
      (cd "$basis" && gh repo clone "$konto/$name" "$name" >/dev/null 2>&1) && break
      sleep 3
    done
    if [ -d "$ziel/.git" ]; then
      ok "Projekt liegt in: $ziel"
      git -C "$ziel" remote add vorlage "https://github.com/$VORLAGE.git" 2>/dev/null || true
    else
      fehler 'Repo konnte nicht geklont werden. Später: gh repo clone <konto>/<name>'
      ziel=""
    fi
  fi
else
  warnung 'Ohne GitHub-Anmeldung kann das Repo nicht angelegt werden. Skript später erneut starten.'
fi
# Dateien, die nur das Template braucht, aus dem eigenen Projekt entfernen (einmalig, idempotent)
if [ -n "$ziel" ] && [ -d "$ziel/.git" ]; then
  aufgeraeumt=0
  for d in .github CONTRIBUTING.md kit; do
    if [ -e "$ziel/$d" ]; then git -C "$ziel" rm -r -q --ignore-unmatch -- "$d" >/dev/null 2>&1; rm -rf "${ziel:?}/$d"; aufgeraeumt=1; fi
  done
  if [ -f "$ziel/LICENSE" ]; then
    mkdir -p "$ziel/.claude/kit"
    git -C "$ziel" mv -f LICENSE .claude/kit/LICENSE >/dev/null 2>&1 || mv "$ziel/LICENSE" "$ziel/.claude/kit/LICENSE"
    aufgeraeumt=1
  fi
  if [ $aufgeraeumt = 1 ]; then
    git -C "$ziel" add -A -- .claude/kit/LICENSE >/dev/null 2>&1
    git -C "$ziel" commit -q -m 'Projekt angelegt' >/dev/null 2>&1 && git -C "$ziel" push -q >/dev/null 2>&1
    ok 'Projekt aufgeräumt (Dateien nur für das Template entfernt)'
  fi
  mkdir -p "$ziel/.lokal" && cp "$LOG" "$ziel/.lokal/install.log" 2>/dev/null
fi

# ------------------------------------------------------------ 9. Abschluss
titel 'Fertig. So geht es weiter'
cat <<EOF

    1. VS Code (oder Cursor) öffnet gleich deinen Projektordner.
       "Vertrauen Sie den Autoren?"  ->  "Ja, ich vertraue den Autoren"
       "Automatische Aufgaben erlauben?"  ->  "Zulassen" (startet dein Dashboard)
    2. Rechts oben auf das Claude-Symbol klicken und mit deinem Claude-Konto anmelden.
       Frage nach dem Server "playwright": erlauben.
    3. In das Claude-Feld tippen:  /start

    Hilfe: /hilfe in Claude oder .claude/kit/docs/probleme.md im Projekt.

EOF
if [ -n "$ziel" ]; then
  if da code; then code "$ziel"; elif da cursor; then cursor "$ziel"; fi
fi
exit 0
