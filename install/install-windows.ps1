<#
  Scientific Writing Kit - Einrichtung fuer Windows
  --------------------------------------------------
  Installiert alles, was du fuer deine wissenschaftliche Arbeit mit Claude brauchst,
  legt dein privates GitHub-Repo an und oeffnet es in VS Code.

  Start (PowerShell, kein Administrator noetig):
    irm https://raw.githubusercontent.com/koljaschoepe/scientific-writing/main/install/install-windows.ps1 | iex

  Oder als Datei:
    powershell -ExecutionPolicy Bypass -File install-windows.ps1
    powershell -ExecutionPolicy Bypass -File install-windows.ps1 -NurPruefen

  Das Skript ist wiederholbar: Was schon da ist, wird uebersprungen.
  Hinweis: Die Datei ist bewusst ohne Umlaute geschrieben. Windows PowerShell 5.1 liest
  Skripte ohne BOM sonst falsch ein und zeigt kaputte Zeichen.
#>
[CmdletBinding()]
param(
  [switch]$NurPruefen,
  [string]$RepoName = '',
  [string]$Zielordner = '',
  [string]$Vorlage = 'koljaschoepe/scientific-writing'
)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$LogDatei = Join-Path $env:TEMP 'scientific-writing-install.log'
try { Start-Transcript -Path $LogDatei -Append | Out-Null } catch {}

# ---------------------------------------------------------------- Ausgabe
$script:Schritt = 0
function Titel($text) {
  $script:Schritt++
  Write-Host ''
  Write-Host ("[{0}] {1}" -f $script:Schritt, $text) -ForegroundColor Cyan
}
function Ok($text)      { Write-Host "    OK    $text" -ForegroundColor Green }
function Info($text)    { Write-Host "          $text" -ForegroundColor Gray }
function Warnung($text) { Write-Host "    ACHTUNG  $text" -ForegroundColor Yellow }
function Fehler($text)  { Write-Host "    FEHLER   $text" -ForegroundColor Red }

function Frage($text, $standard) {
  $hinweis = if ($standard) { " [$standard]" } else { '' }
  $antwort = Read-Host ("    " + $text + $hinweis)
  if ([string]::IsNullOrWhiteSpace($antwort)) { return $standard }
  return $antwort.Trim()
}

function JaNein($text, $standardJa = $true) {
  $opt = if ($standardJa) { 'J/n' } else { 'j/N' }
  $a = Read-Host ("    $text ($opt)")
  if ([string]::IsNullOrWhiteSpace($a)) { return $standardJa }
  return $a.Trim().ToLower().StartsWith('j') -or $a.Trim().ToLower().StartsWith('y')
}

# ---------------------------------------------------------------- Hilfen
function PfadAuffrischen {
  $maschine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $benutzer = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = ($maschine, $benutzer -join ';')
  # Programme, die sich nicht immer sofort in den PATH eintragen
  $extra = @(
    "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64",
    "$env:ProgramFiles\MiKTeX\miktex\bin\x64",
    "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin",
    "$env:ProgramFiles\Microsoft VS Code\bin",
    "$env:ProgramFiles\Git\cmd",
    "$env:ProgramFiles\GitHub CLI",
    "$env:ProgramFiles\nodejs",
    "$env:LOCALAPPDATA\Pandoc",
    "$env:USERPROFILE\.local\bin"
  )
  foreach ($p in $extra) {
    if ((Test-Path $p) -and ($env:Path -notlike "*$p*")) { $env:Path = "$env:Path;$p" }
  }
}

function Vorhanden($befehl) {
  return [bool](Get-Command $befehl -ErrorAction SilentlyContinue)
}

function VersionVon($befehl) {
  try {
    $v = & $befehl --version 2>$null | Select-Object -First 1
    return "$v".Trim()
  } catch { return '' }
}

function WingetInstall($id, $name, $zusatz = @()) {
  Info "Installiere $name ... (Windows fragt eventuell nach Erlaubnis: bitte 'Ja' klicken)"
  $argumente = @('install', '--id', $id, '-e', '--accept-source-agreements', '--accept-package-agreements', '--silent', '--disable-interactivity') + $zusatz
  & winget @argumente | Out-Host
  $code = $LASTEXITCODE
  PfadAuffrischen
  # -1978335189 = schon installiert, kein Update verfuegbar
  if ($code -eq 0 -or $code -eq -1978335189 -or $code -eq -1978335135) { return $true }
  Warnung "${name}: winget meldet Code $code"
  return $false
}

