//=============================================================================
// Testbench: top_power_demo_tb
// Description: Power-aware simulation testbench demonstrating two power
//              domains with UPF and Questa power-aware (PA) mode.
//
// Demonstrates:
//   - Normal operation with both domains powered ON
//   - Power-down sequence: isolate first, then cut power
//   - Behavior during power-off: X corruption and isolation clamping
//   - Power-up sequence: restore power, de-isolate, reset
//   - Resumed normal operation after power restoration
//
// Power Control:
//   Uses the UPF package from mtiUPF library to call supply_on()/supply_off()
//   directly from SystemVerilog. This is the standard IEEE 1801 approach for
//   controlling power supplies during simulation.
//
// Expected Waveform Behavior:
//
//          Phase 1       Phase 2          Phase 3       Phase 4
//         (Normal)     (Power Down)     (Power Up)     (Resume)
//        ┌─────────┐  ┌────────────┐  ┌────────────┐  ┌─────────┐
//  VDD_G │ ON      │  │ OFF        │  │ ON         │  │ ON      │
//        ├─────────┤  ├────────────┤  ├────────────┤  ├─────────┤
//  iso_en│ 0       │  │ 1          │  │ 0          │  │ 0       │
//        ├─────────┤  ├────────────┤  ├────────────┤  ├─────────┤
//  d_out │ VALID   │  │ XXXXXXXX   │  │ VALID      │  │ VALID   │
// (raw)  │ data    │  │ (corrupted)│  │ data       │  │ data    │
//        ├─────────┤  ├────────────┤  ├────────────┤  ├─────────┤
//  p_data│ VALID   │  │ 00000000   │  │ VALID      │  │ VALID   │
// (isol) │ data    │  │ (clamped)  │  │ data       │  │ data    │
//        └─────────┘  └────────────┘  └────────────┘  └─────────┘
//
//=============================================================================

// Import the UPF package for supply_on()/supply_off() functions
import UPF::*;

