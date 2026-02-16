#=============================================================================
# QuestaSim Power-Aware Simulation - Run Script (GUI Mode)
#
# Description:
#   Demonstrates power-aware (PA) simulation using UPF with two domains:
#     - PD_AON    : Always-on domain (top-level + always_on_ctrl)
#     - PD_GATED  : Power-gated domain (data_processor)
#
# Usage (launch QuestaSim GUI first, then in the transcript):
#   cd {C:/Users/Ramy/Desktop/Digital design verification course/codes/power_aware_sim}
#   do run.do
#
# Or launch directly from a terminal:
#   vsim -do run.do
#
# What This Script Does:
#   1. Maps a drive letter to work around spaces in directory paths
#   2. Compiles RTL and testbench
#   3. Optimizes with UPF power intent (vopt -pa_upf)
#   4. Loads simulation in PA mode
#   5. Sets up waveform viewing including power signals
#   6. Runs all 4 phases (supply control from testbench via UPF package)
#
# Power-Aware Simulation Flow:
#
#   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
#   │ Phase 1  │───►│ Phase 2  │───►│ Phase 3  │───►│ Phase 4  │
#   │ Both ON  │    │ Gated OFF│    │ Power Up │    │ Resume   │
#   │          │    │          │    │          │    │          │
#   │ Normal   │    │supply_off│    │supply_on │    │ Normal   │
#   │ operation│    │ isolate  │    │ de-isol. │    │ operation│
#   └──────────┘    └──────────┘    └──────────┘    └──────────┘
#
#=============================================================================

#=============================================================================
# WORKAROUND: Map a drive letter to avoid spaces in path
#=============================================================================
# QuestaSim's vopt -pa_upf launches an internal subprocess that cannot
# handle spaces in the working directory path (e.g. "Digital design
# verification course"). We work around this by mapping a temporary
# drive letter to the current directory.
#
# This finds an unused drive letter (P:, Q:, ... Z:), maps it, changes
# to it, and unmaps it at the end of the script.
#=============================================================================
set _pa_orig_dir [pwd]
set _pa_drive ""

# Check if current path contains spaces (workaround needed)
if {[string match "* *" $_pa_orig_dir]} {
    puts "============================================================"
    puts " NOTE: Path contains spaces. Mapping temporary drive letter"
    puts "       to work around QuestaSim vopt -pa_upf limitation."
    puts "============================================================"

    # Try drive letters P through Z to find one that's unused
    foreach _letter {P Q R S T U V W X Y Z} {
        set _test_path "${_letter}:/"
        if {![file exists $_test_path]} {
            set _pa_drive "${_letter}:"
            break
        }
    }

    if {$_pa_drive eq ""} {
        puts "** ERROR: Could not find an unused drive letter (P-Z)."
        puts "          Please free a drive letter or move the project"
        puts "          to a path without spaces."
        error "No unused drive letter available"
    }

    # Map the drive letter using Windows subst.exe directly
    # file nativename converts / to \ for Windows
    set _pa_native [file nativename $_pa_orig_dir]
    exec subst $_pa_drive $_pa_native
    cd ${_pa_drive}/
    puts " Mapped $_pa_drive -> $_pa_orig_dir"
    puts ""
}

# --- Step 1: Create work library ---
puts "============================================================"
puts " Step 1: Creating work library"
puts "============================================================"
if {[file exists work]} {
    vdel -lib work -all
}
vlib work

# --- Step 2: Compile RTL and Testbench ---
# No special flags needed for UPF - power awareness is handled at
# optimization time with vopt, not compile time.
puts "\n============================================================"
puts " Step 2: Compiling RTL and Testbench"
puts "============================================================"
vlog -sv +acc \
    -L mtiUPF \
    rtl/data_processor.sv \
    rtl/always_on_ctrl.sv \
    rtl/top_power_demo.sv \
    tb/top_power_demo_tb.sv

# --- Step 3: Optimize with UPF Power Intent ---
# Key flags for vopt:
#   -pa_upf <file>      : Load UPF power intent file
#   -pa_top <path>      : Scope in the design where UPF is applied
#                          (the DUT hierarchy under the testbench)
#   -pa_genrpt=v+us     : Generate verbose PA reports (report.mspa.txt, report.upf.txt)
puts "\n============================================================"
puts " Step 3a: Optimizing with UPF Power Intent"
puts "          UPF file:  upf/power_intent.upf"
puts "          PA scope:  /top_power_demo_tb/dut"
puts "============================================================"
vopt +acc work.top_power_demo_tb -o opt_tb \
     -pa_upf upf/power_intent.upf \
     -pa_top /top_power_demo_tb/dut \
     -pa_genrpt=v+us

# --- Step 3b: Load simulation in Power-Aware mode ---
# Key flags for vsim:
#   -pa              : Enable power-aware simulation mode
#   -L mtiUPF        : Link the UPF library (provides supply_on/supply_off)
puts "\n============================================================"
puts " Step 3b: Loading Power-Aware Simulation"
puts "          PA mode:  ENABLED"
puts "============================================================"
vsim -pa \
     -suppress 3009 \
     -L mtiUPF \
     work.opt_tb \
     -onfinish stop

