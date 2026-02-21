# Sim script for 7.12 Array Manipulation Methods
vlib work
vlog -sv "7_12_array_manipulation_methods.sv"
vsim -voptargs=+acc work.array_manipulation_methods_tb
run -all
quit -sim
