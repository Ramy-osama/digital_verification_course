# SystemVerilog / Verilog LSP Extension

A Language Server Protocol extension for Cursor/VS Code that provides IDE features for SystemVerilog and Verilog files.

## Features

- **Syntax Highlighting** - Full TextMate grammar for SV/Verilog
- **Go to Definition** - Ctrl+Click or F12 on any symbol to jump to its declaration
- **Find All References** - Shift+F12 to find every usage of a symbol
- **Hover Information** - Hover over a symbol to see its type, scope, and declaration line
- **Document Symbols** - Outline view showing all modules, classes, functions, tasks, ports, signals
- **Basic Diagnostics** - Reports unmatched module/class/function/task scope errors
- **Code Completion** - Suggests declared symbols, SV keywords, and type names
- **Bracket Matching** - Matches begin/end, module/endmodule, class/endclass, etc.
- **Code Folding** - Fold/unfold module, class, function, task, begin/end blocks

## Supported Constructs

The parser recognizes:
- Modules, classes, interfaces, packages, programs
- Functions and tasks
- Port declarations (ANSI-style)
- Parameters and localparams
- Variable/signal declarations (logic, reg, wire, bit, int, etc.)
- Constraints, covergroups
- Typedefs
- Storage modifiers (rand, randc, const, static, etc.)

## Quick Start

1. Open this extension folder in Cursor/VS Code
2. Press F5 to launch a debug Extension Host window
3. In the new window, open any `.sv` or `.v` file
4. Test the features:
   - Hover over a signal name
   - Ctrl+Click on a variable to go to its declaration
   - Shift+F12 on a signal to find all references
   - Open the Outline view (Ctrl+Shift+O) to see document symbols

## Development

```bash
npm install         # Install dependencies (root + client + server)
npm run compile     # Build TypeScript
npm run watch       # Watch mode for development
```

## File Extensions

| Extension | Language |
|-----------|----------|
| `.sv`     | SystemVerilog |
| `.svh`    | SystemVerilog |
| `.svi`    | SystemVerilog |
| `.v`      | Verilog |
| `.vh`     | Verilog |
| `.vl`     | Verilog |
