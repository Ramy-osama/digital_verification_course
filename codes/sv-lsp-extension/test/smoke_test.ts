import * as fs from 'fs';
import * as path from 'path';
import { parseDocument, getWordAtPosition } from '../server/src/parser';
import { SymbolTable } from '../server/src/symbolTable';

const testFiles = [
  path.resolve(__dirname, '../../coverage/rtl/alu.sv'),
  path.resolve(__dirname, '../../classes/address_alligned.sv'),
  path.resolve(__dirname, '../../power_aware_sim/rtl/data_processor.sv'),
  path.resolve(__dirname, '../test/testFiles/test_all_features.sv'),
];

const st = new SymbolTable();
let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  PASS: ${msg}`);
    passed++;
  } else {
    console.log(`  FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== SystemVerilog LSP Parser Smoke Test ===\n');

for (const filePath of testFiles) {
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${filePath} (not found)`);
    continue;
  }
  const text = fs.readFileSync(filePath, 'utf-8');
  const result = parseDocument(text);
  const uri = 'file:///' + filePath.replace(/\\/g, '/');
  st.updateDocument(uri, text);

  console.log(`\n--- ${path.basename(filePath)} ---`);
  console.log(`  Symbols found: ${result.symbols.length}`);
  console.log(`  References found: ${result.references.length}`);

  for (const sym of result.symbols) {
    console.log(`    [${sym.kind}] ${sym.name} : ${sym.type} (line ${sym.location.line + 1}, scope: ${sym.scope || 'global'})`);
  }
}

// Specific assertions on alu.sv
console.log('\n--- Assertions on alu.sv ---');
const aluPath = testFiles[0];
if (fs.existsSync(aluPath)) {
  const aluText = fs.readFileSync(aluPath, 'utf-8');
  const aluResult = parseDocument(aluText);
  const aluUri = 'file:///' + aluPath.replace(/\\/g, '/');

  const moduleSym = aluResult.symbols.find(s => s.name === 'alu' && s.kind === 'module');
  assert(!!moduleSym, 'Found module "alu"');

  const portA = aluResult.symbols.find(s => s.name === 'a' && s.kind === 'port');
  assert(!!portA, 'Found port "a"');

  const portResult = aluResult.symbols.find(s => s.name === 'result' && s.kind === 'port');
  assert(!!portResult, 'Found port "result"');

  const aluWide = aluResult.symbols.find(s => s.name === 'alu_wide' && s.kind === 'variable');
  assert(!!aluWide, 'Found variable "alu_wide"');
  if (aluWide) {
    assert(aluWide.type.includes('logic'), '"alu_wide" type includes "logic"');
  }

  // Test hover
  const hover = st.getHoverInfo(aluUri, aluWide?.location.line ?? 0, aluWide?.location.character ?? 0);
  assert(!!hover && hover.includes('alu_wide'), 'Hover on "alu_wide" returns info');

  // Test go-to-definition
  const resultRefs = aluResult.references.filter(r => r.name === 'result');
  assert(resultRefs.length > 0, '"result" has references');

  const def = st.findDefinition(aluUri, resultRefs[0]?.location.line ?? 0, resultRefs[0]?.location.character ?? 0);
  assert(!!def, 'Go-to-definition finds "result" declaration');
}

// Assertions on address_alligned.sv
console.log('\n--- Assertions on address_alligned.sv ---');
const addrPath = testFiles[1];
if (fs.existsSync(addrPath)) {
  const addrText = fs.readFileSync(addrPath, 'utf-8');
  const addrResult = parseDocument(addrText);

  const classSym = addrResult.symbols.find(s => s.name === 'address_alligned' && s.kind === 'class');
  assert(!!classSym, 'Found class "address_alligned"');

  const addrVar = addrResult.symbols.find(s => s.name === 'addr' && s.kind === 'variable');
  assert(!!addrVar, 'Found rand variable "addr"');

  const constraint = addrResult.symbols.find(s => s.kind === 'constraint');
  assert(!!constraint, 'Found at least one constraint');

  const moduleTb = addrResult.symbols.find(s => s.name === 'address_alligned_tb' && s.kind === 'module');
  assert(!!moduleTb, 'Found module "address_alligned_tb"');
}

// getWordAtPosition tests
console.log('\n--- getWordAtPosition tests ---');
assert(getWordAtPosition('  logic [7:0] data_out;', 16) === 'data_out', 'getWordAtPosition finds "data_out"');
assert(getWordAtPosition('  assign result = alu_wide[7:0];', 9) === 'result', 'getWordAtPosition finds "result"');
assert(getWordAtPosition('', 0) === null, 'getWordAtPosition returns null for empty line');

// Class hierarchy tests
console.log('\n--- Class hierarchy tests ---');
const hierarchyPath = path.resolve(__dirname, '../test/testFiles/test_hierarchy.sv');
if (fs.existsSync(hierarchyPath)) {
  const hText = fs.readFileSync(hierarchyPath, 'utf-8');
  const hResult = parseDocument(hText);
  const hUri = 'file:///' + hierarchyPath.replace(/\\/g, '/');
  st.updateDocument(hUri, hText);

  // Check extends parsing
  const baseTxn = hResult.symbols.find(s => s.name === 'base_transaction' && s.kind === 'class');
  assert(!!baseTxn, 'Found class "base_transaction"');
  assert(baseTxn?.extends === 'uvm_object', 'base_transaction extends uvm_object');

  const readTxn = hResult.symbols.find(s => s.name === 'read_transaction' && s.kind === 'class');
  assert(!!readTxn, 'Found class "read_transaction"');
  assert(readTxn?.extends === 'base_transaction', 'read_transaction extends base_transaction');

  const writeTxn = hResult.symbols.find(s => s.name === 'write_transaction' && s.kind === 'class');
  assert(!!writeTxn, 'Found class "write_transaction"');
  assert(writeTxn?.extends === 'base_transaction', 'write_transaction extends base_transaction');

  const burstTxn = hResult.symbols.find(s => s.name === 'burst_write_transaction' && s.kind === 'class');
  assert(!!burstTxn, 'Found class "burst_write_transaction"');
  assert(burstTxn?.extends === 'write_transaction', 'burst_write_transaction extends write_transaction');

  const uvmObj = hResult.symbols.find(s => s.name === 'uvm_object' && s.kind === 'class');
  assert(!!uvmObj, 'Found root class "uvm_object"');
  assert(!uvmObj?.extends, 'uvm_object has no parent (root)');

  // Test full hierarchy
  const hierarchy = st.getClassHierarchy('burst_write_transaction');
  assert(!!hierarchy, 'getClassHierarchy returns a tree');
  assert(hierarchy?.name === 'uvm_object', 'Hierarchy root is uvm_object');
  assert(hierarchy?.children.length === 1, 'uvm_object has 1 child');
  assert(hierarchy?.children[0]?.name === 'base_transaction', 'Child is base_transaction');
  assert(hierarchy?.children[0]?.children.length === 3, 'base_transaction has 3 children (read, write, macro)');

  const writeChild = hierarchy?.children[0]?.children.find((c: any) => c.name === 'write_transaction');
  assert(!!writeChild, 'write_transaction found in hierarchy');
  assert(writeChild?.children.length === 2, 'write_transaction has 2 children (burst, macro_burst)');
  assert(writeChild?.children[0]?.name === 'burst_write_transaction', 'burst child is burst_write_transaction');

  console.log('\n  Hierarchy tree:');
  function printTree(node: any, indent: string = '  ') {
    console.log(`${indent}${node.name}${node.children.length > 0 ? '' : ' (leaf)'}`);
    for (const child of node.children) {
      printTree(child, indent + '  ');
    }
  }
  if (hierarchy) printTree(hierarchy);

  // --- Macro-based extends tests ---
  console.log('\n--- Macro-based extends tests ---');

  // Verify define collection
  assert(hResult.defines.get('MACRO_BASE') === 'base_transaction', '`define MACRO_BASE resolved to base_transaction');
  assert(hResult.defines.get('MACRO_WRITE') === 'write_transaction', '`define MACRO_WRITE resolved to write_transaction');

  // Verify macro_transaction extends resolves through the macro
  const macroTxn = hResult.symbols.find(s => s.name === 'macro_transaction' && s.kind === 'class');
  assert(!!macroTxn, 'Found class "macro_transaction"');
  assert(macroTxn?.extends === 'base_transaction', 'macro_transaction extends base_transaction (resolved from `MACRO_BASE)');

  // Verify macro_burst extends resolves through the macro
  const macroBurst = hResult.symbols.find(s => s.name === 'macro_burst' && s.kind === 'class');
  assert(!!macroBurst, 'Found class "macro_burst"');
  assert(macroBurst?.extends === 'write_transaction', 'macro_burst extends write_transaction (resolved from `MACRO_WRITE)');

  // Verify hierarchy includes macro-resolved classes
  const macroHierarchy = st.getClassHierarchy('macro_transaction');
  assert(!!macroHierarchy, 'getClassHierarchy returns a tree for macro_transaction');
  assert(macroHierarchy?.name === 'uvm_object', 'macro_transaction hierarchy root is uvm_object');

  // macro_transaction should appear as a child of base_transaction
  const baseTxnNode = macroHierarchy?.children[0];
  assert(baseTxnNode?.name === 'base_transaction', 'base_transaction is child of uvm_object');
  const macroChild = baseTxnNode?.children.find((c: any) => c.name === 'macro_transaction');
  assert(!!macroChild, 'macro_transaction appears in base_transaction children');

  // macro_burst should appear as a child of write_transaction
  const writeTxnNode = baseTxnNode?.children.find((c: any) => c.name === 'write_transaction');
  const macroBurstChild = writeTxnNode?.children.find((c: any) => c.name === 'macro_burst');
  assert(!!macroBurstChild, 'macro_burst appears in write_transaction children');

  console.log('\n  Full hierarchy with macros:');
  if (macroHierarchy) printTree(macroHierarchy);
}

