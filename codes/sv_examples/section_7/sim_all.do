# Master simulation script - runs all Section 7 examples sequentially
# Usage: do sim_all.do

set base_dir [pwd]

proc run_example {dir sv_file module_name} {
    global base_dir
    puts "========================================================================"
    puts "  Running: $sv_file"
    puts "========================================================================"
    cd "$base_dir/$dir"
    vlib work
    vlog -sv "$sv_file"
    vsim -voptargs=+acc -c "work.$module_name" -do "run -all; quit -sim"
    cd $base_dir
    puts ""
}

run_example "7_2_structures"                "7_2_structures.sv"                "structures_tb"
run_example "7_3_unions"                    "7_3_unions.sv"                    "unions_tb"
run_example "7_4_packed_unpacked_arrays"    "7_4_packed_unpacked_arrays.sv"    "packed_unpacked_arrays_tb"
run_example "7_5_dynamic_arrays"            "7_5_dynamic_arrays.sv"            "dynamic_arrays_tb"
run_example "7_6_array_assignments"         "7_6_array_assignments.sv"         "array_assignments_tb"
run_example "7_7_arrays_as_arguments"       "7_7_arrays_as_arguments.sv"       "arrays_as_arguments_tb"
run_example "7_8_associative_arrays"        "7_8_associative_arrays.sv"        "associative_arrays_tb"
run_example "7_9_associative_array_methods" "7_9_associative_array_methods.sv" "associative_array_methods_tb"
run_example "7_10_queues"                   "7_10_queues.sv"                   "queues_tb"
run_example "7_12_array_manipulation_methods" "7_12_array_manipulation_methods.sv" "array_manipulation_methods_tb"

puts "========================================================================"
puts "  All Section 7 examples completed!"
puts "========================================================================"