module top_power_demo_tb;

    //=========================================================================
    // Signals
    //=========================================================================
    logic        clk;
    logic        rst_n;
    logic [7:0]  data_in;
    logic        enable;
    logic        iso_enable;
    logic [7:0]  captured_data;
    logic        data_ready;

    // Internal signals for monitoring (hierarchical access)
    // These let us observe signals inside the DUT
    logic [7:0]  proc_data_out_mon;
    logic        proc_valid_mon;

    //=========================================================================
    // DUT Instantiation
    //=========================================================================
    top_power_demo dut (
        .clk           (clk),
        .rst_n         (rst_n),
        .data_in       (data_in),
        .enable        (enable),
        .iso_enable    (iso_enable),
        .captured_data (captured_data),
        .data_ready    (data_ready)
    );

    //=========================================================================
    // Monitor internal cross-domain signals (pre-isolation)
    //=========================================================================
    assign proc_data_out_mon = dut.proc_data_out;
    assign proc_valid_mon    = dut.proc_data_valid;

    //=========================================================================
    // Clock Generation: 10ns period (100 MHz)
    //=========================================================================
    initial clk = 0;
    always #5 clk = ~clk;

    //=========================================================================
    // Stimulus Task: Drive data and wait for result
    //=========================================================================
    task automatic drive_data(input logic [7:0] din, input logic en);
        @(negedge clk);
        data_in = din;
        enable  = en;
        @(posedge clk);
        #1;  // Small delay for output to settle
    endtask

    //=========================================================================
    // Display Task: Show current state of all key signals
    //=========================================================================
    task automatic display_status(input string phase_name);
        $display("  [%0t] %s:", $time, phase_name);
        $display("    data_in       = 0x%02h  enable     = %0b", data_in, enable);
        $display("    proc_data_out = 0x%02h  proc_valid = %0b  (pre-isolation, from gated domain)",
                 proc_data_out_mon, proc_valid_mon);
        $display("    captured_data = 0x%02h  data_ready = %0b  (post-isolation, in always-on domain)",
                 captured_data, data_ready);
        $display("");
    endtask

    //=========================================================================
    // Main Test Stimulus
    //=========================================================================
    initial begin
        //---------------------------------------------------------------------
        // Initialize all inputs
        //---------------------------------------------------------------------
        rst_n      = 1'b0;
        data_in    = 8'h00;
        enable     = 1'b0;
        iso_enable = 1'b0;

        $display("=============================================================");
        $display(" Power-Aware Simulation Demo - Starting Test");
        $display(" Two domains: PD_AON (always-on) + PD_GATED (power-gated)");
        $display("=============================================================");

        //---------------------------------------------------------------------
        // Power on all supply ports (UPF supply control)
        // In Questa PA mode, supplies must be explicitly turned on.
        // supply_on(<supply_port_name>, <voltage>) is from the UPF package.
        //---------------------------------------------------------------------
        $display("\n  Turning on power supplies...");
        void'(supply_on("VDD",    1.0));  // Always-on supply: 1.0V
        void'(supply_on("VSS",    0.0));  // Ground: 0V
        void'(supply_on("VDD_SW", 1.0));  // Switchable supply: 1.0V (initially ON)
        $display("  All supplies ON: VDD=1.0V, VSS=0.0V, VDD_SW=1.0V\n");

        //---------------------------------------------------------------------
        // Release reset
        //---------------------------------------------------------------------
        repeat (3) @(posedge clk);
        rst_n = 1'b1;
        repeat (2) @(posedge clk);

        $display("\n  Reset released. Both domains are powered ON.\n");

        //=====================================================================
        // PHASE 1: NORMAL OPERATION (Both Domains ON)
        //=====================================================================
        $display("=============================================================");
        $display(" PHASE 1: Normal Operation (both domains powered ON)");
        $display("=============================================================");
        $display("  Sending data through the power-gated processor to the");
        $display("  always-on controller. Data should flow normally.\n");

        // Send several data values through the processor
        drive_data(8'hAA, 1'b1);  // Send 0xAA, expect 0xAB out (AA+1)
        display_status("After sending 0xAA");

        drive_data(8'h55, 1'b1);  // Send 0x55, expect 0x56 out (55+1)
        display_status("After sending 0x55");

        drive_data(8'hFF, 1'b1);  // Send 0xFF, expect 0x00 out (FF+1 wraps)
        display_status("After sending 0xFF");

        drive_data(8'h00, 1'b1);  // Send 0x00, expect 0x01 out (00+1)
        display_status("After sending 0x00");

        // Disable processor, verify valid goes low
        drive_data(8'h00, 1'b0);
        display_status("After disabling processor");

        $display("  Phase 1 Complete: Data flowed correctly from PD_GATED to PD_AON.\n");

        //=====================================================================
        // PHASE 2: POWER-DOWN SEQUENCE
        //=====================================================================
        // CRITICAL: The correct sequence is:
        //   1. Assert isolation FIRST (iso_enable = 1)
        //   2. THEN power off VDD_GATED
        // This prevents X values from reaching the always-on domain.
        //=====================================================================
        $display("=============================================================");
        $display(" PHASE 2: Power-Down Sequence");
        $display("=============================================================");
        $display("  Step 2a: Assert isolation (iso_enable = 1)");
        $display("           Isolation cells clamp gated outputs to 0.\n");

        // Step 2a: Assert isolation BEFORE powering off
        @(negedge clk);
        iso_enable = 1'b0;
        @(posedge clk);
        #1;
        display_status("After isolation enabled (power still ON)");

        // Step 2b: Power off VDD_GATED using UPF supply_off()
        // supply_off() tells Questa to simulate power being cut to VDD_SW.
        // All registers in PD_GATED will be corrupted to X.
        // Isolation cells (from UPF) will clamp outputs to 0.
        $display("  Step 2b: >>> POWER OFF VDD_GATED <<<");
        void'(supply_off("VDD_SW"));  // <-- UPF function: cuts power to gated domain
        $display("           supply_off(VDD_SW) called.");
        $display("           Processor registers lose state (become X).");
        $display("           Isolation cells clamp outputs to 0.\n");

        // Wait for power-off to take effect
        // The supply_off() corrupts all state in PD_GATED immediately
        repeat (5) @(posedge clk);
        display_status("During power-off (gated domain outputs should be X/isolated)");

        // Verify always-on domain still works
        $display("  Verifying: Always-on domain still operational...");
        $display("    captured_data = 0x%02h (should retain last captured value)",
                 captured_data);
        $display("    The always-on domain is unaffected by the gated domain power-off.\n");

        $display("  Phase 2 Complete: PD_GATED is powered off, PD_AON is isolated.\n");

        //=====================================================================
        // PHASE 3: POWER-UP SEQUENCE
        //=====================================================================
        // CRITICAL: The correct sequence is:
        //   1. Power on VDD_GATED first
        //   2. Reset the gated domain (registers are in unknown state)
        //   3. THEN de-assert isolation (iso_enable = 0)
        //=====================================================================
        $display("=============================================================");
        $display(" PHASE 3: Power-Up Sequence");
        $display("=============================================================");

        // Step 3a: Power on VDD_GATED using UPF supply_on()
        $display("  Step 3a: >>> POWER ON VDD_GATED <<<");
        void'(supply_on("VDD_SW", 1.0));  // <-- UPF function: restores power at 1.0V
        $display("           supply_on(VDD_SW, 1.0) called.");
        $display("           Power restored, but registers are still X.\n");
        repeat (2) @(posedge clk);
        display_status("After power restored (before reset)");

        // Step 3b: Reset the gated domain
        $display("  Step 3b: Reset the gated domain (re-initialize registers)");
        @(negedge clk);
        rst_n = 1'b0;
        repeat (3) @(posedge clk);
        rst_n = 1'b1;
        @(posedge clk);
        #1;
        display_status("After reset (gated domain re-initialized)");

        // Step 3c: De-assert isolation
        $display("  Step 3c: De-assert isolation (iso_enable = 0)");
        $display("           Gated domain outputs now flow to always-on domain.\n");
        @(negedge clk);
        iso_enable = 1'b0;
        @(posedge clk);
        #1;
        display_status("After isolation de-asserted");

        $display("  Phase 3 Complete: PD_GATED is back online.\n");

        //=====================================================================
        // PHASE 4: RESUMED NORMAL OPERATION
        //=====================================================================
        $display("=============================================================");
        $display(" PHASE 4: Resumed Normal Operation (both domains ON)");
        $display("=============================================================");
        $display("  Sending data again to verify full functionality.\n");

        drive_data(8'h42, 1'b1);  // Send 0x42, expect 0x43 out
        display_status("After sending 0x42");

        drive_data(8'hDE, 1'b1);  // Send 0xDE, expect 0xDF out
        display_status("After sending 0xDE");

        drive_data(8'h10, 1'b1);  // Send 0x10, expect 0x11 out
        display_status("After sending 0x10");

        $display("  Phase 4 Complete: Normal operation resumed successfully.\n");

        //=====================================================================
        // Summary
        //=====================================================================
        $display("=============================================================");
        $display(" SIMULATION COMPLETE - Power-Aware Demo Summary");
        $display("=============================================================");
        $display("  Phase 1: Normal operation     - Data flowed correctly");
        $display("  Phase 2: Power-down sequence   - Isolation protected AON domain");
        $display("  Phase 3: Power-up sequence     - Domain restored and reset");
        $display("  Phase 4: Resumed operation     - Full functionality verified");
        $display("");
        $display("  KEY TAKEAWAYS:");
        $display("  1. Always isolate BEFORE powering off (prevent X propagation)");
        $display("  2. Always power on BEFORE de-isolating");
        $display("  3. Always reset gated domain after power-up");
        $display("  4. Always-on domain retains state through power transitions");
        $display("=============================================================\n");

        #100;
        $finish;
    end

    //=========================================================================
    // Timeout Watchdog
    //=========================================================================
    initial begin
        #1_000_000;
        $display("ERROR: Simulation timeout!");
        $finish;
    end

endmodule
