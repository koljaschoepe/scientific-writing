// Welcher Editor öffnet Links aus Dashboard und Chat: VS Code oder Cursor (beide mit der Claude-Code-Erweiterung).
// Einstellung technik.editor in .arbeit/einstellungen.md: automatisch (Standard), vscode oder cursor.
// Automatisch: CURSOR_CLI oder CURSOR_AGENT gesetzt → Cursor; sonst enthält VSCODE_GIT_ASKPASS_NODE,
// __CFBundleIdentifier oder VSCODE_IPC_HOOK_CLI „cursor“ → Cursor; sonst VS Code.
//
// Exporte: EDITOREN, normEditor(wert), erkenneEditor(env?), editorLage(einstellung, env?)
//   editorLage → { editor: 'vscode'|'cursor', editor_name, vscode: '<schema>://file', claude_uri, editor_quelle, editor_einstellung }

export const EDITOREN = {
  vscode: { name: 'VS Code', schema: 'vscode' },
  cursor: { name: 'Cursor', schema: 'cursor' },
};
export const EDITOR_WERTE = ['automatisch', 'vscode', 'cursor'];

export function normEditor(wert) {
  const t = String(wert ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (!t || ['automatisch', 'auto', 'standard'].includes(t)) return 'automatisch';
  if (['vscode', 'code', 'visualstudiocode', 'vscodium'].includes(t)) return 'vscode';
  if (t === 'cursor') return 'cursor';
  return null;
}

// { editor, sicher }: sicher = es gab ein Zeichen (Cursor-Variable oder VS-Code-Umgebung)
export function erkenneEditor(env = process.env) {
  if (env.CURSOR_CLI || env.CURSOR_AGENT) return { editor: 'cursor', sicher: true };
  const spuren = [env.VSCODE_GIT_ASKPASS_NODE, env.__CFBundleIdentifier, env.VSCODE_IPC_HOOK_CLI].filter(Boolean).map(String);
  if (spuren.some((x) => /cursor/i.test(x))) return { editor: 'cursor', sicher: true };
  if (spuren.length || env.TERM_PROGRAM === 'vscode' || env.VSCODE_PID) return { editor: 'vscode', sicher: true };
  return { editor: 'vscode', sicher: false };
}

export function editorLage(einstellung, env = process.env) {
  const gewuenscht = normEditor(einstellung) || 'automatisch';
  let editor, quelle;
  if (gewuenscht !== 'automatisch') { editor = gewuenscht; quelle = 'einstellung'; }
  else { const e = erkenneEditor(env); editor = e.editor; quelle = e.sicher ? 'erkannt' : 'standard'; }
  const { name, schema } = EDITOREN[editor];
  return {
    editor, editor_name: name, editor_quelle: quelle, editor_einstellung: gewuenscht,
    vscode: `${schema}://file`, claude_uri: `${schema}://anthropic.claude-code/open?prompt=`,
  };
}
