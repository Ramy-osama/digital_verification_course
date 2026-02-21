# Sim script for 7.3 Unions
vlib work
vlog -sv "7_3_unions.sv"
vsim -voptargs=+acc work.unions_tb
run -all
quit -sim