// --- Import / include / package tests ---
console.log('\n--- Import, include, and package tests ---');
const pkgPath = path.resolve(__dirname, '../test/testFiles/test_pkg.sv');
const importPath = path.resolve(__dirname, '../test/testFiles/test_import.sv');
if (fs.existsSync(pkgPath) && fs.existsSync(importPath)) {
  const pkgText = fs.readFileSync(pkgPath, 'utf-8');
  const pkgResult = parseDocument(pkgText);
  const pkgUri = 'file:///' + pkgPath.replace(/\\/g, '/');
  st.updateDocument(pkgUri, pkgText);

  const impText = fs.readFileSync(importPath, 'utf-8');
  const impResult = parseDocument(impText);
  const impUri = 'file:///' + importPath.replace(/\\/g, '/');
  st.updateDocument(impUri, impText);

  // Package parsing
  const pkgSym = pkgResult.symbols.find(s => s.name === 'my_pkg' && s.kind === 'package');
  assert(!!pkgSym, 'Found package "my_pkg"');

  const baseItem = pkgResult.symbols.find(s => s.name === 'base_item' && s.kind === 'class');
  assert(!!baseItem, 'Found class "base_item" in package');
  assert(baseItem?.scope === 'my_pkg', 'base_item scope is my_pkg');

  const specialItem = pkgResult.symbols.find(s => s.name === 'special_item' && s.kind === 'class');
  assert(!!specialItem, 'Found class "special_item" in package');
  assert(specialItem?.extends === 'base_item', 'special_item extends base_item');

  // Import parsing
  assert(impResult.imports.length >= 1, 'test_import.sv has at least 1 import');
  const wildcardImport = impResult.imports.find(i => i.packageName === 'my_pkg' && i.symbol === '*');
  assert(!!wildcardImport, 'Found wildcard import of my_pkg');

  // Include parsing
  assert(impResult.includes.length >= 1, 'test_import.sv has at least 1 include');
  assert(impResult.includes[0] === 'test_pkg.sv', 'Include captures "test_pkg.sv"');

  // Class-type variable declarations
  const biVar = impResult.symbols.find(s => s.name === 'bi' && s.kind === 'variable');
  assert(!!biVar, 'Found class-type variable "bi"');
  assert(biVar?.type === 'base_item', '"bi" has type "base_item"');

  const siVar = impResult.symbols.find(s => s.name === 'si' && s.kind === 'variable');
  assert(!!siVar, 'Found class-type variable "si"');
  assert(siVar?.type === 'special_item', '"si" has type "special_item"');

  // --- getClassMembers tests ---
  console.log('\n--- getClassMembers tests ---');

  const baseMembers = st.getClassMembers('base_item');
  const baseMemberNames = baseMembers.map(m => m.name);
  assert(baseMemberNames.includes('data'), 'base_item has member "data"');
  assert(baseMemberNames.includes('id'), 'base_item has member "id"');
  assert(baseMemberNames.includes('display'), 'base_item has member "display"');
  assert(baseMemberNames.includes('data_c'), 'base_item has constraint "data_c"');

  const specialMembers = st.getClassMembers('special_item');
  const specialMemberNames = specialMembers.map(m => m.name);
  assert(specialMemberNames.includes('addr'), 'special_item has own member "addr"');
  assert(specialMemberNames.includes('show_addr'), 'special_item has own method "show_addr"');
  assert(specialMemberNames.includes('data'), 'special_item inherits "data" from base_item');
  assert(specialMemberNames.includes('id'), 'special_item inherits "id" from base_item');
  assert(specialMemberNames.includes('display'), 'special_item inherits "display" from base_item');

  // --- resolveVariableType tests ---
  console.log('\n--- resolveVariableType tests ---');

  const biType = st.resolveVariableType(impUri, 'bi', biVar?.location.line ?? 0);
  assert(biType === 'base_item', 'resolveVariableType("bi") returns "base_item"');

  const siType = st.resolveVariableType(impUri, 'si', siVar?.location.line ?? 0);
  assert(siType === 'special_item', 'resolveVariableType("si") returns "special_item"');

  // --- isSymbolVisibleFrom tests ---
  console.log('\n--- isSymbolVisibleFrom tests ---');

  const baseVisibleFromPkg = st.isSymbolVisibleFrom('base_item', pkgUri);
  assert(baseVisibleFromPkg, 'base_item is visible from test_pkg.sv (same file)');

  const baseVisibleFromImport = st.isSymbolVisibleFrom('base_item', impUri);
  assert(baseVisibleFromImport, 'base_item is visible from test_import.sv (via import my_pkg::*)');

  // findSymbolAnywhere
  const foundAnywhere = st.findSymbolAnywhere('base_item');
  assert(!!foundAnywhere, 'findSymbolAnywhere finds "base_item"');
  assert(foundAnywhere?.sym.kind === 'class', 'findSymbolAnywhere returns class symbol');
}

