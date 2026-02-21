vlib work
vlog -sv 3_2_modules.sv
vsim -c work.top -do "run -all; quit -f"
