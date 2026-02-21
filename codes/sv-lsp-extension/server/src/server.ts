import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  Hover,
  MarkupKind,
  DefinitionParams,
  ReferenceParams,
  HoverParams,
  DocumentSymbolParams,
  SymbolInformation,
  Location,
  Diagnostic,
  DiagnosticSeverity,
  CompletionParams,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  FileChangeType,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { SymbolTable } from './symbolTable';
import { SV_KEYWORDS, SV_TYPES } from './svLanguage';
import { SymbolKind as SVSymbolKind, stripComments } from './parser';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
const symbolTable = new SymbolTable();

let maxProblems = 100;
let workspaceRoot: string | null = null;

const SV_FILE_EXTENSIONS = new Set(['.sv', '.svh', '.svi', '.v', '.vh', '.vl']);

function fileToUri(filePath: string): string {
  const url = pathToFileURL(filePath);
  return url.href.replace(/^file:\/\/\/[A-Z]:/, m => m.toLowerCase());
}

connection.onInitialize((params: InitializeParams): InitializeResult => {
  if (params.workspaceFolders && params.workspaceFolders.length > 0) {
    try { workspaceRoot = fileURLToPath(params.workspaceFolders[0].uri); } catch {}
  } else if (params.rootUri) {
    try { workspaceRoot = fileURLToPath(params.rootUri); } catch {}
  }

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      definitionProvider: true,
      referencesProvider: true,
      hoverProvider: true,
      documentSymbolProvider: true,
      completionProvider: {
        triggerCharacters: ['.', ':', '`'],
        resolveProvider: false,
      },
    },
  };
});

connection.onInitialized(() => {
  connection.console.log('SystemVerilog LSP server initialized');

  if (workspaceRoot) {
    const count = indexWorkspace(workspaceRoot);
    connection.console.log(`Indexed ${count} SystemVerilog files from workspace`);
  }
});

// --- Workspace file scanning ---

function indexWorkspace(root: string): number {
  const filesToIndex: string[] = [];

  function walkDir(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'out') continue;
          walkDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (SV_FILE_EXTENSIONS.has(ext)) {
            filesToIndex.push(fullPath);
          }
        }
      }
    } catch {}
  }

  walkDir(root);

  for (const filePath of filesToIndex) {
    try {
      const text = fs.readFileSync(filePath, 'utf-8');
      const uri = fileToUri(filePath);
      symbolTable.updateDocument(uri, text);
    } catch {}
  }

  return filesToIndex.length;
}

// --- File watcher events ---

connection.onDidChangeWatchedFiles((params) => {
  for (const change of params.changes) {
    if (documents.get(change.uri)) continue;

    if (change.type === FileChangeType.Deleted) {
      symbolTable.removeDocument(change.uri);
    } else {
      try {
        const filePath = fileURLToPath(change.uri);
        const text = fs.readFileSync(filePath, 'utf-8');
        symbolTable.updateDocument(change.uri, text);
      } catch {}
    }
  }
});

// --- Document lifecycle ---