# Werkzeuge: Befehl, winget-ID, Anzeigename, wofuer
$Werkzeuge = @(
  @{ Befehl = 'git';     Id = 'Git.Git';                    Name = 'Git';            Wofuer = 'Versionsverwaltung und Backup (/sync)' },
  @{ Befehl = 'node';    Id = 'OpenJS.NodeJS.LTS';          Name = 'Node.js';        Wofuer = 'Dashboard, Werkzeuge, Browser-Zugriff' },
  @{ Befehl = 'code';    Id = 'Microsoft.VisualStudioCode'; Name = 'VS Code';        Wofuer = 'dein Arbeitsprogramm'; Zusatz = @('--scope', 'user') },
  @{ Befehl = 'pandoc';  Id = 'JohnMacFarlane.Pandoc';      Name = 'Pandoc';         Wofuer = 'wandelt Kapitel in LaTeX um' },
  @{ Befehl = 'lualatex';Id = 'MiKTeX.MiKTeX';              Name = 'MiKTeX (LaTeX)'; Wofuer = 'baut das PDF' },
  @{ Befehl = 'gh';      Id = 'GitHub.cli';                 Name = 'GitHub CLI';     Wofuer = 'Anmeldung bei GitHub' },
  @{ Befehl = 'uv';      Id = 'astral-sh.uv';               Name = 'uv (Python)';    Wofuer = 'Code, Auswertungen, Plots' },
  @{ Befehl = 'claude';  Id = 'Anthropic.ClaudeCode';       Name = 'Claude Code';    Wofuer = 'Claude im Terminal (die VS-Code-Erweiterung bringt es auch mit)' }
)

$Erweiterungen = @(
  @{ Id = 'anthropic.claude-code';               Name = 'Claude Code' },
  @{ Id = 'MS-CEINTL.vscode-language-pack-de';   Name = 'Deutsche Oberflaeche' },
  @{ Id = 'james-yu.latex-workshop';             Name = 'LaTeX Workshop' },
  @{ Id = 'tomoki1207.pdf';                      Name = 'PDF-Ansicht' },
  @{ Id = 'ms-python.python';                    Name = 'Python' }
)

PfadAuffrischen

Write-Host ''
Write-Host '  Scientific Writing Kit - Einrichtung' -ForegroundColor White
Write-Host '  ------------------------------------' -ForegroundColor DarkGray
Write-Host "  Protokoll: $LogDatei" -ForegroundColor DarkGray

# ================================================================ Nur pruefen
if ($NurPruefen) {
  Titel 'Pruefe installierte Programme'
  foreach ($w in $Werkzeuge) {
    if (Vorhanden $w.Befehl) { Ok ("{0,-16} {1}" -f $w.Name, (VersionVon $w.Befehl)) }
    else { Fehler ("{0,-16} fehlt ({1})" -f $w.Name, $w.Wofuer) }
  }
  if (Vorhanden 'gh') {
    & gh auth status 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { Ok 'GitHub-Anmeldung vorhanden' } else { Fehler 'GitHub: nicht angemeldet' }
  }
  if (Vorhanden 'code') {
    $installiert = (& code --list-extensions 2>$null) -join "`n"
    foreach ($e in $Erweiterungen) {
      if ($installiert -match [regex]::Escape($e.Id)) { Ok "Erweiterung $($e.Name)" } else { Fehler "Erweiterung $($e.Name) fehlt" }
    }
  }
  try { Stop-Transcript | Out-Null } catch {}
  return
}

# ================================================================ 1. winget
Titel 'Pruefe den Windows-Paketmanager (winget)'
if (-not (Vorhanden 'winget')) {
  Fehler 'winget fehlt. Er ist Teil des "App-Installers" aus dem Microsoft Store.'
  Info 'Oeffne den Microsoft Store, suche "App-Installer", installiere oder aktualisiere ihn.'
  Info 'Danach dieses Skript noch einmal starten.'
  Start-Process 'ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1' -ErrorAction SilentlyContinue
  try { Stop-Transcript | Out-Null } catch {}
  return
}
Ok 'winget ist da'

# ================================================================ 2. Programme
Titel 'Installiere die Programme (das dauert beim ersten Mal 10 bis 20 Minuten)'
foreach ($w in $Werkzeuge) {
  if (Vorhanden $w.Befehl) {
    Ok ("{0,-16} schon da" -f $w.Name)
    continue
  }
  $zusatz = if ($w.Zusatz) { $w.Zusatz } else { @() }
  $erfolg = WingetInstall $w.Id $w.Name $zusatz
  if ($w.Befehl -eq 'claude' -and -not (Vorhanden 'claude')) {
    Info 'Versuche den offiziellen Installer von Claude ...'
    try { Invoke-RestMethod 'https://claude.ai/install.ps1' | Invoke-Expression } catch { Warnung "Claude-Installer: $($_.Exception.Message)" }
    PfadAuffrischen
  }
  if (Vorhanden $w.Befehl) { Ok ("{0,-16} installiert" -f $w.Name) }
  elseif ($erfolg) { Warnung "$($w.Name) ist installiert, aber erst nach einem Neustart von PowerShell sichtbar." }
  else { Fehler "$($w.Name) konnte nicht installiert werden. Wird fuer: $($w.Wofuer)" }
}

