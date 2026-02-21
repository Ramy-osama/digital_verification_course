# Master sim_all.do - Compile and run ALL section examples
# Run from: codes/sv_examples/
# Usage:    do sim_all.do   (in QuestaSim transcript)

vlib work

# ===== Section 3: Design Building Blocks =====
echo "====== Section 3: Modules ======"
vlog -sv section_3/3_2_modules/3_2_modules.sv
vsim -c work.top -do "run -all; quit -sim"

echo "====== Section 3: Interfaces ======"
vlog -sv section_3/3_12_interfaces/3_12_interfaces.sv
vsim -c work.top -do "run -all; quit -sim"

echo "====== Section 3: Subroutines ======"
vlog -sv section_3/3_13_subroutines/3_13_subroutines.sv
vsim -c work.top -do "run -all; quit -sim"

echo "====== Section 3: Packages ======"
vlog -sv section_3/3_10_packages/3_10_packages.sv
vsim -c work.top -do "run -all; quit -sim"

echo "====== Section 3: Programs ======"
vlog -sv section_3/3_4_programs/3_4_programs.sv
vsim -c work.top -do "run -all; quit -sim"

echo "====== Section 3: Timeunits ======"
vlog -sv section_3/3_14_timeunits/3_14_timeunits.sv
vsim -c work.top -do "run -all; quit -sim"

# ===== Section 4: Scheduling Semantics =====
echo "====== Section 4: Scheduling ======"
vlog -sv section_4/4_scheduling/4_scheduling.sv
vsim -c work.top -do "run -all; quit -sim"

# ===== Section 5: Lexical Conventions =====
echo "====== Section 5: Number Formats ======"
vlog -sv section_5/5_6_number_formats/5_6_number_formats.sv
vsim -c work.top -do "run -all; quit -sim"

echo "====== Section 5: Operators ======"
vlog -sv section_5/5_11_operators/5_11_operators.sv
vsim -c work.top -do "run -all; quit -sim"

# ===== Section 6: Data Types =====
echo "====== Section 6: Integer Types ======"
vlog -sv section_6/6_4_integer_types/6_4_integer_types.sv
vsim -c work.top -do "run -all; quit -sim"

echo "====== Section 6: Nets & Variables ======"
vlog -sv section_6/6_5_nets_variables/6_5_nets_variables.sv
vsim -c work.top -do "run -all; quit -sim"

echo "====== Section 6: Enumerations ======"
vlog -sv section_6/6_19_enumerations/6_19_enumerations.sv
vsim -c work.top -do "run -all; quit -sim"

echo "====== Section 6: typedef & Constants ======"
vlog -sv section_6/6_18_typedef_constants/6_18_typedef_constants.sv
vsim -c work.top -do "run -all; quit -sim"

echo "====== Section 6: Casting & Scope ======"
vlog -sv section_6/6_24_casting_scope/6_24_casting_scope.sv
vsim -c work.top -do "run -all; quit -sim"

echo "====== Section 6: Parameterized Types ======"
vlog -sv section_6/6_20_parameterized/6_20_parameterized.sv
vsim -c work.top -do "run -all; quit -sim"

# ===== Section 7: run its own sim_all.do =====
echo "====== Section 7: Aggregate Data Types ======"
cd section_7
do sim_all.do
cd ..

echo "====== ALL SECTIONS COMPLETE ======"
quit -f
