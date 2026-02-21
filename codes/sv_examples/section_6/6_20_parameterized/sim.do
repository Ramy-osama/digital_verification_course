vlib work
vlog -sv 6_20_parameterized.sv
vsim -c work.top -do "run -all; quit -f"