// --- getDependencyChain tests ---
console.log('\n--- getDependencyChain tests ---');

const aluTbPath = path.resolve(__dirname, '../../coverage/tb/alu_tb.sv');
const aluRtlPath = path.resolve(__dirname, '../../coverage/rtl/alu.sv');
if (fs.existsSync(aluTbPath) && fs.existsSync(aluRtlPath)) {
  const aluTbText = fs.readFileSync(aluTbPath, 'utf-8');
  const aluTbUri = 'file:///' + aluTbPath.replace(/\\/g, '/');
  st.updateDocument(aluTbUri, aluTbText);

  const aluRtlText = fs.readFileSync(aluRtlPath, 'utf-8');
  const aluRtlUri = 'file:///' + aluRtlPath.replace(/\\/g, '/');
  st.updateDocument(aluRtlUri, aluRtlText);

  const chain = st.getDependencyChain(aluTbUri);
  assert(!!chain, 'getDependencyChain returns a result for alu_tb.sv');
  assert(chain?.topModule === 'alu_tb', 'Top module is "alu_tb"');
  assert(chain!.files.length >= 2, 'Dependency chain has at least 2 files (alu.sv + alu_tb.sv)');

  const uris = chain!.files.map(f => f.uri);
  const aluIdx = uris.findIndex(u => u.includes('alu.sv') && !u.includes('alu_tb'));
  const tbIdx = uris.findIndex(u => u.includes('alu_tb.sv'));
  assert(aluIdx >= 0, 'alu.sv is in the dependency chain');
  assert(tbIdx >= 0, 'alu_tb.sv is in the dependency chain');
  assert(aluIdx < tbIdx, 'alu.sv appears before alu_tb.sv (topological order)');

  assert(chain!.includeDirs.length === 0, 'alu_tb has no include directories (no `include used)');

  console.log('  Dependency chain for alu_tb.sv:');
  for (const f of chain!.files) {
    console.log(`    ${f.uri}`);
  }
}

