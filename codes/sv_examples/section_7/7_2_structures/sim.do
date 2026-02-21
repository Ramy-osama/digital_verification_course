# Sim script for 7.2 Structures
vlib work
vlog -sv "7_2_structures.sv"
vsim -voptargs=+acc work.structures_tb
run -all
quit -sim
