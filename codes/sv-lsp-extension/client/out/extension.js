"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const vscode_1 = require("vscode");
const node_1 = require("vscode-languageclient/node");
const highlighter_1 = require("./highlighter");
let client;
let hierarchyPanel;
let presentationPanel;
function activate(context) {
    const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
    const serverOptions = {
        run: {
            module: serverModule,
            transport: node_1.TransportKind.ipc,
        },
        debug: {
            module: serverModule,
            transport: node_1.TransportKind.ipc,
            options: {
                execArgv: ['--nolazy', '--inspect=6009'],
            },
        },
    };
    const clientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'systemverilog' },
            { scheme: 'file', language: 'verilog' },
        ],
        synchronize: {
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/*.{sv,svh,svi,v,vh,vl}'),
        },
    };
    client = new node_1.LanguageClient('svLsp', 'SystemVerilog Language Server', serverOptions, clientOptions);
    client.start();
    const hierarchyCmd = vscode_1.commands.registerCommand('svLsp.showClassHierarchy', async () => {
        const editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            vscode_1.window.showWarningMessage('No active editor');
            return;
        }
        const position = editor.selection.active;
        const wordRange = editor.document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_$]*/);
        if (!wordRange) {
            vscode_1.window.showWarningMessage('Place your cursor on a class name');
            return;
        }
        const className = editor.document.getText(wordRange);
        if (!client.isRunning()) {
            vscode_1.window.showWarningMessage('Language server is not running yet. Please wait a moment.');
            return;
        }
        const hierarchy = await client.sendRequest('svLsp/classHierarchy', { className });
        if (!hierarchy) {
            vscode_1.window.showInformationMessage(`No class hierarchy found for "${className}"`);
            return;
        }
        showHierarchyPanel(hierarchy, context);
    });
    context.subscriptions.push(hierarchyCmd);
    const doFileCmd = vscode_1.commands.registerCommand('svLsp.generateDoFile', async () => {
        const editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            vscode_1.window.showWarningMessage('No active editor');
            return;
        }
        if (!client.isRunning()) {
            vscode_1.window.showWarningMessage('Language server is not running yet. Please wait a moment.');
            return;
        }
        const fileUri = editor.document.uri.toString();
        const result = await client.sendRequest('svLsp/generateDoFile', { uri: fileUri });
        if (!result || result.files.length === 0) {
            vscode_1.window.showWarningMessage('Could not determine dependencies for this file.');
            return;
        }
        const doContent = formatDoFile(result, editor.document.uri);
        const currentDir = path.dirname(editor.document.uri.fsPath);
        const defaultUri = vscode_1.Uri.file(path.join(currentDir, 'sim.do'));
        const saveUri = await vscode_1.window.showSaveDialog({
            defaultUri,
            filters: { 'DO files': ['do'], 'All files': ['*'] },
            title: 'Save DO File',
        });
        if (saveUri) {
            fs.writeFileSync(saveUri.fsPath, doContent, 'utf-8');
            vscode_1.window.showInformationMessage(`DO file saved to ${saveUri.fsPath}`);
            const doc = await vscode_1.workspace.openTextDocument(saveUri);
            await vscode_1.window.showTextDocument(doc);
        }
    });
    context.subscriptions.push(doFileCmd);
    const copyPresCmd = vscode_1.commands.registerCommand('svLsp.copyForPresentation', () => {
        const editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            vscode_1.window.showWarningMessage('No active editor');
            return;
        }
        const selection = editor.selection;
        const code = selection.isEmpty
            ? editor.document.getText()
            : editor.document.getText(selection);
        if (!code.trim()) {
            vscode_1.window.showWarningMessage('No code to copy');
            return;
        }
        const config = vscode_1.workspace.getConfiguration('svLsp');
        const fontFamily = config.get('presentation.fontFamily', "Consolas, 'Courier New', monospace");
        const fontSize = config.get('presentation.fontSize', 14);
        const theme = config.get('presentation.theme', 'dark');
        showPresentationPanel(code, fontFamily, fontSize, theme);
    });
    context.subscriptions.push(copyPresCmd);
    let questaTerminal;
    const runQuestaCmd = vscode_1.commands.registerCommand('svLsp.runQuestaSim', async () => {
        const editor = vscode_1.window.activeTextEditor;
        const defaultDir = editor
            ? vscode_1.Uri.file(path.dirname(editor.document.uri.fsPath))
            : vscode_1.workspace.workspaceFolders?.[0]?.uri;
        const doFileUris = await vscode_1.window.showOpenDialog({
            canSelectMany: false,
            defaultUri: defaultDir,
            filters: { 'DO files': ['do'], 'All files': ['*'] },
            title: 'Select a DO file to run in QuestaSim',
        });
        if (!doFileUris || doFileUris.length === 0) {
            return;
        }
        const doFilePath = doFileUris[0].fsPath;
        const doFileDir = path.dirname(doFilePath);
        const doFileName = path.basename(doFilePath);
        const config = vscode_1.workspace.getConfiguration('svLsp');
        const vsimPath = config.get('questaSimPath', 'vsim');
        if (questaTerminal && questaTerminal.exitStatus === undefined) {
            questaTerminal.dispose();
        }
        const shellPath = getDefaultShellPath();
        const isPowerShell = /pwsh|powershell/i.test(shellPath);
        questaTerminal = vscode_1.window.createTerminal({ name: 'QuestaSim', cwd: doFileDir });
        questaTerminal.show();
        const cmd = isPowerShell
            ? `& "${vsimPath}" -do "${doFileName}"`
            : `"${vsimPath}" -do "${doFileName}"`;
        questaTerminal.sendText(cmd);
    });
    context.subscriptions.push(runQuestaCmd);
}
function getDefaultShellPath() {
    const platformKey = process.platform === 'win32' ? 'windows' :
        process.platform === 'darwin' ? 'osx' : 'linux';
    const profiles = vscode_1.workspace.getConfiguration('terminal.integrated.profiles').get(platformKey);
    const defaultName = vscode_1.workspace.getConfiguration('terminal.integrated').get(`defaultProfile.${platformKey}`);
    if (defaultName && profiles && profiles[defaultName]?.path) {
        return profiles[defaultName].path;
    }
    if (process.platform === 'win32') {
        return 'powershell.exe';
    }
    return vscode_1.env.shell || '/bin/bash';
}
function showPresentationPanel(code, fontFamily, fontSize, theme) {
    const tokens = (0, highlighter_1.tokenize)(code);
    if (presentationPanel) {
        presentationPanel.reveal(vscode_1.ViewColumn.Beside);
    }
    else {
        presentationPanel = vscode_1.window.createWebviewPanel('svCodePresentation', 'SV Code Preview', vscode_1.ViewColumn.Beside, { enableScripts: true });
        presentationPanel.onDidDispose(() => {
            presentationPanel = undefined;
        });
    }
    presentationPanel.webview.onDidReceiveMessage((message) => {
        if (message.command === 'copied') {
            vscode_1.window.showInformationMessage('Code copied with syntax highlighting! Paste into PowerPoint.');
        }
    });
    const darkHtml = (0, highlighter_1.toHtml)(tokens, 'dark', fontFamily, fontSize);
    const lightHtml = (0, highlighter_1.toHtml)(tokens, 'light', fontFamily, fontSize);
    const initialTheme = theme;
    presentationPanel.webview.html = buildPresentationHtml(darkHtml, lightHtml, initialTheme, fontSize, code);
}
function buildPresentationHtml(darkHtml, lightHtml, initialTheme, fontSize, _plainCode) {
    const darkB64 = Buffer.from(darkHtml, 'utf-8').toString('base64');
    const lightB64 = Buffer.from(lightHtml, 'utf-8').toString('base64');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--vscode-editor-background, #1e1e1e);
    color: var(--vscode-editor-foreground, #d4d4d4);
    padding: 20px;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--vscode-sideBar-background, #252526);
    border: 1px solid var(--vscode-panel-border, #444);
    border-radius: 8px 8px 0 0;
    flex-wrap: wrap;
  }
  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .toolbar label {
    font-size: 12px;
    color: var(--vscode-descriptionForeground, #999);
    white-space: nowrap;
  }
  .btn {
    padding: 6px 14px;
    border: 1px solid var(--vscode-button-border, #555);
    border-radius: 4px;
    background: var(--vscode-button-secondaryBackground, #3a3d41);
    color: var(--vscode-button-secondaryForeground, #ccc);
    cursor: pointer;
    font-size: 12px;
    transition: background 0.15s;
  }
  .btn:hover {
    background: var(--vscode-button-secondaryHoverBackground, #505050);
  }
  .btn.active {
    background: var(--vscode-button-background, #0e639c);
    color: var(--vscode-button-foreground, #fff);
    border-color: var(--vscode-button-background, #0e639c);
  }
  .btn-copy {
    padding: 8px 20px;
    background: var(--vscode-button-background, #0e639c);
    color: var(--vscode-button-foreground, #fff);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.15s;
    margin-left: auto;
  }
  .btn-copy:hover {
    background: var(--vscode-button-hoverBackground, #1177bb);
  }
  .btn-copy.success {
    background: #28a745;
  }
  .font-size-display {
    font-size: 12px;
    min-width: 30px;
    text-align: center;
    color: var(--vscode-editor-foreground, #d4d4d4);
  }
  .code-container {
    border: 1px solid var(--vscode-panel-border, #444);
    border-top: none;
    border-radius: 0 0 8px 8px;
    overflow: auto;
    max-height: 75vh;
  }
  .code-container pre {
    margin: 0 !important;
    border-radius: 0 0 8px 8px !important;
  }
  .hint {
    margin-top: 12px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #888);
    text-align: center;
  }
</style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-group">
      <label>Theme:</label>
      <button class="btn ${initialTheme === 'dark' ? 'active' : ''}" id="btn-dark">Dark</button>
      <button class="btn ${initialTheme === 'light' ? 'active' : ''}" id="btn-light">Light</button>
    </div>
    <div class="toolbar-group">
      <label>Font size:</label>
      <button class="btn" id="btn-font-down">-</button>
      <span class="font-size-display" id="font-size">${fontSize}</span>
      <button class="btn" id="btn-font-up">+</button>
    </div>
    <button class="btn-copy" id="btn-copy">Copy to Clipboard</button>
  </div>
  <div class="code-container" id="code-container"></div>
  <div class="hint">Click "Copy to Clipboard" then paste into PowerPoint (Ctrl+V)</div>

  <script>
    (function() {
      var vscode = acquireVsCodeApi();

      function b64decode(b64) {
        var binStr = atob(b64);
        var bytes = new Uint8Array(binStr.length);
        for (var i = 0; i < binStr.length; i++) {
          bytes[i] = binStr.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
      }

      var darkHtml = b64decode('${darkB64}');
      var lightHtml = b64decode('${lightB64}');
      var currentTheme = '${initialTheme}';
      var currentFontSize = ${fontSize};

      function updatePreview() {
        var container = document.getElementById('code-container');
        var html = currentTheme === 'dark' ? darkHtml : lightHtml;
        container.innerHTML = html;
        var pre = container.querySelector('pre');
        if (pre) {
          pre.style.fontSize = currentFontSize + 'px';
        }
      }

      document.getElementById('btn-dark').addEventListener('click', function() {
        currentTheme = 'dark';
        this.classList.add('active');
        document.getElementById('btn-light').classList.remove('active');
        updatePreview();
      });

      document.getElementById('btn-light').addEventListener('click', function() {
        currentTheme = 'light';
        this.classList.add('active');
        document.getElementById('btn-dark').classList.remove('active');
        updatePreview();
      });

      document.getElementById('btn-font-down').addEventListener('click', function() {
        currentFontSize = Math.max(8, currentFontSize - 1);
        document.getElementById('font-size').textContent = currentFontSize;
        updatePreview();
      });

      document.getElementById('btn-font-up').addEventListener('click', function() {
        currentFontSize = Math.min(40, currentFontSize + 1);
        document.getElementById('font-size').textContent = currentFontSize;
        updatePreview();
      });

      document.getElementById('btn-copy').addEventListener('click', function() {
        var container = document.getElementById('code-container');
        var html = container.innerHTML;
        var plain = container.innerText || container.textContent || '';

        var htmlBlob = new Blob([html], {type: 'text/html'});
        var textBlob = new Blob([plain], {type: 'text/plain'});

        navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob
          })
        ]).then(function() {
          var btn = document.getElementById('btn-copy');
          btn.textContent = 'Copied!';
          btn.classList.add('success');
          setTimeout(function() {
            btn.textContent = 'Copy to Clipboard';
            btn.classList.remove('success');
          }, 2000);
          vscode.postMessage({ command: 'copied' });
        }).catch(function() {
          var range = document.createRange();
          range.selectNodeContents(container);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('copy');
          sel.removeAllRanges();
          var btn = document.getElementById('btn-copy');
          btn.textContent = 'Copied!';
          btn.classList.add('success');
          setTimeout(function() {
            btn.textContent = 'Copy to Clipboard';
            btn.classList.remove('success');
          }, 2000);
          vscode.postMessage({ command: 'copied' });
        });
      });

      updatePreview();
    })();
  </script>
</body>
</html>`;
}
function showHierarchyPanel(root, context) {
    if (hierarchyPanel) {
        hierarchyPanel.reveal(vscode_1.ViewColumn.Beside);
    }
    else {
        hierarchyPanel = vscode_1.window.createWebviewPanel('svClassHierarchy', 'SV Class Hierarchy', vscode_1.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        hierarchyPanel.onDidDispose(() => {
            hierarchyPanel = undefined;
        });
    }
    hierarchyPanel.title = `Class Hierarchy: ${root.name}`;
    hierarchyPanel.webview.html = buildHierarchyHtml(root);
    hierarchyPanel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === 'openFile' && message.uri && message.line >= 0) {
            const fileUri = vscode_1.Uri.parse(message.uri);
            const doc = await vscode_1.workspace.openTextDocument(fileUri);
            const editor = await vscode_1.window.showTextDocument(doc, vscode_1.ViewColumn.One);
            const pos = new vscode_1.Position(message.line, 0);
            editor.selection = new vscode_1.Selection(pos, pos);
            editor.revealRange(new vscode_1.Range(pos, pos));
        }
    });
}
function buildHierarchyHtml(root) {
    const treeHtml = renderNode(root, true);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    background: var(--vscode-editor-background, #1e1e1e);
    color: var(--vscode-editor-foreground, #d4d4d4);
    padding: 24px;
    display: flex;
    justify-content: center;
    min-height: 100vh;
  }

  .tree-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 16px;
  }

  .tree-container ul {
    display: flex;
    justify-content: center;
    padding-top: 28px;
    position: relative;
    list-style: none;
  }

  .tree-container li {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    padding: 0 12px;
  }

  /* Vertical line down from parent */
  .tree-container li::before {
    content: '';
    position: absolute;
    top: 0;
    width: 2px;
    height: 28px;
    background: var(--vscode-textLink-foreground, #3794ff);
    left: 50%;
    transform: translateX(-50%);
  }

  /* Horizontal connector between siblings */
  .tree-container li::after {
    content: '';
    position: absolute;
    top: 0;
    height: 2px;
    background: var(--vscode-textLink-foreground, #3794ff);
  }

  /* For first child, connector goes from center to right */
  .tree-container ul > li:first-child::after {
    left: 50%;
    width: 50%;
  }

  /* For last child, connector goes from left to center */
  .tree-container ul > li:last-child::after {
    left: 0;
    width: 50%;
  }

  /* For middle children, connector spans full width */
  .tree-container ul > li:not(:first-child):not(:last-child)::after {
    left: 0;
    width: 100%;
  }

  /* Only child -- no horizontal connector */
  .tree-container ul > li:only-child::after {
    display: none;
  }

  /* Root node has no top connector */
  .tree-container > .node-box + ul > li::before,
  .root-item::before {
    display: none;
  }
  .root-item::after {
    display: none;
  }

  .node-box {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 18px;
    border: 2px solid var(--vscode-textLink-foreground, #3794ff);
    border-radius: 8px;
    background: var(--vscode-editor-background, #1e1e1e);
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 120px;
    z-index: 1;
  }

  .node-box:hover {
    background: var(--vscode-list-hoverBackground, #2a2d2e);
    border-color: var(--vscode-focusBorder, #007fd4);
    transform: scale(1.05);
  }

  .node-box.external {
    border-style: dashed;
    opacity: 0.7;
    cursor: default;
  }
  .node-box.external:hover {
    transform: none;
  }

  .node-box.highlight {
    border-color: #e8a317;
    box-shadow: 0 0 12px rgba(232, 163, 23, 0.3);
  }

  .class-name {
    font-weight: bold;
    font-size: 14px;
    color: var(--vscode-symbolIcon-classForeground, #ee9d28);
  }

  .class-location {
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #8a8a8a);
    margin-top: 3px;
  }

  .legend {
    margin-top: 32px;
    padding: 12px 16px;
    border: 1px solid var(--vscode-panel-border, #444);
    border-radius: 6px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground, #8a8a8a);
    text-align: center;
  }

  .legend-item {
    display: inline-flex;
    align-items: center;
    margin: 0 12px;
  }

  .legend-swatch {
    width: 20px;
    height: 14px;
    border: 2px solid var(--vscode-textLink-foreground, #3794ff);
    border-radius: 3px;
    margin-right: 6px;
    display: inline-block;
  }
  .legend-swatch.dashed {
    border-style: dashed;
    opacity: 0.7;
  }
  .legend-swatch.highlighted {
    border-color: #e8a317;
    box-shadow: 0 0 6px rgba(232, 163, 23, 0.3);
  }

  h2 {
    text-align: center;
    margin-bottom: 8px;
    color: var(--vscode-editor-foreground, #d4d4d4);
    font-size: 18px;
  }
  .subtitle {
    text-align: center;
    color: var(--vscode-descriptionForeground, #8a8a8a);
    font-size: 12px;
    margin-bottom: 16px;
  }
</style>
</head>
<body>
  <div class="tree-container">
    <h2>Class Inheritance Hierarchy</h2>
    <div class="subtitle">Click on a class to jump to its definition</div>
    ${treeHtml}
    <div class="legend">
      <span class="legend-item"><span class="legend-swatch"></span> Indexed class</span>
      <span class="legend-item"><span class="legend-swatch dashed"></span> External / not indexed</span>
      <span class="legend-item"><span class="legend-swatch highlighted"></span> Selected class</span>
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    document.querySelectorAll('.node-box[data-uri]').forEach(el => {
      el.addEventListener('click', () => {
        const uri = el.getAttribute('data-uri');
        const line = parseInt(el.getAttribute('data-line') || '-1', 10);
        if (uri && line >= 0) {
          vscode.postMessage({ command: 'openFile', uri, line });
        }
      });
    });
  </script>
</body>
</html>`;
}
function renderNode(node, isRoot) {
    const isExternal = !node.uri || node.line < 0;
    const externalClass = isExternal ? ' external' : '';
    const dataAttrs = isExternal ? '' : ` data-uri="${escapeHtml(node.uri)}" data-line="${node.line}"`;
    const locationText = isExternal ? '(external)' : `line ${node.line + 1}`;
    const rootItemClass = isRoot ? ' root-item' : '';
    let html = `<li class="${rootItemClass.trim()}">`;
    html += `<div class="node-box${externalClass}"${dataAttrs}>`;
    html += `<span class="class-name">${escapeHtml(node.name)}</span>`;
    html += `<span class="class-location">${locationText}</span>`;
    html += `</div>`;
    if (node.children.length > 0) {
        html += `<ul>`;
        for (const child of node.children) {
            html += renderNode(child, false);
        }
        html += `</ul>`;
    }
    html += `</li>`;
    return html;
}
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function toSimPath(fsPath) {
    if (process.platform === 'win32') {
        return fsPath.replace(/\\/g, '/');
    }
    return fsPath;
}
function formatDoFile(result, sourceUri) {
    const fileName = path.basename(sourceUri.fsPath);
    const lines = [];
    lines.push(`# Auto-generated DO file for: ${fileName}`);
    lines.push('# Generated by SV LSP Extension');
    lines.push('');
    lines.push('# Create work library');
    lines.push('vlib work');
    lines.push('');
    const incDirPaths = new Set();
    for (const dirUri of result.includeDirs) {
        const parsed = vscode_1.Uri.parse(dirUri);
        incDirPaths.add(toSimPath(parsed.fsPath));
    }
    const incDirArgs = Array.from(incDirPaths).map(p => `"+incdir+${p}"`);
    const incDirStr = incDirArgs.length > 0 ? ' ' + incDirArgs.join(' ') : '';
    lines.push('# Compile source files (dependency order)');
    for (const file of result.files) {
        const parsed = vscode_1.Uri.parse(file.uri);
        const filePath = toSimPath(parsed.fsPath);
        lines.push(`vlog -sv${incDirStr} "${filePath}"`);
    }
    lines.push('');
    lines.push('# Simulate');
    lines.push(`vsim -voptargs=+acc work.${result.topModule}`);
    lines.push('');
    lines.push('# Run simulation');
    lines.push('run -all');
    lines.push('');
    lines.push('# Quit');
    lines.push('quit -sim');
    lines.push('');
    return lines.join('\n');
}
function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
//# sourceMappingURL=extension.js.map