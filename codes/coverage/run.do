#=============================================================================
# QuestaSim Coverage Demonstration - Run Script (GUI Mode)
#
# Usage (launch QuestaSim GUI first, then in the transcript):
#   cd {C:/Users/Ramy/Desktop/Digital design verification course/codes/coverage}
#   do run.do
#
# Or launch directly from a terminal:
#   vsim -do run.do
#
# The GUI will stay open after simulation so you can explore:
#   - Coverage results in the built-in coverage viewer
#   - Annotated source code with hit counts
#   - Cross coverage matrices
#   - HTML report in cov_html_report/index.html
#=============================================================================

# --- Step 1: Create work library ---
puts "============================================"
puts " Step 1: Creating work library"
puts "============================================"
if {[file exists work]} {
    vdel -lib work -all
}
vlib work

# --- Step 2: Compile with coverage instrumentation ---
# Flags: b=branch, c=condition, s=statement, t=toggle, f=FSM
puts "\n============================================"
puts " Step 2: Compiling RTL and Testbench"
puts "============================================"
vlog -cover bcstf +acc rtl/alu.sv tb/alu_tb.sv

# --- Step 3: Load design and enable coverage ---
puts "\n============================================"
puts " Step 3: Loading simulation with coverage"
puts "============================================"
vsim -coverage -voptargs="+cover=bcstf" work.alu_tb -onfinish stop

# --- Step 4: Log all signals recursively and add to waveform ---
puts "\n============================================"
puts " Step 4: Logging all signals for waveform"
puts "============================================"
log -r /*
#add wave -r /*

# --- Step 5: Run the simulation ---
puts "\n============================================"
puts " Step 5: Running simulation"
puts "============================================"
run -all

# --- Step 6: Save coverage database ---
puts "\n============================================"
puts " Step 6: Saving coverage database (UCDB)"
puts "============================================"
coverage save coverage.ucdb

# --- Step 7: Generate HTML report (while simulation is still loaded) ---
puts "\n============================================"
puts " Step 7: Generating HTML coverage report"
puts "============================================"
vcover report -html -htmldir cov_html_report -verbose -source -details coverage.ucdb

# --- Step 8: Open the coverage viewer inside the GUI ---
puts "\n============================================"
puts " Step 8: Opening coverage data in GUI viewer"
puts "============================================"
coverage open coverage.ucdb

puts "\n============================================"
puts " DONE! Simulation complete - GUI stays open."
puts ""
puts " Coverage artifacts on disk:"
puts "   - coverage.ucdb          (database)"
puts "   - cov_html_report/       (open index.html in browser)"
puts ""
puts " Inside the GUI you can now:"
puts "   - View > Coverage  to see covergroups/coverpoints"
puts "   - Right-click a coverpoint for bin details"
puts "   - Click on source files for annotated hit counts"
puts "============================================"
