# Sim script for 7.10 Queues
vlib work
vlog -sv "7_10_queues.sv"
vsim -voptargs=+acc work.queues_tb
run -all
quit -sim
