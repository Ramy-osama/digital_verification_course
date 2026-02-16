//=============================================================================
// Module: always_on_ctrl
// Description: Data capture controller in the always-on domain
//
// This module resides in the ALWAYS-ON domain (PD_AON).
// Its power supply (VDD) is never turned off, so it retains state
// throughout the entire simulation, even when other domains are gated.
//
// Function:
//   When 'proc_valid' is high, captures 'proc_data' into an internal
//   register and asserts 'data_ready'. The signals proc_data and
//   proc_valid come from the power-gated domain and pass through
//   isolation cells (defined in UPF) before reaching this module.
//
// Inputs:
//   clk           - System clock
//   rst_n         - Active-low reset
//   proc_data     - 8-bit data from the power-gated processor (post-isolation)
//   proc_valid    - Valid signal from processor (post-isolation)
//
// Outputs:
//   captured_data - 8-bit latched data
//   data_ready    - High when captured_data holds valid data
//=============================================================================

module always_on_ctrl (
    input  logic        clk,
    input  logic        rst_n,
    input  logic [7:0]  proc_data,
    input  logic        proc_valid,
    output logic [7:0]  captured_data,
    output logic        data_ready
);

    //=========================================================================
    // Internal Signals
    //=========================================================================
    logic [7:0] capture_reg;
    logic       ready_reg;

    //=========================================================================
    // Data Capture Logic (Always-On - never loses state)
    //=========================================================================
    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            capture_reg <= 8'h00;
            ready_reg   <= 1'b0;
        end else if (proc_valid) begin
            capture_reg <= proc_data;
            ready_reg   <= 1'b1;
        end else begin
            ready_reg   <= 1'b0;
        end
    end

    //=========================================================================
    // Output Assignments
    //=========================================================================
    assign captured_data = capture_reg;
    assign data_ready    = ready_reg;

endmodule
