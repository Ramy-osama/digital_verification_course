# Sim script for 7.5 Dynamic Arrays
vlib work
vlog -sv "7_5_dynamic_arrays.sv"
vsim -voptargs=+acc work.dynamic_arrays_tb
run -all
quit -sim
