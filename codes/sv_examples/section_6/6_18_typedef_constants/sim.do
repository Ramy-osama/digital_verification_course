vlib work
vlog -sv 6_18_typedef_constants.sv
vsim -c work.top -do "run -all; quit -f"
