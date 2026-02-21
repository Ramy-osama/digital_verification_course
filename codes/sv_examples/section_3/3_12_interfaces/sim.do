vlib work
vlog -sv 3_12_interfaces.sv
vsim -c work.top -do "run -all; quit -f"
