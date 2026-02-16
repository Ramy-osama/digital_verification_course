//=============================================================================
// Module: top_power_demo
// Description: Top-level module connecting two power domains
//
// Architecture:
//
//   PD_GATED (power-gated)          PD_AON (always-on)
//  ┌──────────────────────┐       ┌──────────────────────┐
//  │                      │       │                      │
//  │   data_processor     │       │   always_on_ctrl     │
//  │                      │       │                      │
//  │   data_in ──► REG    │       │                      │
//  │   enable     │       │  data_out    proc_data       │
//  │         processed    ├───┤►ISO├───►  REG             │
//  │              │       │  data_valid  proc_valid       │
//  │              ▼       ├───┤►ISO├───►                  │
//  │   data_out  valid    │       │   captured_data       │
//  │                      │       │   data_ready          │
//  └──────────────────────┘       └──────────────────────┘
//         ▲                              ▲
//    VDD_GATED (can be OFF)         VDD (always ON)
//
// The isolation cells (ISO) are NOT instantiated in RTL.
// They are automatically inserted by the UPF tool based on
// the power intent specification in power_intent.upf.
//
// Ports:
//   clk            - System clock
//   rst_n          - Active-low reset
//   data_in        - Input data to the processor
//   enable         - Enable processing
//   iso_enable     - Isolation enable (high = isolate outputs from gated domain)
//   captured_data  - Output data from the always-on controller
//   data_ready     - Data ready flag from always-on controller
//=============================================================================

module top_power_demo (
    input  logic        clk,
    input  logic        rst_n,
    input  logic [7:0]  data_in,
    input  logic        enable,
    input  logic        iso_enable,
    output logic [7:0]  captured_data,
    output logic        data_ready
);

    //=========================================================================
    // Internal Wires (cross-domain signals, before isolation)
    //=========================================================================
    logic [7:0] proc_data_out;   // From power-gated → always-on
    logic       proc_data_valid; // From power-gated → always-on

    //=========================================================================
    // Power-Gated Domain: Data Processor (u_data_proc)
    //=========================================================================
    // This instance is placed in PD_GATED by the UPF file.
    // When VDD_GATED is OFF, all outputs become X.
    // The UPF-defined isolation cells clamp them to 0.
    data_processor u_data_proc (
        .clk        (clk),
        .rst_n      (rst_n),
        .data_in    (data_in),
        .enable     (enable),
        .data_out   (proc_data_out),
        .data_valid (proc_data_valid)
    );

    //=========================================================================
    // Always-On Domain: Controller (u_aon_ctrl)
    //=========================================================================
    // This instance stays in the top-level PD_AON domain.
    // It receives isolated signals from the gated domain.
    always_on_ctrl u_aon_ctrl (
        .clk           (clk),
        .rst_n         (rst_n),
        .proc_data     (proc_data_out),     // Post-isolation (handled by UPF)
        .proc_valid    (proc_data_valid),   // Post-isolation (handled by UPF)
        .captured_data (captured_data),
        .data_ready    (data_ready)
    );

endmodule