documents.onDidChangeContent((change) => {
  const doc = change.document;
  const index = symbolTable.updateDocument(doc.uri, doc.getText());

  // Publish basic diagnostics
  const diagnostics: Diagnostic[] = [];

  // Check for unclosed scopes by looking at scope keywords (in comment-stripped text
  // to avoid false positives from keywords inside comments or strings)
  const text = doc.getText();
  const cleanedText = stripComments(text, true);
  const openKeywords = ['module', 'class', 'function', 'task', 'interface', 'package', 'program'];
  const closeKeywords = ['endmodule', 'endclass', 'endfunction', 'endtask', 'endinterface', 'endpackage', 'endprogram'];

  for (let i = 0; i < openKeywords.length && diagnostics.length < maxProblems; i++) {
    const openRe = new RegExp('\\b' + openKeywords[i] + '\\b', 'g');
    const closeRe = new RegExp('\\b' + closeKeywords[i] + '\\b', 'g');
    const openCount = (cleanedText.match(openRe) || []).length;
    const closeCount = (cleanedText.match(closeRe) || []).length;

    if (openCount > closeCount) {
      const diff = openCount - closeCount;
      // Find the last unmatched open keyword
      const lines = text.split('\n');
      for (let lineIdx = lines.length - 1; lineIdx >= 0 && diagnostics.length < maxProblems; lineIdx--) {
        if (new RegExp('\\b' + openKeywords[i] + '\\b').test(lines[lineIdx])) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
              start: { line: lineIdx, character: 0 },
              end: { line: lineIdx, character: lines[lineIdx].length },
            },
            message: `Missing '${closeKeywords[i]}' for '${openKeywords[i]}'`,
            source: 'sv-lsp',
          });
          break;
        }
      }
    }
  }

  // --- Cross-file visibility diagnostics ---
  for (const sym of index.symbols) {
    if (diagnostics.length >= maxProblems) break;

    if (sym.kind === SVSymbolKind.Class && sym.extends) {
      const parentExists = symbolTable.findSymbolAnywhere(sym.extends);
      if (!parentExists) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: { line: sym.location.line, character: 0 },
            end: { line: sym.location.line, character: (doc.getText().split('\n')[sym.location.line] || '').length },
          },
          message: `Parent class '${sym.extends}' not found in workspace`,
          source: 'sv-lsp',
        });
      } else if (!symbolTable.isSymbolVisibleFrom(sym.extends, doc.uri)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Information,
          range: {
            start: { line: sym.location.line, character: 0 },
            end: { line: sym.location.line, character: (doc.getText().split('\n')[sym.location.line] || '').length },
          },
          message: `Class '${sym.extends}' exists but is not imported or included. Consider adding an import or \`include.`,
          source: 'sv-lsp',
        });
      }
    }
  }

  connection.sendDiagnostics({ uri: doc.uri, diagnostics });
});

documents.onDidClose((e) => {
  connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });

  // Re-index from disk so the file stays in the symbol table
  try {
    const filePath = fileURLToPath(e.document.uri);
    const text = fs.readFileSync(filePath, 'utf-8');
    symbolTable.updateDocument(e.document.uri, text);
  } catch {
    // File may have been deleted; keep whatever was indexed
  }
});

// --- Go to Definition ---

connection.onDefinition((params: DefinitionParams): Location | null => {
  return symbolTable.findDefinition(
    params.textDocument.uri,
    params.position.line,
    params.position.character,
  );
});

// --- Find All References ---

connection.onReferences((params: ReferenceParams): Location[] => {
  return symbolTable.findReferences(
    params.textDocument.uri,
    params.position.line,
    params.position.character,
    params.context.includeDeclaration,
  );
});

// --- Hover ---

connection.onHover((params: HoverParams): Hover | null => {
  const info = symbolTable.getHoverInfo(
    params.textDocument.uri,
    params.position.line,
    params.position.character,
  );

  if (!info) return null;

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: info,
    },
  };
});

// --- Document Symbols (Outline) ---

connection.onDocumentSymbol((params: DocumentSymbolParams): SymbolInformation[] => {
  return symbolTable.getDocumentSymbols(params.textDocument.uri);
});

// --- Completion ---

