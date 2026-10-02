#!/usr/bin/env node
// Startet den Playwright-MCP-Server plattformneutral.
// Warum ein Wrapper: npx ist unter Windows eine .cmd-Datei und braucht eine Shell,
// außerdem wählt er den Browser, der auf dem Rechner sicher vorhanden ist, und legt das
// Browserprofil außerhalb des Repos ab, damit Uni-Logins nie nach GitHub gelangen.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir, tmpdir, platform } from 'node:os';
import { join } from 'node:path';

const istWindows = platform() === 'win32';
const profil = join(homedir(), '.scientific-writing', 'browser-profil');
const ausgabe = join(tmpdir(), 'scientific-writing-playwright');
mkdirSync(profil, { recursive: true });
mkdirSync(ausgabe, { recursive: true });

function browserWaehlen() {
  if (process.env.SW_BROWSER) return process.env.SW_BROWSER;
  if (istWindows) return 'msedge';
  if (platform() === 'darwin') {
    if (existsSync('/Applications/Google Chrome.app')) return 'chrome';
    if (existsSync('/Applications/Microsoft Edge.app')) return 'msedge';
    return 'chromium';
  }
  if (existsSync('/usr/bin/google-chrome') || existsSync('/opt/google/chrome/chrome')) return 'chrome';
  return 'chromium';
}

const args = [
  '-y', '@playwright/mcp@latest',
  '--browser', browserWaehlen(),
  '--user-data-dir', profil,
  '--output-dir', ausgabe,
  '--viewport-size', '1400,900',
];

// Mit shell:true müssen Argumente mit Leerzeichen (Benutzername!) gequotet werden.
const quote = (a) => (istWindows && /[\s&()]/.test(a) ? `"${a}"` : a);
const kind = spawn(istWindows ? 'npx.cmd' : 'npx', istWindows ? args.map(quote) : args, {
  stdio: 'inherit',
  shell: istWindows,
  env: process.env,
});

kind.on('error', (err) => {
  process.stderr.write(`Playwright-MCP konnte nicht starten: ${err.message}\n` +
    'Ist Node.js installiert? Prüfe mit /hilfe.\n');
  process.exit(1);
});
kind.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => kind.kill(sig));
