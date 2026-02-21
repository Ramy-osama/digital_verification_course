"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymbolTable = void 0;
const parser_1 = require("./parser");
const vscode_languageserver_1 = require("vscode-languageserver");
const svLanguage_1 = require("./svLanguage");
class SymbolTable {
    constructor() {
        this.documents = new Map();
    }
    updateDocument(uri, text) {
        const result = (0, parser_1.parseDocument)(text);
        const lines = text.split('\n');
        const index = {
            uri,
            symbols: result.symbols,
            references: result.references,
            imports: result.imports,
            includes: result.includes,
            text,
            lines,
        };
        this.documents.set(uri, index);
        return index;
    }
    removeDocument(uri) {
        this.documents.delete(uri);
    }
    getDocument(uri) {
        return this.documents.get(uri);
    }
    /**
     * Find the definition of a symbol at the given position.
     * Returns the location of the declaration.
     */
    findDefinition(uri, line, character) {
        const doc = this.documents.get(uri);
        if (!doc)
            return null;
        const word = (0, parser_1.getWordAtPosition)(doc.lines[line] || '', character);
        if (!word)
            return null;
        const lineText = doc.lines[line] || '';
        // Check for dot-access pattern (obj.member): resolve the object type and
        // look up the member inside the class/struct scope
        const dotCtx = (0, parser_1.getDotContext)(lineText, character);
        if (dotCtx) {
            const varType = this.resolveVariableType(uri, dotCtx.objName, line);
            if (varType) {
                const members = this.getClassMembers(varType);
                const member = members.find(m => m.name === word);
                if (member) {
                    const memberUri = this.findSymbolUri(member);
                    return {
                        uri: memberUri || uri,
                        range: {
                            start: { line: member.location.line, character: member.location.character },
                            end: { line: member.location.line, character: member.location.character + member.name.length },
                        },
                    };
                }
            }
        }
        // Search in the same document first
        const symbol = this.findSymbolByName(uri, word, line);
        if (symbol) {
            return {
                uri,
                range: {
                    start: { line: symbol.location.line, character: symbol.location.character },
                    end: { line: symbol.location.line, character: symbol.location.character + symbol.name.length },
                },
            };
        }
        // Search across all documents for module/class/package/interface/struct definitions
        for (const [docUri, docIndex] of this.documents) {
            if (docUri === uri)
                continue;
            const found = docIndex.symbols.find(s => s.name === word && (s.kind === parser_1.SymbolKind.Module ||
                s.kind === parser_1.SymbolKind.Class ||
                s.kind === parser_1.SymbolKind.Interface ||
                s.kind === parser_1.SymbolKind.Package ||
                s.kind === parser_1.SymbolKind.Struct));
            if (found) {
                return {
                    uri: docUri,
                    range: {
                        start: { line: found.location.line, character: found.location.character },
                        end: { line: found.location.line, character: found.location.character + found.name.length },
                    },
                };
            }
        }
        return null;
    }
    /**
     * Find all references to a symbol at the given position.
     */
    findReferences(uri, line, character, includeDeclaration) {
        const doc = this.documents.get(uri);
        if (!doc)
            return [];
        const word = (0, parser_1.getWordAtPosition)(doc.lines[line] || '', character);
        if (!word)
            return [];
        const locations = [];
        // Include declaration if requested
        if (includeDeclaration) {
            const symbol = this.findSymbolByName(uri, word, line);
            if (symbol) {
                locations.push({
                    uri,
                    range: {
                        start: { line: symbol.location.line, character: symbol.location.character },
                        end: { line: symbol.location.line, character: symbol.location.character + symbol.name.length },
                    },
                });
            }
        }
        // Find all references in all documents
        for (const [docUri, docIndex] of this.documents) {
            for (const ref of docIndex.references) {
                if (ref.name === word) {
                    // Avoid duplicating the declaration location
                    const isDuplicate = locations.some(loc => loc.uri === docUri && loc.range.start.line === ref.location.line && loc.range.start.character === ref.location.character);
                    if (!isDuplicate) {
                        locations.push({
                            uri: docUri,
                            range: {
                                start: { line: ref.location.line, character: ref.location.character },
                                end: { line: ref.location.line, character: ref.location.character + ref.name.length },
                            },
                        });
                    }
                }
            }
        }
        return locations;
    }
    /**
     * Get hover information for a symbol at the given position.
     */
    getHoverInfo(uri, line, character) {
        const doc = this.documents.get(uri);
        if (!doc)
            return null;
        const lineText = doc.lines[line] || '';
        const word = (0, parser_1.getWordAtPosition)(lineText, character);
        if (!word)
            return null;
        // Check for dot-access: resolve struct/class member
        const dotCtx = (0, parser_1.getDotContext)(lineText, character);
        if (dotCtx) {
            const varType = this.resolveVariableType(uri, dotCtx.objName, line);
            if (varType) {
                const members = this.getClassMembers(varType);
                const member = members.find(m => m.name === word);
                if (member) {
                    return formatHover(member);
                }
            }
        }
        const symbol = this.findSymbolByName(uri, word, line);
        if (!symbol) {
            // Try cross-file lookup
            for (const [, docIndex] of this.documents) {
                const found = docIndex.symbols.find(s => s.name === word);
                if (found) {
                    return formatHover(found);
                }
            }
            return null;
        }
        return formatHover(symbol);
    }
    /**
     * Get all document symbols for the outline view.
     */
    getDocumentSymbols(uri) {
        const doc = this.documents.get(uri);
        if (!doc)
            return [];
        return doc.symbols.map(sym => ({
            name: sym.name,
            kind: mapSymbolKind(sym.kind),
            location: {
                uri,
                range: {
                    start: { line: sym.location.line, character: sym.location.character },
                    end: {
                        line: sym.endLocation?.line ?? sym.location.line,
                        character: sym.endLocation?.character ?? (sym.location.character + sym.name.length),
                    },
                },
            },
            containerName: sym.scope || undefined,
        }));
    }
    /**
     * Find a symbol by name, preferring symbols in the same or enclosing scope.
     */
    findSymbolByName(uri, name, atLine) {
        const doc = this.documents.get(uri);
        if (!doc)
            return null;
        // Collect all matching symbols
        const matches = doc.symbols.filter(s => s.name === name);
        if (matches.length === 0)
            return null;
        if (matches.length === 1)
            return matches[0];
        // Prefer the symbol whose scope contains the requesting line
        // Find the enclosing scope at `atLine`
        const enclosingScopes = doc.symbols.filter(s => (s.kind === parser_1.SymbolKind.Module ||
            s.kind === parser_1.SymbolKind.Class ||
            s.kind === parser_1.SymbolKind.Function ||
            s.kind === parser_1.SymbolKind.Task) &&
            s.location.line <= atLine &&
            (s.endLocation ? s.endLocation.line >= atLine : true));
        const scopeNames = new Set(enclosingScopes.map(s => s.name));
        // Prefer symbols in the same scope
        const inScope = matches.find(m => scopeNames.has(m.scope));
        if (inScope)
            return inScope;
        // Fall back to first match
        return matches[0];
    }
    /**
     * Resolve a variable's type to a class name if possible.
     */
    resolveVariableType(uri, varName, atLine) {
        const sym = this.findSymbolByName(uri, varName, atLine);
        if (sym) {
            return this.extractClassName(sym.type);
        }
        // Cross-file lookup
        for (const [, doc] of this.documents) {
            const found = doc.symbols.find(s => s.name === varName);
            if (found)
                return this.extractClassName(found.type);
        }
        return null;
    }
    /**
     * Get all members (fields, methods, constraints) of a class, including inherited members.
     * Child members shadow parent members of the same name.
     */
    getClassMembers(className) {
        const allMembers = [];
        const seenNames = new Set();
        const visited = new Set();
        let current = className;
        while (current && !visited.has(current)) {
            visited.add(current);
            let parentClass;
            for (const [, doc] of this.documents) {
                for (const sym of doc.symbols) {
                    if (sym.name === current && (sym.kind === parser_1.SymbolKind.Class || sym.kind === parser_1.SymbolKind.Struct)) {
                        parentClass = sym.extends;
                    }
                    if (sym.scope === current && !seenNames.has(sym.name)) {
                        seenNames.add(sym.name);
                        allMembers.push(sym);
                    }
                }
            }
            current = parentClass;
        }
        return allMembers;
    }
    /**
     * Check if a symbol is visible from a given file, considering same-file,
     * includes, imports, and globally-scoped modules/classes/interfaces.
     */
    isSymbolVisibleFrom(symbolName, fromUri) {
        const fromDoc = this.documents.get(fromUri);
        if (!fromDoc)
            return false;
        // 1. Same file
        if (fromDoc.symbols.some(s => s.name === symbolName))
            return true;
        // 2. Included files
        for (const inc of fromDoc.includes) {
            for (const [uri, doc] of this.documents) {
                if (uri !== fromUri && this.uriMatchesInclude(uri, inc)) {
                    if (doc.symbols.some(s => s.name === symbolName))
                        return true;
                }
            }
        }
        // 3. Imported packages
        for (const imp of fromDoc.imports) {
            for (const [, doc] of this.documents) {
                const pkg = doc.symbols.find(s => s.name === imp.packageName && s.kind === parser_1.SymbolKind.Package);
                if (pkg) {
                    if (imp.symbol === '*') {
                        if (doc.symbols.some(s => s.name === symbolName && s.scope === imp.packageName))
                            return true;
                    }
                    else {
                        if (imp.symbol === symbolName &&
                            doc.symbols.some(s => s.name === symbolName && s.scope === imp.packageName))
                            return true;
                    }
                }
            }
        }
        // 4. Globally visible: modules, interfaces, packages, and top-level classes
        for (const [uri, doc] of this.documents) {
            if (uri === fromUri)
                continue;
            const found = doc.symbols.find(s => s.name === symbolName && (s.kind === parser_1.SymbolKind.Module ||
                s.kind === parser_1.SymbolKind.Interface ||
                s.kind === parser_1.SymbolKind.Package ||
                (s.kind === parser_1.SymbolKind.Class && (!s.scope || s.scope === ''))));
            if (found)
                return true;
        }
        return false;
    }
    /**
     * Check if a symbol exists anywhere in the indexed workspace.
     */
    findSymbolAnywhere(symbolName) {
        for (const [uri, doc] of this.documents) {
            const found = doc.symbols.find(s => s.name === symbolName &&
                (s.kind === parser_1.SymbolKind.Class || s.kind === parser_1.SymbolKind.Module ||
                    s.kind === parser_1.SymbolKind.Interface || s.kind === parser_1.SymbolKind.Typedef ||
                    s.kind === parser_1.SymbolKind.Package));
            if (found)
                return { sym: found, uri };
        }
        return null;
    }
    /**
     * Get all indexed document URIs.
     */
    getAllDocumentUris() {
        return Array.from(this.documents.keys());
    }
    findClassSymbol(className) {
        for (const [uri, doc] of this.documents) {
            for (const sym of doc.symbols) {
                if (sym.name === className && (sym.kind === parser_1.SymbolKind.Class || sym.kind === parser_1.SymbolKind.Struct)) {
                    return { sym, uri };
                }
            }
        }
        return null;
    }
    findSymbolUri(symbol) {
        for (const [uri, doc] of this.documents) {
            if (doc.symbols.includes(symbol))
                return uri;
        }
        return null;
    }
    extractClassName(typeStr) {
        const cleaned = typeStr
            .replace(/\b(rand|randc|const|static|automatic|local|protected|virtual|var|input|output|inout)\b/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .trim();
        if (!cleaned)
            return null;
        if (svLanguage_1.SV_TYPES.has(cleaned) || svLanguage_1.SV_KEYWORDS.has(cleaned) || svLanguage_1.SV_STORAGE_MODIFIERS.has(cleaned))
            return null;
        const match = cleaned.match(/^([a-zA-Z_][a-zA-Z0-9_$]*)$/);
        if (!match)
            return null;
        if (this.findClassSymbol(match[1]))
            return match[1];
        return null;
    }
    uriMatchesInclude(uri, includePath) {
        const includeFile = includePath.replace(/\\/g, '/');
        const uriNorm = decodeURIComponent(uri).replace(/\\/g, '/');
        return uriNorm.endsWith('/' + includeFile);
    }
    /**
     * Trace all dependencies of a file (module instantiations, package imports,
     * include directives) and return a topologically sorted list of file URIs
     * so that each file appears after its dependencies.
     */
    getDependencyChain(uri) {
        const doc = this.documents.get(uri);
        if (!doc)
            return null;
        const topModuleSym = doc.symbols.find(s => (s.kind === parser_1.SymbolKind.Module || s.kind === parser_1.SymbolKind.Program) && !s.scope);
        const topModule = topModuleSym?.name || 'top';
        const knownDefs = new Map();
        for (const [docUri, docIndex] of this.documents) {
            for (const sym of docIndex.symbols) {
                if ((sym.kind === parser_1.SymbolKind.Module || sym.kind === parser_1.SymbolKind.Interface ||
                    sym.kind === parser_1.SymbolKind.Package) && !sym.scope) {
                    knownDefs.set(sym.name, docUri);
                }
            }
        }
        const visited = new Set();
        const order = [];
        const includedByOther = new Set();
        const visit = (fileUri, viaInclude) => {
            if (viaInclude)
                includedByOther.add(fileUri);
            if (visited.has(fileUri))
                return;
            visited.add(fileUri);
            const fileDoc = this.documents.get(fileUri);
            if (!fileDoc) {
                order.push(fileUri);
                return;
            }
            for (const imp of fileDoc.imports) {
                const pkgUri = knownDefs.get(imp.packageName);
                if (pkgUri)
                    visit(pkgUri, false);
            }
            for (const inc of fileDoc.includes) {
                for (const [candidateUri] of this.documents) {
                    if (this.uriMatchesInclude(candidateUri, inc)) {
                        visit(candidateUri, true);
                    }
                }
            }
            const localDefs = new Set(fileDoc.symbols
                .filter(s => s.kind === parser_1.SymbolKind.Module || s.kind === parser_1.SymbolKind.Interface ||
                s.kind === parser_1.SymbolKind.Package || s.kind === parser_1.SymbolKind.Class)
                .map(s => s.name));
            for (const [defName, defUri] of knownDefs) {
                if (defUri === fileUri)
                    continue;
                if (localDefs.has(defName))
                    continue;
                const escaped = defName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const instRegex = new RegExp('\\b' + escaped + '\\b');
                if (instRegex.test(fileDoc.text)) {
                    visit(defUri, false);
                }
            }
            order.push(fileUri);
        };
        visit(uri, false);
        const includeDirSet = new Set();
        for (const incUri of includedByOther) {
            const lastSlash = incUri.lastIndexOf('/');
            if (lastSlash >= 0) {
                includeDirSet.add(incUri.substring(0, lastSlash));
            }
        }
        const compileOrder = order.filter(u => !includedByOther.has(u));
        const files = compileOrder.map(u => ({ uri: u }));
        const includeDirs = Array.from(includeDirSet);
        return { files, topModule, includeDirs };
    }
    /**
     * Build the full class inheritance hierarchy tree for a given class name.
     * Walks UP extends chains to find the root, then DOWN to build the full tree.
     */
    getClassHierarchy(className) {
        const allClasses = this.getAllClassSymbols();
        if (allClasses.length === 0)
            return null;
        const classMap = new Map();
        for (const entry of allClasses) {
            classMap.set(entry.sym.name, entry);
        }
        const target = classMap.get(className);
        if (!target)
            return null;
        // Walk UP to find the root ancestor
        let rootName = className;
        const visited = new Set();
        while (true) {
            if (visited.has(rootName))
                break;
            visited.add(rootName);
            const entry = classMap.get(rootName);
            if (!entry || !entry.sym.extends)
                break;
            if (!classMap.has(entry.sym.extends)) {
                // Parent not found in indexed files -- it becomes the root as an external node
                const externalRoot = {
                    name: entry.sym.extends,
                    uri: '',
                    line: -1,
                    children: [],
                };
                // Build tree from this external root
                this.buildHierarchyChildren(externalRoot, classMap);
                return externalRoot;
            }
            rootName = entry.sym.extends;
        }
        // Build tree from the root
        const rootEntry = classMap.get(rootName);
        const rootNode = {
            name: rootName,
            uri: rootEntry.uri,
            line: rootEntry.sym.location.line,
            children: [],
        };
        this.buildHierarchyChildren(rootNode, classMap);
        return rootNode;
    }
    getAllClassSymbols() {
        const results = [];
        for (const [uri, doc] of this.documents) {
            for (const sym of doc.symbols) {
                if (sym.kind === parser_1.SymbolKind.Class) {
                    results.push({ sym, uri });
                }
            }
        }
        return results;
    }
    buildHierarchyChildren(node, classMap) {
        for (const [name, entry] of classMap) {
            if (entry.sym.extends === node.name) {
                const child = {
                    name,
                    uri: entry.uri,
                    line: entry.sym.location.line,
                    children: [],
                };
                this.buildHierarchyChildren(child, classMap);
                node.children.push(child);
            }
        }
        // Sort children alphabetically for consistent display
        node.children.sort((a, b) => a.name.localeCompare(b.name));
    }
}
exports.SymbolTable = SymbolTable;
function formatHover(sym) {
    const kindLabel = sym.kind.charAt(0).toUpperCase() + sym.kind.slice(1);
    let md = `**${kindLabel}**: \`${sym.name}\`\n\n`;
    md += `**Type**: \`${sym.type}\`\n\n`;
    if (sym.extends) {
        md += `**Extends**: \`${sym.extends}\`\n\n`;
    }
    if (sym.scope) {
        md += `**Scope**: \`${sym.scope}\`\n\n`;
    }
    md += `**Declared at**: line ${sym.location.line + 1}`;
    return md;
}
function mapSymbolKind(kind) {
    switch (kind) {
        case parser_1.SymbolKind.Module: return vscode_languageserver_1.SymbolKind.Module;
        case parser_1.SymbolKind.Class: return vscode_languageserver_1.SymbolKind.Class;
        case parser_1.SymbolKind.Function: return vscode_languageserver_1.SymbolKind.Function;
        case parser_1.SymbolKind.Task: return vscode_languageserver_1.SymbolKind.Function;
        case parser_1.SymbolKind.Variable: return vscode_languageserver_1.SymbolKind.Variable;
        case parser_1.SymbolKind.Port: return vscode_languageserver_1.SymbolKind.Property;
        case parser_1.SymbolKind.Parameter: return vscode_languageserver_1.SymbolKind.Constant;
        case parser_1.SymbolKind.Interface: return vscode_languageserver_1.SymbolKind.Interface;
        case parser_1.SymbolKind.Package: return vscode_languageserver_1.SymbolKind.Package;
        case parser_1.SymbolKind.Program: return vscode_languageserver_1.SymbolKind.Module;
        case parser_1.SymbolKind.Typedef: return vscode_languageserver_1.SymbolKind.TypeParameter;
        case parser_1.SymbolKind.Constraint: return vscode_languageserver_1.SymbolKind.Object;
        case parser_1.SymbolKind.Covergroup: return vscode_languageserver_1.SymbolKind.Struct;
        case parser_1.SymbolKind.Enum: return vscode_languageserver_1.SymbolKind.Enum;
        case parser_1.SymbolKind.Struct: return vscode_languageserver_1.SymbolKind.Struct;
        case parser_1.SymbolKind.Instance: return vscode_languageserver_1.SymbolKind.Object;
        default: return vscode_languageserver_1.SymbolKind.Variable;
    }
}
//# sourceMappingURL=symbolTable.js.map