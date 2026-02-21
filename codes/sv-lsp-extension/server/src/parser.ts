import {
  SV_KEYWORDS,
  SV_TYPES,
  SV_PORT_DIRECTIONS,
  SV_STORAGE_MODIFIERS,
  SCOPE_OPEN_KEYWORDS,
  SCOPE_CLOSE_KEYWORDS,
  ScopeKind,
} from './svLanguage';

export enum SymbolKind {
  Module = 'module',
  Class = 'class',
  Function = 'function',
  Task = 'task',
  Variable = 'variable',
  Port = 'port',
  Parameter = 'parameter',
  Interface = 'interface',
  Package = 'package',
  Program = 'program',
  Typedef = 'typedef',
  Constraint = 'constraint',
  Covergroup = 'covergroup',
  Enum = 'enum',
  Struct = 'struct',
  Instance = 'instance',
}

export interface SymbolLocation {
  line: number;
  character: number;
}

export interface SVSymbol {
  name: string;
  kind: SymbolKind;
  type: string;
  location: SymbolLocation;
  endLocation?: SymbolLocation;
  scope: string;
  children?: string[];
  extends?: string;
}

export interface SVReference {
  name: string;
  location: SymbolLocation;
  scope: string;
}

export interface ParseResult {
  symbols: SVSymbol[];
  references: SVReference[];
  diagnostics: ParseDiagnostic[];
  defines: Map<string, string>;
  imports: ImportDirective[];
  includes: string[];
}

