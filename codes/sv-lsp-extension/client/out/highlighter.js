"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenize = tokenize;
exports.toHtml = toHtml;
const SV_KEYWORDS = new Set([
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
    'input', 'output', 'inout', 'ref', 'var', 'void',
]);
const SV_TYPES = new Set([
    'logic', 'reg', 'wire', 'integer', 'real', 'realtime', 'time',
    'shortint', 'int', 'longint', 'byte', 'bit', 'shortreal', 'string',
    'chandle', 'event', 'genvar', 'tri', 'tri0', 'tri1',
    'triand', 'trior', 'trireg', 'wand', 'wor', 'supply0', 'supply1',
    'enum', 'struct', 'union', 'packed', 'unsigned', 'signed',
]);
const THEMES = {
    dark: {
        keyword: '#569CD6',
        type: '#4EC9B0',
        string: '#CE9178',
        comment: '#6A9955',
        number: '#B5CEA8',
        directive: '#C586C0',
        systemTask: '#DCDCAA',
        macro: '#C586C0',
        operator: '#D4D4D4',
        default: '#D4D4D4',
    },
    light: {
        keyword: '#0000FF',
        type: '#267F99',
        string: '#A31515',
        comment: '#008000',
        number: '#098658',
        directive: '#AF00DB',
        systemTask: '#795E26',
        macro: '#AF00DB',
        operator: '#000000',
        default: '#000000',
    },
};
const BACKGROUNDS = {
    dark: '#1E1E1E',
    light: '#FFFFFF',
};
const RULES = [
    { regex: /\/\/[^\n]*/, type: 'comment' },
    { regex: /\/\*[\s\S]*?\*\//, type: 'comment' },
    { regex: /"(?:[^"\\]|\\.)*"/, type: 'string' },
    { regex: /\d+'[sS]?[bBoOdDhH][0-9a-fA-F_xXzZ?]+/, type: 'number' },
    { regex: /'[bBoOdDhH][0-9a-fA-F_xXzZ?]+/, type: 'number' },
    { regex: /\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?(?:s|ms|us|ns|ps|fs)?/, type: 'number' },
    { regex: /\$[a-zA-Z_][a-zA-Z0-9_$]*/, type: 'systemTask' },
    { regex: /`[a-zA-Z_][a-zA-Z0-9_]*/, type: 'directive' },
    { regex: /[a-zA-Z_][a-zA-Z0-9_$]*/, type: 'default' },
    { regex: /[<>=!]=?=?|&&|\|\||[&|^~!<>+\-*/%#@]/, type: 'operator' },
    { regex: /\S/, type: 'default' },
];
const COMBINED_RE = new RegExp(RULES.map((r, i) => `(${r.regex.source})`).join('|'), 'gm');
function tokenize(code) {
    const tokens = [];
    let lastIndex = 0;
    COMBINED_RE.lastIndex = 0;
    let m;
    while ((m = COMBINED_RE.exec(code)) !== null) {
        if (m.index > lastIndex) {
            tokens.push({ type: 'default', text: code.slice(lastIndex, m.index) });
        }
        const matched = m[0];
        let type = 'default';
        for (let i = 0; i < RULES.length; i++) {
            if (m[i + 1] !== undefined) {
                type = RULES[i].type;
                break;
            }
        }
        if (type === 'default' && /^[a-zA-Z_]/.test(matched)) {
            if (SV_TYPES.has(matched)) {
                type = 'type';
            }
            else if (SV_KEYWORDS.has(matched)) {
                type = 'keyword';
            }
        }
        if (type === 'directive') {
            const name = matched.slice(1);
            const directiveKeywords = new Set([
                'define', 'undef', 'ifdef', 'ifndef', 'else', 'elsif', 'endif',
                'include', 'timescale', 'resetall', 'celldefine', 'endcelldefine',
                'default_nettype', 'pragma', 'line',
            ]);
            if (!directiveKeywords.has(name)) {
                type = 'macro';
            }
        }
        tokens.push({ type, text: matched });
        lastIndex = m.index + matched.length;
    }
    if (lastIndex < code.length) {
        tokens.push({ type: 'default', text: code.slice(lastIndex) });
    }
    return tokens;
}
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/ /g, '&nbsp;')
        .replace(/\n/g, '<br>');
}
function toHtml(tokens, theme, fontFamily, fontSize) {
    const colors = THEMES[theme];
    const spans = tokens.map(t => {
        const color = colors[t.type];
        const escaped = escapeHtml(t.text);
        if (t.type === 'default' && color === colors.default) {
            return escaped;
        }
        return `<span style="color:${color}">${escaped}</span>`;
    }).join('');
    return `<pre style="font-family:${escapeHtml(fontFamily)};font-size:${fontSize}px;`
        + `background:${BACKGROUNDS[theme]};color:${colors.default};`
        + `padding:16px;border-radius:6px;margin:0;white-space:pre;overflow-x:auto;`
        + `line-height:1.5"><code>${spans}</code></pre>`;
}
//# sourceMappingURL=highlighter.js.map