# --- Step 4: Set up waveforms ---
# Add signals organized by domain for easy visualization
puts "\n============================================================"
puts " Step 4: Setting up waveform display"
puts "============================================================"
# Open the Wave window (required in GUI mode before adding signals)
# In batch mode (-c), this is safely ignored.
catch {view wave}

# Clock and control signals
add wave -divider "=== Clock & Control ==="
add wave -label "clk"        sim:/top_power_demo_tb/clk
add wave -label "rst_n"      sim:/top_power_demo_tb/rst_n
add wave -label "iso_enable" sim:/top_power_demo_tb/iso_enable

# Power-gated domain signals
add wave -divider "=== PD_GATED (Power-Gated Domain) ==="
add wave -label "data_in"    sim:/top_power_demo_tb/data_in
add wave -label "enable"     sim:/top_power_demo_tb/enable
add wave -label "proc_data_out (pre-iso)" sim:/top_power_demo_tb/dut/proc_data_out
add wave -label "proc_valid (pre-iso)"    sim:/top_power_demo_tb/dut/proc_data_valid

# Internal processor registers (will show X when powered off)
add wave -divider "Processor Internals (show X when OFF)"
add wave -label "data_reg"   sim:/top_power_demo_tb/dut/u_data_proc/data_reg
add wave -label "valid_reg"  sim:/top_power_demo_tb/dut/u_data_proc/valid_reg

# Always-on domain signals
add wave -divider "=== PD_AON (Always-On Domain) ==="
add wave -label "captured_data" sim:/top_power_demo_tb/captured_data
add wave -label "data_ready"    sim:/top_power_demo_tb/data_ready

# Internal controller registers (should NEVER show X)
add wave -divider "Controller Internals (always valid)"
add wave -label "capture_reg" sim:/top_power_demo_tb/dut/u_aon_ctrl/capture_reg
add wave -label "ready_reg"   sim:/top_power_demo_tb/dut/u_aon_ctrl/ready_reg

# Log all signals for post-simulation analysis
log -r /*

# --- Step 5: Run the entire simulation ---
# The testbench controls power supply on/off via UPF supply_on()/supply_off()
# functions imported from the UPF package. The four phases are:
#   Phase 1: Normal operation (both domains ON)
#   Phase 2: Power-down (testbench calls supply_off("VDD_SW"))
#   Phase 3: Power-up   (testbench calls supply_on("VDD_SW", 1.0))
#   Phase 4: Resume normal operation
puts "\n============================================================"
puts " Step 5: Running Power-Aware Simulation"
puts "         (supply control from testbench via UPF package)"
puts "============================================================"

run -all

# Zoom the waveform to show all simulation data
catch {wave zoom full}

# --- Step 6: Final summary ---
puts "\n============================================================"
puts " Step 6: Simulation Complete"
puts "============================================================"
puts ""
puts " Power-Aware Simulation Summary:"
puts " ---------------------------------------------"
puts "  UPF File:    upf/power_intent.upf"
puts "  Domains:     PD_AON (always-on), PD_GATED (power-gated)"
puts "  Isolation:   Clamp-to-0 on PD_GATED outputs"
puts " ---------------------------------------------"
puts ""
puts " What to look for in the waveform viewer:"
puts "  1. Phase 1: data_reg and proc_data_out show valid data"
puts "  2. Phase 2: data_reg becomes X (red), but captured_data"
puts "              stays valid (isolation protects AON domain)"
puts "  3. Phase 3: After reset, data_reg returns to 0x00"
puts "  4. Phase 4: Normal data flow resumes"
puts ""
puts " Key signals to watch:"
puts "  - data_reg (inside processor): Shows X when power is OFF"
puts "  - proc_data_out:  Pre-isolation signal (shows X when OFF)"
puts "  - captured_data:  Post-isolation signal (clamped to 0)"
puts "  - iso_enable:     High during power transitions"
puts ""
puts " GUI Tips:"
puts "  - Zoom to Phase 2 to see X propagation and isolation"
puts "  - Compare proc_data_out (X) vs captured_data (0x00)"
puts "  - Look for red X markers in the waveform"
puts "============================================================"

#=============================================================================
# CLEANUP: Remove the temporary drive mapping
#=============================================================================
if {$_pa_drive ne ""} {
    # NOTE: We keep the drive mapping active while the GUI is open,
    # because the simulation's work library lives on the mapped drive.
    # The mapping will be released when QuestaSim exits.
    #
    # To manually remove it, run in a Windows terminal:
    #   subst <drive_letter>: /D
    puts "\n NOTE: Temporary drive mapping $_pa_drive is still active"
    puts "       (needed while simulation is loaded for waveform viewing)."
    puts "       It will be released when you close QuestaSim."
}
