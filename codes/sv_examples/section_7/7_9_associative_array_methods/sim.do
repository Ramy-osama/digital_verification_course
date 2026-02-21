# Sim script for 7.9 Associative Array Methods
vlib work
vlog -sv "7_9_associative_array_methods.sv"
vsim -voptargs=+acc work.associative_array_methods_tb
run -all
quit -sim