# ================================================================ 3. MiKTeX
Titel 'Richte LaTeX ein (fehlende Pakete automatisch nachladen)'
if (Vorhanden 'initexmf') {
  & initexmf --set-config-value '[MPM]AutoInstall=1' 2>$null | Out-Null
  & initexmf --user --set-config-value '[MPM]AutoInstall=1' 2>$null | Out-Null
  Ok 'Automatisches Nachladen von Paketen ist an'
  $pakete = @('koma-script', 'biblatex', 'biber', 'biblatex-chem', 'mhchem', 'chemfig', 'siunitx', 'fontspec', 'babel-german', 'csquotes', 'hyperref', 'booktabs', 'cleveref', 'lm', 'microtype', 'setspace')
  Info 'Lade die wichtigsten Pakete vorab (spart Wartezeit beim ersten PDF) ...'
  if (Vorhanden 'miktex') {
    & miktex packages update-package-database 2>$null | Out-Null
    foreach ($p in $pakete) { & miktex packages install $p 2>$null | Out-Null }
  } elseif (Vorhanden 'mpm') {
    foreach ($p in $pakete) { & mpm --install=$p 2>$null | Out-Null }
  }
  Ok 'LaTeX-Pakete vorbereitet'
} else {
  Warnung 'MiKTeX ist noch nicht im PATH. Nach einem Neustart erledigt /hilfe den Rest.'
}

# ================================================================ 4. Git
Titel 'Stelle Git auf dich ein'
if (Vorhanden 'git') {
  $gName = (& git config --global user.name) 2>$null
  $gMail = (& git config --global user.email) 2>$null
  if (-not $gName) {
    $gName = Frage 'Dein Vor- und Nachname (steht an jeder Sicherung)' ''
    if ($gName) { & git config --global user.name "$gName" }
  }
  if (-not $gMail) {
    $gMail = Frage 'Deine E-Mail-Adresse (dieselbe wie bei GitHub)' ''
    if ($gMail) { & git config --global user.email "$gMail" }
  }
  & git config --global init.defaultBranch main
  & git config --global core.autocrlf true
  & git config --global core.quotepath false
  Ok "Git kennt dich als: $gName <$gMail>"
} else {
  Fehler 'Git fehlt, bitte Skript nach einem Neustart von PowerShell noch einmal starten.'
}

# ================================================================ 5. VS Code Erweiterungen
Titel 'Installiere die VS-Code-Erweiterungen'
if (Vorhanden 'code') {
  $installiert = (& code --list-extensions 2>$null) -join "`n"
  foreach ($e in $Erweiterungen) {
    if ($installiert -match [regex]::Escape($e.Id)) { Ok "$($e.Name) schon da"; continue }
    & code --install-extension $e.Id --force 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { Ok "$($e.Name) installiert" } else { Warnung "$($e.Name) nicht installiert (spaeter in VS Code unter Erweiterungen)" }
  }
} else {
  Warnung 'VS Code ist noch nicht im PATH. Erweiterungen installiert VS Code beim Oeffnen des Ordners (Empfehlungen).'
}

# ================================================================ 6. Browser-Zugriff vorwaermen
Titel 'Bereite den Browser-Zugriff fuer Claude vor (Bibliothek, Verlage, Suche)'
if (Vorhanden 'npx') {
  & npx -y '@playwright/mcp@latest' --help 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { Ok 'Playwright ist bereit (nutzt Microsoft Edge)' } else { Warnung 'Playwright konnte nicht vorbereitet werden, Claude versucht es beim ersten Gebrauch erneut.' }
} else {
  Warnung 'Node.js ist noch nicht im PATH, Browser-Zugriff wird beim ersten Gebrauch vorbereitet.'
}

# ================================================================ 7. GitHub
Titel 'Melde dich bei GitHub an'
$ghOk = $false
if (Vorhanden 'gh') {
  & gh auth status 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Ok 'Schon angemeldet'
    $ghOk = $true
  } else {
    Info 'Noch kein GitHub-Konto? Lege es jetzt kostenlos an: https://github.com/signup'
    Info 'Gleich erscheint ein Code. Der Browser oeffnet sich: Code eingeben, "Authorize" klicken.'
    Read-Host '    Enter druecken, wenn du bereit bist' | Out-Null
    & gh auth login --web --git-protocol https --hostname github.com
    if ($LASTEXITCODE -eq 0) { $ghOk = $true; Ok 'Angemeldet' } else { Fehler 'Anmeldung hat nicht geklappt. Spaeter: gh auth login --web' }
  }
  if ($ghOk) { & gh auth setup-git 2>$null | Out-Null }
} else {
  Fehler 'GitHub CLI fehlt.'
}