export interface ParseDiagnostic {
  line: number;
  character: number;
  endCharacter: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ImportDirective {
  packageName: string;
  symbol: string | '*';
  line: number;
}

interface ScopeFrame {
  kind: ScopeKind;
  name: string;
  startLine: number;
}

const IDENTIFIER_RE = /[a-zA-Z_][a-zA-Z0-9_$]*/;

/**
 * Strips single-line and block comments, preserving line structure
 * so that line numbers remain correct for symbol positions.
 */
export function stripComments(text: string, blankStrings = false): string {
  let result = '';
  let i = 0;
  let inLineComment = false;
  let inBlockComment = false;
  let inString = false;

  while (i < text.length) {
    if (inLineComment) {
      if (text[i] === '\n') {
        inLineComment = false;
        result += '\n';
      } else {
        result += ' ';
      }
      i++;
    } else if (inBlockComment) {
      if (text[i] === '*' && text[i + 1] === '/') {
        inBlockComment = false;
        result += '  ';
        i += 2;
      } else {
        result += text[i] === '\n' ? '\n' : ' ';
        i++;
      }
    } else if (inString) {
      if (text[i] === '\\' && i + 1 < text.length) {
        result += blankStrings ? '  ' : text[i] + text[i + 1];
        i += 2;
      } else if (text[i] === '"') {
        inString = false;
        result += '"';
        i++;
      } else {
        result += blankStrings ? (text[i] === '\n' ? '\n' : ' ') : text[i];
        i++;
      }
    } else {
      if (text[i] === '/' && text[i + 1] === '/') {
        inLineComment = true;
        result += '  ';
        i += 2;
      } else if (text[i] === '/' && text[i + 1] === '*') {
        inBlockComment = true;
        result += '  ';
        i += 2;
      } else if (text[i] === '"') {
        inString = true;
        result += text[i];
        i++;
      } else {
        result += text[i];
        i++;
      }
    }
  }
  return result;
}

export function parseDocument(text: string): ParseResult {
  const symbols: SVSymbol[] = [];
  const references: SVReference[] = [];
  const diagnostics: ParseDiagnostic[] = [];
  const imports: ImportDirective[] = [];
  const includes: string[] = [];
  const scopeStack: ScopeFrame[] = [];
  const declaredNames = new Set<string>();
  const portParsedLines = new Set<number>();

  const cleaned = stripComments(text);
  const lines = cleaned.split('\n');

  // First pass: collect `define macros for resolution
  const defineMap = new Map<string, string>();
  for (const ln of lines) {
    const m = ln.trim().match(/^`define\s+([a-zA-Z_]\w*)\s+(.*)/);
    if (m) {
      defineMap.set(m[1], m[2].trim());
    }
  }

  function currentScope(): string {
    return scopeStack.length > 0 ? scopeStack[scopeStack.length - 1].name : '';
  }

  function fullScopePath(): string {
    return scopeStack.map(s => s.name).join('.');
  }

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx];
    const line = rawLine.trim();
    if (line.length === 0) continue;

    // Skip lines already consumed by port-list parsing, but still
    // parse parameter declarations that appear in the #(...) block
    if (portParsedLines.has(lineIdx)) {
      const paramInPortMatch = line.match(
        /^parameter\s+((?:(?:logic|reg|wire|bit|int|integer|real|signed|unsigned)\s*(?:\[[^\]]*\]\s*)?)?)\s*([a-zA-Z_][a-zA-Z0-9_$]*)\s*=/
      );
      if (paramInPortMatch) {
        const paramType = 'parameter' + (paramInPortMatch[1] ? ' ' + paramInPortMatch[1].trim() : '');
        const paramName = paramInPortMatch[2];
        const col = rawLine.indexOf(paramName);
        symbols.push({
          name: paramName,
          kind: SymbolKind.Parameter,
          type: paramType,
          location: { line: lineIdx, character: Math.max(0, col) },
          scope: currentScope(),
        });
        declaredNames.add(paramName);
      }
      extractReferencesFromLine(rawLine, lineIdx, references, declaredNames, currentScope());
      continue;
    }

    // --- Scope-opening constructs: module, class, function, task, interface, package ---
    const scopeOpenMatch = line.match(
      /^(?:virtual\s+)?(module|macromodule|class|function|task|interface|package|program|generate|covergroup)\s+(?:(?:automatic|static)\s+)?(?:(?:void|int|logic|bit|byte|shortint|longint|integer|string|real|realtime|time)\s*(?:\[[^\]]*\]\s*)?)?([a-zA-Z_][a-zA-Z0-9_$]*)?/
    );

    if (scopeOpenMatch) {
      const keyword = scopeOpenMatch[1];
      const name = scopeOpenMatch[2] || `<anonymous_${lineIdx}>`;
      const scopeKind = SCOPE_OPEN_KEYWORDS[keyword] || ScopeKind.Begin;
      const col = rawLine.indexOf(name);

      let symbolKind: SymbolKind;
      switch (scopeKind) {
        case ScopeKind.Module: symbolKind = SymbolKind.Module; break;
        case ScopeKind.Class: symbolKind = SymbolKind.Class; break;
        case ScopeKind.Function: symbolKind = SymbolKind.Function; break;
        case ScopeKind.Task: symbolKind = SymbolKind.Task; break;
        case ScopeKind.Interface: symbolKind = SymbolKind.Interface; break;
        case ScopeKind.Package: symbolKind = SymbolKind.Package; break;
        case ScopeKind.Program: symbolKind = SymbolKind.Program; break;
        case ScopeKind.Covergroup: symbolKind = SymbolKind.Covergroup; break;
        default: symbolKind = SymbolKind.Variable;
      }

      const sym: SVSymbol = {
        name,
        kind: symbolKind,
        type: keyword,
        location: { line: lineIdx, character: Math.max(0, col) },
        scope: currentScope(),
      };

      if (scopeKind === ScopeKind.Class) {
        const extendsMatch = line.match(/extends\s+(`?)([a-zA-Z_][a-zA-Z0-9_$]*)/);
        if (extendsMatch) {
          const hasBacktick = extendsMatch[1] === '`';
          const rawName = extendsMatch[2];
          sym.extends = hasBacktick ? (defineMap.get(rawName) || rawName) : rawName;
        }
      }

      symbols.push(sym);
      declaredNames.add(name);

      scopeStack.push({ kind: scopeKind, name, startLine: lineIdx });

