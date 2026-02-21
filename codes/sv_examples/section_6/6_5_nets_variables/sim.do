vlib work
vlog -sv 6_5_nets_variables.sv
vsim -c work.top -do "run -all; quit -f"