# ================================================================ 8. Eigenes Repo
Titel 'Lege dein privates Arbeits-Repo an'
$ziel = $null
if ($ghOk -and (Vorhanden 'git')) {
  if (-not $RepoName) { $RepoName = Frage 'Name fuer dein Projekt (ohne Leerzeichen)' 'diplomarbeit' }
  $RepoName = ($RepoName -replace '[^A-Za-z0-9._-]', '-')

  if (-not $Zielordner) {
    $dokumente = [Environment]::GetFolderPath('MyDocuments')
    if ($dokumente -match 'OneDrive') {
      # OneDrive und Git vertragen sich schlecht (Dateisperren, doppelte Dateien)
      $basis = Join-Path $env:USERPROFILE 'Arbeiten'
      Info "Dein Dokumente-Ordner liegt in OneDrive. Das Projekt kommt deshalb nach $basis"
    } else {
      $basis = $dokumente
    }
    $Zielordner = Frage 'In welchem Ordner soll es liegen?' $basis
  }
  if (-not (Test-Path $Zielordner)) { New-Item -ItemType Directory -Path $Zielordner -Force | Out-Null }
  $ziel = Join-Path $Zielordner $RepoName

  if (Test-Path (Join-Path $ziel '.git')) {
    Ok "Projekt existiert schon: $ziel"
  } else {
    $konto = (& gh api user --jq .login) 2>$null
    & gh repo view "$konto/$RepoName" 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Info "Erzeuge privates Repo $konto/$RepoName aus der Vorlage ..."
      & gh repo create $RepoName --private --template $Vorlage --description 'Meine wissenschaftliche Arbeit' | Out-Host
    } else {
      Info "Repo $konto/$RepoName gibt es schon, hole es auf diesen Rechner ..."
    }
    # GitHub braucht nach dem Anlegen aus einer Vorlage ein paar Sekunden
    Push-Location $Zielordner
    for ($i = 1; $i -le 10; $i++) {
      & gh repo clone "$konto/$RepoName" $RepoName 2>$null | Out-Null
      if (Test-Path (Join-Path $ziel '.git')) { break }
      Start-Sleep -Seconds 3
    }
    Pop-Location
    if (Test-Path (Join-Path $ziel '.git')) {
      Ok "Projekt liegt in: $ziel"
      & git -C $ziel remote add vorlage "https://github.com/$Vorlage.git" 2>$null
    } else {
      Fehler 'Repo konnte nicht geklont werden. Spaeter: gh repo clone <konto>/<name>'
      $ziel = $null
    }
  }
} else {
  Warnung 'Ohne GitHub-Anmeldung kann das Repo nicht angelegt werden. Skript spaeter einfach erneut starten.'
}

# Protokoll ins Projekt kopieren (ist gitignored)
if ($ziel -and (Test-Path (Join-Path $ziel 'install'))) {
  try { Stop-Transcript | Out-Null } catch {}
  Copy-Item $LogDatei (Join-Path $ziel 'install\install.log') -Force -ErrorAction SilentlyContinue
}

# ================================================================ 9. Abschluss
Titel 'Fertig. So geht es weiter'
Write-Host ''
Write-Host '    1. VS Code oeffnet gleich deinen Projektordner.' -ForegroundColor White
Write-Host '       Frage "Vertrauen Sie den Autoren?" mit "Ja, ich vertraue den Autoren" beantworten.' -ForegroundColor Gray
Write-Host '       Frage "Automatische Aufgaben erlauben?" mit "Zulassen" beantworten (startet dein Dashboard).' -ForegroundColor Gray
Write-Host '    2. Rechts oben auf das Claude-Symbol (orangefarbener Stern) klicken.' -ForegroundColor White
Write-Host '       Mit deinem Claude-Konto anmelden (Pro-Abo).' -ForegroundColor Gray
Write-Host '       Frage nach dem Browser-Server "playwright": erlauben.' -ForegroundColor Gray
Write-Host '    3. In das Claude-Feld tippen:  /start' -ForegroundColor White
Write-Host '       Claude fuehrt dich ab da durch alles Weitere.' -ForegroundColor Gray
Write-Host ''
Write-Host '    Hilfe: /hilfe in Claude, oder docs\probleme.md im Projekt.' -ForegroundColor DarkGray
Write-Host ''

if ($ziel -and (Vorhanden 'code')) {
  & code $ziel
} elseif ($ziel) {
  Warnung "VS Code bitte selbst starten und den Ordner $ziel oeffnen (Datei > Ordner oeffnen)."
}

try { Stop-Transcript | Out-Null } catch {}