connection.onCompletion((params: CompletionParams): CompletionItem[] => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const lineNum = params.position.line;
  const charNum = params.position.character;
  const text = doc.getText();
  const lines = text.split('\n');
  const currentLine = lines[lineNum] || '';

  // --- Dot-completion: resolve variable type and offer class members ---
  const textBeforeCursor = currentLine.substring(0, charNum);
  const dotMatch = textBeforeCursor.match(/([a-zA-Z_][a-zA-Z0-9_$]*)\.\s*$/);
  if (dotMatch) {
    const objName = dotMatch[1];
    const varType = symbolTable.resolveVariableType(params.textDocument.uri, objName, lineNum);
    if (varType) {
      const members = symbolTable.getClassMembers(varType);
      return members.map(sym => ({
        label: sym.name,
        kind: mapCompletionKind(sym.kind),
        detail: sym.type,
        documentation: `${sym.kind} from ${sym.scope || 'global'}`,
      }));
    }
    return [];
  }

  // --- General completion: symbols, keywords, types ---
  const items: CompletionItem[] = [];
  const seen = new Set<string>();

  // Add symbols from the current document
  const index = symbolTable.getDocument(params.textDocument.uri);
  if (index) {
    for (const sym of index.symbols) {
      if (!seen.has(sym.name)) {
        seen.add(sym.name);
        items.push({
          label: sym.name,
          kind: mapCompletionKind(sym.kind),
          detail: sym.type,
          documentation: `${sym.kind} in ${sym.scope || 'global'}`,
        });
      }
    }
  }

  // Add symbols from all indexed files (cross-file completion)
  for (const docUri of symbolTable.getAllDocumentUris()) {
    if (docUri === params.textDocument.uri) continue;
    const crossDoc = symbolTable.getDocument(docUri);
    if (crossDoc) {
      for (const sym of crossDoc.symbols) {
        if (!seen.has(sym.name) &&
            (sym.kind === SVSymbolKind.Class || sym.kind === SVSymbolKind.Module ||
             sym.kind === SVSymbolKind.Interface || sym.kind === SVSymbolKind.Package ||
             sym.kind === SVSymbolKind.Typedef)) {
          seen.add(sym.name);
          items.push({
            label: sym.name,
            kind: mapCompletionKind(sym.kind),
            detail: sym.type,
            documentation: `${sym.kind} (cross-file)`,
          });
        }
      }
    }
  }

  // Add SV keywords
  for (const kw of SV_KEYWORDS) {
    if (!seen.has(kw)) {
      seen.add(kw);
      items.push({
        label: kw,
        kind: CompletionItemKind.Keyword,
      });
    }
  }

  // Add SV types
  for (const t of SV_TYPES) {
    if (!seen.has(t)) {
      seen.add(t);
      items.push({
        label: t,
        kind: CompletionItemKind.TypeParameter,
      });
    }
  }

  return items;
});

function mapCompletionKind(kind: SVSymbolKind): CompletionItemKind {
  switch (kind) {
    case SVSymbolKind.Module: return CompletionItemKind.Module;
    case SVSymbolKind.Class: return CompletionItemKind.Class;
    case SVSymbolKind.Function: return CompletionItemKind.Function;
    case SVSymbolKind.Task: return CompletionItemKind.Function;
    case SVSymbolKind.Variable: return CompletionItemKind.Variable;
    case SVSymbolKind.Port: return CompletionItemKind.Property;
    case SVSymbolKind.Parameter: return CompletionItemKind.Constant;
    case SVSymbolKind.Interface: return CompletionItemKind.Interface;
    case SVSymbolKind.Typedef: return CompletionItemKind.TypeParameter;
    case SVSymbolKind.Constraint: return CompletionItemKind.Snippet;
    default: return CompletionItemKind.Text;
  }
}

// --- Class Hierarchy ---

connection.onRequest('svLsp/classHierarchy', (params: { className: string }) => {
  return symbolTable.getClassHierarchy(params.className);
});

// --- Generate DO File ---

connection.onRequest('svLsp/generateDoFile', (params: { uri: string }) => {
  return symbolTable.getDependencyChain(params.uri);
});

// --- Configuration ---

connection.onDidChangeConfiguration((change) => {
  const settings = change.settings as { svLsp?: { maxNumberOfProblems?: number } } | undefined;
  maxProblems = settings?.svLsp?.maxNumberOfProblems ?? 100;

  // Re-validate all open documents
  documents.all().forEach((doc) => {
    symbolTable.updateDocument(doc.uri, doc.getText());
  });
});

documents.listen(connection);
connection.listen();