// Self-contained file: should only list itself
const selfContainedPath = path.resolve(__dirname, '../../classes/address_alligned.sv');
if (fs.existsSync(selfContainedPath)) {
  const selfText = fs.readFileSync(selfContainedPath, 'utf-8');
  const selfUri = 'file:///' + selfContainedPath.replace(/\\/g, '/');
  st.updateDocument(selfUri, selfText);

  const selfChain = st.getDependencyChain(selfUri);
  assert(!!selfChain, 'getDependencyChain returns a result for address_alligned.sv');
  assert(selfChain!.files.length === 1, 'Self-contained file has exactly 1 entry (itself)');
  assert(selfChain!.files[0].uri === selfUri, 'The single entry is itself');
}

// --- Package with `include tests (test_hier) ---
console.log('\n--- Package with include tests (test_hier) ---');

const hierBase = path.resolve(__dirname, '../../test_hier');
const class1Path = path.join(hierBase, 'classes', 'class1.sv');
const class2Path = path.join(hierBase, 'classes', 'class2.sv');
const classPkgPath = path.join(hierBase, 'pkgs', 'class_pkg.sv');
const hierTbPath = path.join(hierBase, 'tb', 'tb.sv');

if ([class1Path, class2Path, classPkgPath, hierTbPath].every(p => fs.existsSync(p))) {
  for (const p of [class1Path, class2Path, classPkgPath, hierTbPath]) {
    const text = fs.readFileSync(p, 'utf-8');
    const uri = 'file:///' + p.replace(/\\/g, '/');
    st.updateDocument(uri, text);
  }

  const tbUri = 'file:///' + hierTbPath.replace(/\\/g, '/');
  const hierChain = st.getDependencyChain(tbUri);
  assert(!!hierChain, 'getDependencyChain returns a result for test_hier/tb/tb.sv');
  assert(hierChain?.topModule === 'tb', 'Top module is "tb"');

  const compileUris = hierChain!.files.map(f => f.uri);

  const hasClass1 = compileUris.some(u => u.includes('class1.sv'));
  const hasClass2 = compileUris.some(u => u.includes('class2.sv'));
  assert(!hasClass1, 'class1.sv is NOT in compile list (it is `included by package)');
  assert(!hasClass2, 'class2.sv is NOT in compile list (it is `included by package)');

  const hasPkg = compileUris.some(u => u.includes('class_pkg.sv'));
  const hasTb = compileUris.some(u => u.includes('tb.sv'));
  assert(hasPkg, 'class_pkg.sv IS in compile list');
  assert(hasTb, 'tb.sv IS in compile list');

  const pkgIdx = compileUris.findIndex(u => u.includes('class_pkg.sv'));
  const tbIdx2 = compileUris.findIndex(u => u.includes('tb.sv') && !u.includes('class_pkg'));
  assert(pkgIdx < tbIdx2, 'class_pkg.sv appears before tb.sv (topological order)');

  assert(hierChain!.includeDirs.length >= 1, 'At least 1 include directory collected');
  const classesDir = hierChain!.includeDirs.find(d => d.includes('classes'));
  assert(!!classesDir, 'Include directory points to classes/ folder');

  console.log('  Compile files for test_hier/tb/tb.sv:');
  for (const f of hierChain!.files) {
    console.log(`    ${f.uri}`);
  }
  console.log('  Include directories:');
  for (const d of hierChain!.includeDirs) {
    console.log(`    ${d}`);
  }
} else {
  console.log('  SKIP: test_hier files not found');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
