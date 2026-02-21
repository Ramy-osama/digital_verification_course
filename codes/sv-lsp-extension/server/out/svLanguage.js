"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCOPE_CLOSE_KEYWORDS = exports.SCOPE_OPEN_KEYWORDS = exports.ScopeKind = exports.SV_STORAGE_MODIFIERS = exports.SV_DECLARATION_TYPES = exports.SV_PORT_DIRECTIONS = exports.SV_TYPES = exports.SV_KEYWORDS = void 0;
exports.SV_KEYWORDS = new Set([
    'module', 'endmodule', 'class', 'endclass', 'function', 'endfunction',
    'task', 'endtask', 'begin', 'end', 'fork', 'join', 'join_any', 'join_none',
    'generate', 'endgenerate', 'interface', 'endinterface', 'package', 'endpackage',
    'program', 'endprogram', 'clocking', 'endclocking', 'covergroup', 'endgroup',
    'always', 'always_ff', 'always_comb', 'always_latch', 'initial', 'final',
    'assign', 'deassign', 'if', 'else', 'for', 'foreach', 'while', 'do',
    'repeat', 'forever', 'return', 'break', 'continue', 'case', 'casex', 'casez',
    'default', 'unique', 'unique0', 'priority', 'inside', 'matches', 'dist',
    'with', 'solve', 'before', 'wait', 'wait_order', 'disable', 'force',
    'release', 'assert', 'assume', 'cover', 'expect', 'posedge', 'negedge',
    'edge', 'or', 'and', 'not', 'import', 'export', 'typedef', 'extends',
    'implements', 'new', 'null', 'this', 'super', 'virtual', 'pure',
    'extern', 'static', 'automatic', 'local', 'protected', 'rand', 'randc',
    'constraint', 'coverpoint', 'cross', 'bins', 'illegal_bins', 'ignore_bins',
    'wildcard', 'sequence', 'property', 'endsequence', 'endproperty',
    'modport', 'parameter', 'localparam', 'defparam', 'specparam', 'type',
    'input', 'output', 'inout', 'ref', 'var',
]);
exports.SV_TYPES = new Set([
    'logic', 'reg', 'wire', 'integer', 'real', 'realtime', 'time',
    'shortint', 'int', 'longint', 'byte', 'bit', 'shortreal', 'string',
    'chandle', 'event', 'void', 'genvar', 'tri', 'tri0', 'tri1',
    'triand', 'trior', 'trireg', 'wand', 'wor', 'supply0', 'supply1',
    'enum', 'struct', 'union', 'packed', 'unsigned', 'signed',
]);
exports.SV_PORT_DIRECTIONS = new Set([
    'input', 'output', 'inout',
]);
exports.SV_DECLARATION_TYPES = new Set([
    ...exports.SV_TYPES,
    ...exports.SV_PORT_DIRECTIONS,
]);
exports.SV_STORAGE_MODIFIERS = new Set([
    'rand', 'randc', 'const', 'static', 'automatic', 'local', 'protected',
    'extern', 'pure', 'virtual', 'ref', 'var', 'interconnect', 'soft',
]);
var ScopeKind;
(function (ScopeKind) {
    ScopeKind["Module"] = "module";
    ScopeKind["Class"] = "class";
    ScopeKind["Function"] = "function";
    ScopeKind["Task"] = "task";
    ScopeKind["Interface"] = "interface";
    ScopeKind["Package"] = "package";
    ScopeKind["Program"] = "program";
    ScopeKind["Begin"] = "begin";
    ScopeKind["Generate"] = "generate";
    ScopeKind["Covergroup"] = "covergroup";
})(ScopeKind || (exports.ScopeKind = ScopeKind = {}));
exports.SCOPE_OPEN_KEYWORDS = {
    'module': ScopeKind.Module,
    'macromodule': ScopeKind.Module,
    'class': ScopeKind.Class,
    'function': ScopeKind.Function,
    'task': ScopeKind.Task,
    'interface': ScopeKind.Interface,
    'package': ScopeKind.Package,
    'program': ScopeKind.Program,
    'generate': ScopeKind.Generate,
    'covergroup': ScopeKind.Covergroup,
};
exports.SCOPE_CLOSE_KEYWORDS = new Set([
    'endmodule', 'endclass', 'endfunction', 'endtask',
    'endinterface', 'endpackage', 'endprogram', 'endgenerate', 'endgroup',
]);
//# sourceMappingURL=svLanguage.js.map