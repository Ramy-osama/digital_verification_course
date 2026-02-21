# Sim script for 7.4 Packed and Unpacked Arrays
vlib work
vlog -sv "7_4_packed_unpacked_arrays.sv"
vsim -voptargs=+acc work.packed_unpacked_arrays_tb
run -all
quit -sim
