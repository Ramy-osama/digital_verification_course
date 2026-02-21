vlib work
vlog -sv 3_10_packages.sv
vsim -c work.top -do "run -all; quit -f"
