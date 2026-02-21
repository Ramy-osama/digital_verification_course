# Sim script for 7.8 Associative Arrays
vlib work
vlog -sv "7_8_associative_arrays.sv"
vsim -voptargs=+acc work.associative_arrays_tb
run -all
quit -sim
