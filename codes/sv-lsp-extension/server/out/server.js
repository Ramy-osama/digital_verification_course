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
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const symbolTable_1 = require("./symbolTable");
const svLanguage_1 = require("./svLanguage");
const parser_1 = require("./parser");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url_1 = require("url");
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
const symbolTable = new symbolTable_1.SymbolTable();
let maxProblems = 100;
let workspaceRoot = null;
const SV_FILE_EXTENSIONS = new Set(['.sv', '.svh', '.svi', '.v', '.vh', '.vl']);
function fileToUri(filePath) {
    const url = (0, url_1.pathToFileURL)(filePath);
    return url.href.replace(/^file:\/\/\/[A-Z]:/, m => m.toLowerCase());
}
connection.onInitialize((params) => {
    if (params.workspaceFolders && params.workspaceFolders.length > 0) {
        try {
            workspaceRoot = (0, url_1.fileURLToPath)(params.workspaceFolders[0].uri);
        }
        catch { }
    }
    else if (params.rootUri) {
        try {
            workspaceRoot = (0, url_1.fileURLToPath)(params.rootUri);
        }
        catch { }
    }
    return {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
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
function indexWorkspace(root) {
    const filesToIndex = [];
    function walkDir(dir) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'out')
                        continue;
                    walkDir(fullPath);
                }
                else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (SV_FILE_EXTENSIONS.has(ext)) {
                        filesToIndex.push(fullPath);
                    }
                }
            }
        }
        catch { }
    }
    walkDir(root);
    for (const filePath of filesToIndex) {
        try {
            const text = fs.readFileSync(filePath, 'utf-8');
            const uri = fileToUri(filePath);
            symbolTable.updateDocument(uri, text);
        }
        catch { }
    }
    return filesToIndex.length;
}
// --- File watcher events ---
connection.onDidChangeWatchedFiles((params) => {
    for (const change of params.changes) {
        if (documents.get(change.uri))
            continue;
        if (change.type === node_1.FileChangeType.Deleted) {
            symbolTable.removeDocument(change.uri);
        }
        else {
            try {
                const filePath = (0, url_1.fileURLToPath)(change.uri);
                const text = fs.readFileSync(filePath, 'utf-8');
                symbolTable.updateDocument(change.uri, text);
            }
            catch { }
        }
    }
});
// --- Document lifecycle ---
documents.onDidChangeContent((change) => {
    const doc = change.document;
    const index = symbolTable.updateDocument(doc.uri, doc.getText());
    // Publish basic diagnostics
    const diagnostics = [];
    // Check for unclosed scopes by looking at scope keywords (in comment-stripped text
    // to avoid false positives from keywords inside comments or strings)
    const text = doc.getText();
    const cleanedText = (0, parser_1.stripComments)(text, true);
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
                        severity: node_1.DiagnosticSeverity.Error,
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
        if (diagnostics.length >= maxProblems)
            break;
        if (sym.kind === parser_1.SymbolKind.Class && sym.extends) {
            const parentExists = symbolTable.findSymbolAnywhere(sym.extends);
            if (!parentExists) {
                diagnostics.push({
                    severity: node_1.DiagnosticSeverity.Warning,
                    range: {
                        start: { line: sym.location.line, character: 0 },
                        end: { line: sym.location.line, character: (doc.getText().split('\n')[sym.location.line] || '').length },
                    },
                    message: `Parent class '${sym.extends}' not found in workspace`,
                    source: 'sv-lsp',
                });
            }
            else if (!symbolTable.isSymbolVisibleFrom(sym.extends, doc.uri)) {
                diagnostics.push({
                    severity: node_1.DiagnosticSeverity.Information,
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
        const filePath = (0, url_1.fileURLToPath)(e.document.uri);
        const text = fs.readFileSync(filePath, 'utf-8');
        symbolTable.updateDocument(e.document.uri, text);
    }
    catch {
        // File may have been deleted; keep whatever was indexed
    }
});
// --- Go to Definition ---
connection.onDefinition((params) => {
    return symbolTable.findDefinition(params.textDocument.uri, params.position.line, params.position.character);
});
// --- Find All References ---
connection.onReferences((params) => {
    return symbolTable.findReferences(params.textDocument.uri, params.position.line, params.position.character, params.context.includeDeclaration);
});
// --- Hover ---
connection.onHover((params) => {
    const info = symbolTable.getHoverInfo(params.textDocument.uri, params.position.line, params.position.character);
    if (!info)
        return null;
    return {
        contents: {
            kind: node_1.MarkupKind.Markdown,
            value: info,
        },
    };
});
// --- Document Symbols (Outline) ---
connection.onDocumentSymbol((params) => {
    return symbolTable.getDocumentSymbols(params.textDocument.uri);
});
// --- Completion ---
connection.onCompletion((params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc)
        return [];
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
    const items = [];
    const seen = new Set();
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
        if (docUri === params.textDocument.uri)
            continue;
        const crossDoc = symbolTable.getDocument(docUri);
        if (crossDoc) {
            for (const sym of crossDoc.symbols) {
                if (!seen.has(sym.name) &&
                    (sym.kind === parser_1.SymbolKind.Class || sym.kind === parser_1.SymbolKind.Module ||
                        sym.kind === parser_1.SymbolKind.Interface || sym.kind === parser_1.SymbolKind.Package ||
                        sym.kind === parser_1.SymbolKind.Typedef)) {
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
    for (const kw of svLanguage_1.SV_KEYWORDS) {
        if (!seen.has(kw)) {
            seen.add(kw);
            items.push({
                label: kw,
                kind: node_1.CompletionItemKind.Keyword,
            });
        }
    }
    // Add SV types
    for (const t of svLanguage_1.SV_TYPES) {
        if (!seen.has(t)) {
            seen.add(t);
            items.push({
                label: t,
                kind: node_1.CompletionItemKind.TypeParameter,
            });
        }
    }
    return items;
});
function mapCompletionKind(kind) {
    switch (kind) {
        case parser_1.SymbolKind.Module: return node_1.CompletionItemKind.Module;
        case parser_1.SymbolKind.Class: return node_1.CompletionItemKind.Class;
        case parser_1.SymbolKind.Function: return node_1.CompletionItemKind.Function;
        case parser_1.SymbolKind.Task: return node_1.CompletionItemKind.Function;
        case parser_1.SymbolKind.Variable: return node_1.CompletionItemKind.Variable;
        case parser_1.SymbolKind.Port: return node_1.CompletionItemKind.Property;
        case parser_1.SymbolKind.Parameter: return node_1.CompletionItemKind.Constant;
        case parser_1.SymbolKind.Interface: return node_1.CompletionItemKind.Interface;
        case parser_1.SymbolKind.Typedef: return node_1.CompletionItemKind.TypeParameter;
        case parser_1.SymbolKind.Constraint: return node_1.CompletionItemKind.Snippet;
        default: return node_1.CompletionItemKind.Text;
    }
}
// --- Class Hierarchy ---
connection.onRequest('svLsp/classHierarchy', (params) => {
    return symbolTable.getClassHierarchy(params.className);
});
// --- Generate DO File ---
connection.onRequest('svLsp/generateDoFile', (params) => {
    return symbolTable.getDependencyChain(params.uri);
});
// --- Configuration ---
connection.onDidChangeConfiguration((change) => {
    const settings = change.settings;
    maxProblems = settings?.svLsp?.maxNumberOfProblems ?? 100;
    // Re-validate all open documents
    documents.all().forEach((doc) => {
        symbolTable.updateDocument(doc.uri, doc.getText());
    });
});
documents.listen(connection);
connection.listen();
//# sourceMappingURL=server.js.map