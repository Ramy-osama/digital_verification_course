import { SVSymbol, SVReference, ParseResult, SymbolKind, ImportDirective, parseDocument, getWordAtPosition, getDotContext } from './parser';
import { Location, Range, Position, SymbolInformation } from 'vscode-languageserver';
import { SymbolKind as LSPSymbolKind } from 'vscode-languageserver';
import { SV_TYPES, SV_KEYWORDS, SV_STORAGE_MODIFIERS } from './svLanguage';

export interface DocumentIndex {
  uri: string;
  symbols: SVSymbol[];
  references: SVReference[];
  imports: ImportDirective[];
  includes: string[];
  text: string;
  lines: string[];
}

export class SymbolTable {
  private documents: Map<string, DocumentIndex> = new Map();

  updateDocument(uri: string, text: string): DocumentIndex {
    const result = parseDocument(text);
    const lines = text.split('\n');
    const index: DocumentIndex = {
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

  removeDocument(uri: string): void {
    this.documents.delete(uri);
  }

  getDocument(uri: string): DocumentIndex | undefined {
    return this.documents.get(uri);
  }

  /**
   * Find the definition of a symbol at the given position.
   * Returns the location of the declaration.
   */
  findDefinition(uri: string, line: number, character: number): Location | null {
    const doc = this.documents.get(uri);
    if (!doc) return null;

    const word = getWordAtPosition(doc.lines[line] || '', character);
    if (!word) return null;

    const lineText = doc.lines[line] || '';

    // Check for dot-access pattern (obj.member): resolve the object type and
    // look up the member inside the class/struct scope
    const dotCtx = getDotContext(lineText, character);
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
      if (docUri === uri) continue;
      const found = docIndex.symbols.find(
        s => s.name === word && (
          s.kind === SymbolKind.Module ||
          s.kind === SymbolKind.Class ||
          s.kind === SymbolKind.Interface ||
          s.kind === SymbolKind.Package ||
          s.kind === SymbolKind.Struct
        )
      );
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
  findReferences(uri: string, line: number, character: number, includeDeclaration: boolean): Location[] {
    const doc = this.documents.get(uri);
    if (!doc) return [];

    const word = getWordAtPosition(doc.lines[line] || '', character);
    if (!word) return [];

    const locations: Location[] = [];

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
          const isDuplicate = locations.some(
            loc => loc.uri === docUri && loc.range.start.line === ref.location.line && loc.range.start.character === ref.location.character
          );
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
  getHoverInfo(uri: string, line: number, character: number): string | null {
    const doc = this.documents.get(uri);
    if (!doc) return null;

    const lineText = doc.lines[line] || '';
    const word = getWordAtPosition(lineText, character);
    if (!word) return null;

    // Check for dot-access: resolve struct/class member
    const dotCtx = getDotContext(lineText, character);
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
  getDocumentSymbols(uri: string): SymbolInformation[] {
    const doc = this.documents.get(uri);
    if (!doc) return [];

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
  private findSymbolByName(uri: string, name: string, atLine: number): SVSymbol | null {
    const doc = this.documents.get(uri);
    if (!doc) return null;

    // Collect all matching symbols
    const matches = doc.symbols.filter(s => s.name === name);
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];

    // Prefer the symbol whose scope contains the requesting line
    // Find the enclosing scope at `atLine`
    const enclosingScopes = doc.symbols.filter(
      s =>
        (s.kind === SymbolKind.Module ||
          s.kind === SymbolKind.Class ||
          s.kind === SymbolKind.Function ||
          s.kind === SymbolKind.Task) &&
        s.location.line <= atLine &&
        (s.endLocation ? s.endLocation.line >= atLine : true)
    );

    const scopeNames = new Set(enclosingScopes.map(s => s.name));

    // Prefer symbols in the same scope
    const inScope = matches.find(m => scopeNames.has(m.scope));
    if (inScope) return inScope;

    // Fall back to first match
    return matches[0];
  }

  /**
   * Resolve a variable's type to a class name if possible.
   */
  resolveVariableType(uri: string, varName: string, atLine: number): string | null {
    const sym = this.findSymbolByName(uri, varName, atLine);
    if (sym) {
      return this.extractClassName(sym.type);
    }

    // Cross-file lookup
    for (const [, doc] of this.documents) {
      const found = doc.symbols.find(s => s.name === varName);
      if (found) return this.extractClassName(found.type);
    }

    return null;
  }

  /**
   * Get all members (fields, methods, constraints) of a class, including inherited members.
   * Child members shadow parent members of the same name.
   */
  getClassMembers(className: string): SVSymbol[] {
    const allMembers: SVSymbol[] = [];
    const seenNames = new Set<string>();
    const visited = new Set<string>();

    let current: string | undefined = className;

    while (current && !visited.has(current)) {
      visited.add(current);
      let parentClass: string | undefined;

      for (const [, doc] of this.documents) {
        for (const sym of doc.symbols) {
          if (sym.name === current && (sym.kind === SymbolKind.Class || sym.kind === SymbolKind.Struct)) {
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
  isSymbolVisibleFrom(symbolName: string, fromUri: string): boolean {
    const fromDoc = this.documents.get(fromUri);
    if (!fromDoc) return false;

    // 1. Same file
    if (fromDoc.symbols.some(s => s.name === symbolName)) return true;

    // 2. Included files
    for (const inc of fromDoc.includes) {
      for (const [uri, doc] of this.documents) {
        if (uri !== fromUri && this.uriMatchesInclude(uri, inc)) {
          if (doc.symbols.some(s => s.name === symbolName)) return true;
        }
      }
    }

    // 3. Imported packages
    for (const imp of fromDoc.imports) {
      for (const [, doc] of this.documents) {
        const pkg = doc.symbols.find(
          s => s.name === imp.packageName && s.kind === SymbolKind.Package
        );
        if (pkg) {
          if (imp.symbol === '*') {
            if (doc.symbols.some(s => s.name === symbolName && s.scope === imp.packageName))
              return true;
          } else {
            if (imp.symbol === symbolName &&
                doc.symbols.some(s => s.name === symbolName && s.scope === imp.packageName))
              return true;
          }
        }
      }
    }

    // 4. Globally visible: modules, interfaces, packages, and top-level classes
    for (const [uri, doc] of this.documents) {
      if (uri === fromUri) continue;
      const found = doc.symbols.find(s =>
        s.name === symbolName && (
          s.kind === SymbolKind.Module ||
          s.kind === SymbolKind.Interface ||
          s.kind === SymbolKind.Package ||
          (s.kind === SymbolKind.Class && (!s.scope || s.scope === ''))
        )
      );
      if (found) return true;
    }

    return false;
  }

  /**
   * Check if a symbol exists anywhere in the indexed workspace.
   */
  findSymbolAnywhere(symbolName: string): { sym: SVSymbol; uri: string } | null {
    for (const [uri, doc] of this.documents) {
      const found = doc.symbols.find(s => s.name === symbolName &&
        (s.kind === SymbolKind.Class || s.kind === SymbolKind.Module ||
         s.kind === SymbolKind.Interface || s.kind === SymbolKind.Typedef ||
         s.kind === SymbolKind.Package));
      if (found) return { sym: found, uri };
    }
    return null;
  }

  /**
   * Get all indexed document URIs.
   */
  getAllDocumentUris(): string[] {
    return Array.from(this.documents.keys());
  }

  private findClassSymbol(className: string): { sym: SVSymbol; uri: string } | null {
    for (const [uri, doc] of this.documents) {
      for (const sym of doc.symbols) {
        if (sym.name === className && (sym.kind === SymbolKind.Class || sym.kind === SymbolKind.Struct)) {
          return { sym, uri };
        }
      }
    }
    return null;
  }

  private findSymbolUri(symbol: SVSymbol): string | null {
    for (const [uri, doc] of this.documents) {
      if (doc.symbols.includes(symbol)) return uri;
    }
    return null;
  }

  private extractClassName(typeStr: string): string | null {
    const cleaned = typeStr
      .replace(/\b(rand|randc|const|static|automatic|local|protected|virtual|var|input|output|inout)\b/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .trim();

    if (!cleaned) return null;
    if (SV_TYPES.has(cleaned) || SV_KEYWORDS.has(cleaned) || SV_STORAGE_MODIFIERS.has(cleaned)) return null;

    const match = cleaned.match(/^([a-zA-Z_][a-zA-Z0-9_$]*)$/);
    if (!match) return null;

    if (this.findClassSymbol(match[1])) return match[1];
    return null;
  }

  private uriMatchesInclude(uri: string, includePath: string): boolean {
    const includeFile = includePath.replace(/\\/g, '/');
    const uriNorm = decodeURIComponent(uri).replace(/\\/g, '/');
    return uriNorm.endsWith('/' + includeFile);
  }

  /**
   * Trace all dependencies of a file (module instantiations, package imports,
   * include directives) and return a topologically sorted list of file URIs
   * so that each file appears after its dependencies.
   */
  getDependencyChain(uri: string): DependencyChainResult | null {
    const doc = this.documents.get(uri);
    if (!doc) return null;

    const topModuleSym = doc.symbols.find(s =>
      (s.kind === SymbolKind.Module || s.kind === SymbolKind.Program) && !s.scope
    );
    const topModule = topModuleSym?.name || 'top';

    const knownDefs = new Map<string, string>();
    for (const [docUri, docIndex] of this.documents) {
      for (const sym of docIndex.symbols) {
        if ((sym.kind === SymbolKind.Module || sym.kind === SymbolKind.Interface ||
             sym.kind === SymbolKind.Package) && !sym.scope) {
          knownDefs.set(sym.name, docUri);
        }
      }
    }

    const visited = new Set<string>();
    const order: string[] = [];
    const includedByOther = new Set<string>();

    const visit = (fileUri: string, viaInclude: boolean) => {
      if (viaInclude) includedByOther.add(fileUri);
      if (visited.has(fileUri)) return;
      visited.add(fileUri);

      const fileDoc = this.documents.get(fileUri);
      if (!fileDoc) { order.push(fileUri); return; }

      for (const imp of fileDoc.imports) {
        const pkgUri = knownDefs.get(imp.packageName);
        if (pkgUri) visit(pkgUri, false);
      }

      for (const inc of fileDoc.includes) {
        for (const [candidateUri] of this.documents) {
          if (this.uriMatchesInclude(candidateUri, inc)) {
            visit(candidateUri, true);
          }
        }
      }

      const localDefs = new Set(
        fileDoc.symbols
          .filter(s => s.kind === SymbolKind.Module || s.kind === SymbolKind.Interface ||
                       s.kind === SymbolKind.Package || s.kind === SymbolKind.Class)
          .map(s => s.name)
      );

      for (const [defName, defUri] of knownDefs) {
        if (defUri === fileUri) continue;
        if (localDefs.has(defName)) continue;
        const escaped = defName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const instRegex = new RegExp('\\b' + escaped + '\\b');
        if (instRegex.test(fileDoc.text)) {
          visit(defUri, false);
        }
      }

      order.push(fileUri);
    };

    visit(uri, false);

    const includeDirSet = new Set<string>();
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
  getClassHierarchy(className: string): HierarchyNode | null {
    const allClasses = this.getAllClassSymbols();
    if (allClasses.length === 0) return null;

    const classMap = new Map<string, { sym: SVSymbol; uri: string }>();
    for (const entry of allClasses) {
      classMap.set(entry.sym.name, entry);
    }

    const target = classMap.get(className);
    if (!target) return null;

    // Walk UP to find the root ancestor
    let rootName = className;
    const visited = new Set<string>();
    while (true) {
      if (visited.has(rootName)) break;
      visited.add(rootName);
      const entry = classMap.get(rootName);
      if (!entry || !entry.sym.extends) break;
      if (!classMap.has(entry.sym.extends)) {
        // Parent not found in indexed files -- it becomes the root as an external node
        const externalRoot: HierarchyNode = {
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
    const rootEntry = classMap.get(rootName)!;
    const rootNode: HierarchyNode = {
      name: rootName,
      uri: rootEntry.uri,
      line: rootEntry.sym.location.line,
      children: [],
    };
    this.buildHierarchyChildren(rootNode, classMap);
    return rootNode;
  }

  private getAllClassSymbols(): { sym: SVSymbol; uri: string }[] {
    const results: { sym: SVSymbol; uri: string }[] = [];
    for (const [uri, doc] of this.documents) {
      for (const sym of doc.symbols) {
        if (sym.kind === SymbolKind.Class) {
          results.push({ sym, uri });
        }
      }
    }
    return results;
  }

  private buildHierarchyChildren(
    node: HierarchyNode,
    classMap: Map<string, { sym: SVSymbol; uri: string }>,
  ): void {
    for (const [name, entry] of classMap) {
      if (entry.sym.extends === node.name) {
        const child: HierarchyNode = {
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

export interface HierarchyNode {
  name: string;
  uri: string;
  line: number;
  children: HierarchyNode[];
}

export interface DependencyChainResult {
  files: { uri: string }[];
  topModule: string;
  includeDirs: string[];
}

function formatHover(sym: SVSymbol): string {
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

function mapSymbolKind(kind: SymbolKind): LSPSymbolKind {
  switch (kind) {
    case SymbolKind.Module: return LSPSymbolKind.Module;
    case SymbolKind.Class: return LSPSymbolKind.Class;
    case SymbolKind.Function: return LSPSymbolKind.Function;
    case SymbolKind.Task: return LSPSymbolKind.Function;
    case SymbolKind.Variable: return LSPSymbolKind.Variable;
    case SymbolKind.Port: return LSPSymbolKind.Property;
    case SymbolKind.Parameter: return LSPSymbolKind.Constant;
    case SymbolKind.Interface: return LSPSymbolKind.Interface;
    case SymbolKind.Package: return LSPSymbolKind.Package;
    case SymbolKind.Program: return LSPSymbolKind.Module;
    case SymbolKind.Typedef: return LSPSymbolKind.TypeParameter;
    case SymbolKind.Constraint: return LSPSymbolKind.Object;
    case SymbolKind.Covergroup: return LSPSymbolKind.Struct;
    case SymbolKind.Enum: return LSPSymbolKind.Enum;
    case SymbolKind.Struct: return LSPSymbolKind.Struct;
    case SymbolKind.Instance: return LSPSymbolKind.Object;
    default: return LSPSymbolKind.Variable;
  }
}
