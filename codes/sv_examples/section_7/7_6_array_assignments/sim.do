# Sim script for 7.6 Array Assignments
vlib work
vlog -sv "7_6_array_assignments.sv"
vsim -voptargs=+acc work.array_assignments_tb
run -all
quit -sim