      // For modules, also parse inline port declarations on the same or following lines
      if (scopeKind === ScopeKind.Module || scopeKind === ScopeKind.Interface) {
        parsePortList(lines, lineIdx, symbols, references, declaredNames, name, portParsedLines);
      }
      continue;
    }

    // --- Scope-closing constructs ---
    const scopeCloseMatch = line.match(
      /^(endmodule|endclass|endfunction|endtask|endinterface|endpackage|endprogram|endgenerate|endgroup)\b/
    );
    if (scopeCloseMatch) {
      if (scopeStack.length > 0) {
        const frame = scopeStack[scopeStack.length - 1];
        const sym = symbols.find(s => s.name === frame.name && s.location.line === frame.startLine);
        if (sym) {
          sym.endLocation = { line: lineIdx, character: 0 };
        }
        scopeStack.pop();
      }
      continue;
    }

    // --- begin/end (anonymous scope) ---
    if (/^begin\b/.test(line)) {
      const labelMatch = line.match(/^begin\s*:\s*([a-zA-Z_][a-zA-Z0-9_$]*)/);
      scopeStack.push({
        kind: ScopeKind.Begin,
        name: labelMatch ? labelMatch[1] : currentScope(),
        startLine: lineIdx,
      });
      // don't continue -- there may be more on this line
    }
    if (/\bend\b/.test(line) && !/\bendmodule|endclass|endfunction|endtask|endinterface|endpackage|endprogram|endgenerate|endgroup\b/.test(line)) {
      if (scopeStack.length > 0 && scopeStack[scopeStack.length - 1].kind === ScopeKind.Begin) {
        scopeStack.pop();
      }
    }

    // --- Import statements (import pkg::*; or import pkg::symbol;) ---
    const importMatch = line.match(/^import\s+([a-zA-Z_]\w*)::(\*|[a-zA-Z_]\w*)\s*;/);
    if (importMatch) {
      imports.push({
        packageName: importMatch[1],
        symbol: importMatch[2],
        line: lineIdx,
      });
      extractReferencesFromLine(rawLine, lineIdx, references, declaredNames, currentScope());
      continue;
    }

    // --- Include directives (`include "file.svh") ---
    const includeMatch = line.match(/^`include\s+"([^"]+)"/);
    if (includeMatch) {
      includes.push(includeMatch[1]);
      continue;
    }

    // --- Parameter / localparam declarations ---
    const paramMatch = line.match(
      /^(parameter|localparam)\s+((?:(?:logic|reg|wire|bit|int|integer|real|signed|unsigned)\s*(?:\[[^\]]*\]\s*)?)?)\s*([a-zA-Z_][a-zA-Z0-9_$]*)\s*=/
    );
    if (paramMatch) {
      const paramType = paramMatch[1] + (paramMatch[2] ? ' ' + paramMatch[2].trim() : '');
      const paramName = paramMatch[3];
      const col = rawLine.indexOf(paramName);
      symbols.push({
        name: paramName,
        kind: SymbolKind.Parameter,
        type: paramType,
        location: { line: lineIdx, character: Math.max(0, col) },
        scope: currentScope(),
      });
      declaredNames.add(paramName);
      continue;
    }

    // --- Struct body (typedef struct / anonymous struct) ---
    const structOpenMatch = line.match(
      /^(typedef\s+)?struct\s*(?:packed\s*)?(?:signed\s*|unsigned\s*)?\s*\{/
    );
    if (structOpenMatch) {
      const isTypedef = !!structOpenMatch[1];
      const structResult = parseStructBody(
        lines, lineIdx, isTypedef, currentScope(),
        symbols, references, declaredNames
      );
      if (structResult) {
        lineIdx = structResult.endLine;
        continue;
      }
    }

    // --- Typedef (single-line, e.g. typedef int my_int;) ---
    const typedefMatch = line.match(
      /^typedef\s+(.+?)\s+([a-zA-Z_][a-zA-Z0-9_$]*)\s*;/
    );
    if (typedefMatch) {
      const tdName = typedefMatch[2];
      const col = rawLine.indexOf(tdName);
      symbols.push({
        name: tdName,
        kind: SymbolKind.Typedef,
        type: 'typedef ' + typedefMatch[1].trim(),
        location: { line: lineIdx, character: Math.max(0, col) },
        scope: currentScope(),
      });
      declaredNames.add(tdName);
      continue;
    }

    // --- Constraint blocks ---
    const constraintMatch = line.match(
      /^constraint\s+([a-zA-Z_][a-zA-Z0-9_$]*)\s*\{/
    );
    if (constraintMatch) {
      const cName = constraintMatch[1];
      const col = rawLine.indexOf(cName);
      symbols.push({
        name: cName,
        kind: SymbolKind.Constraint,
        type: 'constraint',
        location: { line: lineIdx, character: Math.max(0, col) },
        scope: currentScope(),
      });
      declaredNames.add(cName);
      continue;
    }

    // --- Variable / signal / port declarations ---
    const declMatch = line.match(
      /^((?:(?:rand|randc|const|static|automatic|local|protected|virtual|var)\s+)*)?(input|output|inout)?\s*(logic|reg|wire|bit|int|integer|real|realtime|time|shortint|longint|byte|shortreal|string|chandle|event|void|genvar|tri|wand|wor|enum|struct)\s*((?:signed|unsigned|packed)\s*)*((?:\[[^\]]*\]\s*)*)\s*(.+)/
    );

    if (declMatch) {
      const modifiers = (declMatch[1] || '').trim();
      const direction = declMatch[2] || '';
      const baseType = declMatch[3];
      const signPacked = (declMatch[4] || '').trim();
      const ranges = (declMatch[5] || '').trim();
      const rest = declMatch[6];

      const fullType = [direction, modifiers, baseType, signPacked, ranges]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      const kind = direction ? SymbolKind.Port : SymbolKind.Variable;

      parseVariableNames(rest, fullType, kind, lineIdx, rawLine, symbols, references, declaredNames, currentScope());
      continue;
    }

    // --- Port-only declarations (input/output/inout without explicit type) ---
    const portOnlyMatch = line.match(
      /^(input|output|inout)\s+((?:\[[^\]]*\]\s*)*)\s*(.+)/
    );
    if (portOnlyMatch) {
      const direction = portOnlyMatch[1];
      const ranges = (portOnlyMatch[2] || '').trim();
      const rest = portOnlyMatch[3];
      const fullType = [direction, ranges].filter(Boolean).join(' ').trim();

      parseVariableNames(rest, fullType, SymbolKind.Port, lineIdx, rawLine, symbols, references, declaredNames, currentScope());
      continue;
    }

    // --- Class-type variable declarations (e.g., "transaction txn;") ---
    const classVarMatch = line.match(
      /^((?:(?:rand|randc|const|static|automatic|local|protected|virtual|var)\s+)*)([a-zA-Z_][a-zA-Z0-9_$]*)\s+(.*)/
    );
    if (classVarMatch) {
      const cvModifiers = (classVarMatch[1] || '').trim();
      const cvTypeName = classVarMatch[2];
      let cvRest = classVarMatch[3].trim();

      if (!SV_KEYWORDS.has(cvTypeName) && !SV_TYPES.has(cvTypeName) &&
          !SV_PORT_DIRECTIONS.has(cvTypeName) && !SV_STORAGE_MODIFIERS.has(cvTypeName)) {
        // Skip #(...) parameterization if present
        if (cvRest.startsWith('#(')) {
          let depth = 0;
          for (let i = 0; i < cvRest.length; i++) {
            if (cvRest[i] === '(') depth++;
            else if (cvRest[i] === ')') {
              depth--;
              if (depth === 0) { cvRest = cvRest.substring(i + 1).trim(); break; }
            }
          }
        }

        if (cvRest && /^[a-zA-Z_]/.test(cvRest)) {
          const fullType = [cvModifiers, cvTypeName].filter(Boolean).join(' ').trim();
          parseVariableNames(cvRest, fullType, SymbolKind.Variable, lineIdx, rawLine, symbols, references, declaredNames, currentScope());
          continue;
        }
      }
    }

    // --- Assign statements: extract references ---
    const assignMatch = line.match(/^assign\s+/);
    if (assignMatch) {
      extractReferencesFromLine(rawLine, lineIdx, references, declaredNames, currentScope());
      continue;
    }

    // --- General identifier references in expressions ---
    extractReferencesFromLine(rawLine, lineIdx, references, declaredNames, currentScope());
  }

  return { symbols, references, diagnostics, defines: defineMap, imports, includes };
}

/**
 * Parse a struct body from the opening { to the closing } name ;
 * Collects member declarations and creates the appropriate symbols.
 */
function parseStructBody(
  lines: string[],
  startLine: number,
  isTypedef: boolean,
  parentScope: string,
  symbols: SVSymbol[],
  references: SVReference[],
  declaredNames: Set<string>,
): { endLine: number } | null {
  let braceDepth = 0;
  let endLine = startLine;
  let foundClose = false;
  const memberSymbols: SVSymbol[] = [];

  const MEMBER_RE = /^(logic|reg|wire|bit|int|integer|real|realtime|time|shortint|longint|byte|shortreal|string|chandle|event|void)\s*((?:(?:signed|unsigned|packed)\s*)*)((?:\[[^\]]*\]\s*)*)\s*([a-zA-Z_][a-zA-Z0-9_$]*)\s*((?:\[[^\]]*\]\s*)*)\s*;/;

  for (let i = startLine; i < lines.length; i++) {
    const ln = lines[i];
    for (const ch of ln) {
      if (ch === '{') braceDepth++;
      if (ch === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          endLine = i;
          foundClose = true;
          break;
        }
      }
    }
    if (foundClose) break;

    if (i > startLine && braceDepth === 1) {
      const memberLine = ln.trim();
      if (memberLine.length === 0) continue;

      const mm = memberLine.match(MEMBER_RE);
      if (mm) {
        const mType = [mm[1], mm[2] || '', mm[3] || '']
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        const mName = mm[4];
        const col = ln.indexOf(mName);
        memberSymbols.push({
          name: mName,
          kind: SymbolKind.Variable,
          type: mType,
          location: { line: i, character: Math.max(0, col) },
          scope: '',
        });
        declaredNames.add(mName);
      }
    }
  }

  if (!foundClose) return null;

  const closingLine = lines[endLine].trim();
  const nameMatch = closingLine.match(
    /\}\s*([a-zA-Z_][a-zA-Z0-9_$]*)\s*((?:\[[^\]]*\]\s*)*)\s*;/
  );
  if (!nameMatch) return null;

  const name = nameMatch[1];
  let scopeName: string;

  if (isTypedef) {
    scopeName = name;
    const col = lines[endLine].indexOf(name);
    symbols.push({
      name,
      kind: SymbolKind.Struct,
      type: 'struct',
      location: { line: startLine, character: 0 },
      endLocation: { line: endLine, character: 0 },
      scope: parentScope,
    });
    declaredNames.add(name);
  } else {
    scopeName = `__anon_struct_${name}_${startLine}`;
    symbols.push({
      name: scopeName,
      kind: SymbolKind.Struct,
      type: 'struct',
      location: { line: startLine, character: 0 },
      endLocation: { line: endLine, character: 0 },
      scope: parentScope,
    });
    const col = lines[endLine].indexOf(name);
    symbols.push({
      name,
      kind: SymbolKind.Variable,
      type: scopeName,
      location: { line: endLine, character: Math.max(0, col) },
      scope: parentScope,
    });
    declaredNames.add(name);
  }

  for (const m of memberSymbols) {
    m.scope = scopeName;
    symbols.push(m);
  }

  return { endLine };
}

/**
 * Parse the port list of a module/interface from the parenthesized header.
 * Handles ANSI-style port declarations across multiple lines.
 */
function parsePortList(
  lines: string[],
  startLine: number,
  symbols: SVSymbol[],
  references: SVReference[],
  declaredNames: Set<string>,
  scopeName: string,
  portParsedLines: Set<number>,
): void {
  let parenDepth = 0;
  let foundOpen = false;
  let portText = '';
  let portStartLine = startLine;

  for (let i = startLine; i < lines.length; i++) {
    const ln = lines[i];
    for (let c = 0; c < ln.length; c++) {
      if (ln[c] === '(') {
        if (!foundOpen) {
          foundOpen = true;
          portStartLine = i;
        }
        parenDepth++;
      } else if (ln[c] === ')') {
        parenDepth--;
        if (foundOpen && parenDepth === 0) {
          // Mark all lines within the port list as already parsed
          for (let j = portStartLine; j <= i; j++) {
            portParsedLines.add(j);
          }
          parsePortDeclarations(portText, portStartLine, lines, symbols, declaredNames, scopeName);
          return;
        }
      } else if (foundOpen && parenDepth > 0) {
        portText += ln[c];
      }
    }
    if (foundOpen && parenDepth > 0) {
      portText += '\n';
    }
    if (ln.includes(';') && !foundOpen) {
      return;
    }
  }
}

function parsePortDeclarations(
  portText: string,
  startLine: number,
  allLines: string[],
  symbols: SVSymbol[],
  declaredNames: Set<string>,
  scopeName: string,
): void {
  const parts = portText.split(',');
  let currentDirection = '';
  let currentType = '';
  let lineOffset = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Count newlines in this part for line tracking
    const newlines = (part.match(/\n/g) || []).length;

    const portMatch = trimmed.match(
      /^(input|output|inout)?\s*((?:logic|reg|wire|bit|int|integer|real|signed|unsigned)\s*(?:\[[^\]]*\]\s*)*)?\s*([a-zA-Z_][a-zA-Z0-9_$]*)\s*(?:=\s*[^,]*)?$/
    );

    if (portMatch) {
      if (portMatch[1]) currentDirection = portMatch[1];
      if (portMatch[2] && portMatch[2].trim()) currentType = portMatch[2].trim();
      const portName = portMatch[3];

      const fullType = [currentDirection, currentType].filter(Boolean).join(' ').trim() || 'logic';

      // Find the actual line where this port name appears
      const actualLine = findNameInLines(allLines, portName, startLine);

      symbols.push({
        name: portName,
        kind: SymbolKind.Port,
        type: fullType,
        location: {
          line: actualLine.line,
          character: actualLine.character,
        },
        scope: scopeName,
      });
      declaredNames.add(portName);
    }

    lineOffset += newlines;
  }
}

function findNameInLines(
  lines: string[],
  name: string,
  startLine: number,
): SymbolLocation {
  const nameRe = new RegExp('\\b' + escapeRegex(name) + '\\b');
  for (let i = startLine; i < Math.min(startLine + 50, lines.length); i++) {
    const match = lines[i].match(nameRe);
    if (match && match.index !== undefined) {
      return { line: i, character: match.index };
    }
  }
  return { line: startLine, character: 0 };
}

/**
 * Parse comma-separated variable names from the remainder of a declaration line.
 */
function parseVariableNames(
  rest: string,
  fullType: string,
  kind: SymbolKind,
  lineIdx: number,
  rawLine: string,
  symbols: SVSymbol[],
  references: SVReference[],
  declaredNames: Set<string>,
  scope: string,
): void {
  // Strip trailing semicolons and inline assignments for name extraction
  const cleaned = rest.replace(/;.*$/, '');
  const parts = cleaned.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    // Handle array dimensions after the name, e.g. "data [7:0]"
    const nameMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_$]*)\s*(?:\[[^\]]*\])?\s*(?:=.*)?$/);
    if (nameMatch) {
      const varName = nameMatch[1];
      if (SV_KEYWORDS.has(varName) || SV_TYPES.has(varName)) continue;

      const col = rawLine.indexOf(varName);
      symbols.push({
        name: varName,
        kind,
        type: fullType,
        location: { line: lineIdx, character: Math.max(0, col) },
        scope,
      });
      declaredNames.add(varName);
    }
  }
}

/**
 * Extract identifier references from a line of code.
 * Only records references for identifiers that have been declared.
 */
function extractReferencesFromLine(
  rawLine: string,
  lineIdx: number,
  references: SVReference[],
  declaredNames: Set<string>,
  scope: string,
): void {
  const identRe = /\b([a-zA-Z_][a-zA-Z0-9_$]*)\b/g;
  let match;
  while ((match = identRe.exec(rawLine)) !== null) {
    const name = match[1];
    if (SV_KEYWORDS.has(name) || SV_TYPES.has(name) || SV_STORAGE_MODIFIERS.has(name)) continue;
    if (SV_PORT_DIRECTIONS.has(name)) continue;
    if (name.startsWith('$')) continue;
    if (/^[0-9]/.test(name)) continue;

    if (declaredNames.has(name)) {
      references.push({
        name,
        location: { line: lineIdx, character: match.index },
        scope,
      });
    }
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get the word (identifier) at a specific position in a line.
 */
export function getWordAtPosition(line: string, character: number): string | null {
  if (character < 0 || character >= line.length) return null;

  let start = character;
  let end = character;

  while (start > 0 && /[a-zA-Z0-9_$]/.test(line[start - 1])) start--;
  while (end < line.length && /[a-zA-Z0-9_$]/.test(line[end])) end++;

  const word = line.substring(start, end);
  if (word.length === 0 || /^[0-9]/.test(word)) return null;
  return word;
}

/**
 * If the cursor is on a member in a dot-access expression (e.g. obj.member),
 * return the object name before the dot.
 */
export function getDotContext(line: string, character: number): { objName: string } | null {
  let start = character;
  while (start > 0 && /[a-zA-Z0-9_$]/.test(line[start - 1])) start--;

  if (start <= 0 || line[start - 1] !== '.') return null;

  let objEnd = start - 1;
  let objStart = objEnd;
  while (objStart > 0 && /[a-zA-Z0-9_$]/.test(line[objStart - 1])) objStart--;

  const objName = line.substring(objStart, objEnd);
  if (!objName || /^[0-9]/.test(objName)) return null;
  return { objName };
}
