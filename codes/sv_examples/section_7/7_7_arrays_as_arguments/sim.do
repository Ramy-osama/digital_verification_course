# Sim script for 7.7 Arrays as Arguments
vlib work
vlog -sv "7_7_arrays_as_arguments.sv"
vsim -voptargs=+acc work.arrays_as_arguments_tb
run -all
quit -sim
