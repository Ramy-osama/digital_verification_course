//=============================================================================
// Module: data_processor
// Description: Simple registered data processor for power-gating demonstration
//
// This module resides in the POWER-GATED domain (PD_GATED).
// When its power supply (VDD_GATED) is turned off:
//   - All internal registers lose their values
//   - All outputs become unknown (X)
//   - Isolation cells (defined in UPF) clamp outputs to safe values
//
// Function:
//   When 'enable' is high, the module registers 'data_in', adds 1
//   (simple processing), and asserts 'data_valid' on the next clock edge.
//
// Inputs:
//   clk       - System clock
//   rst_n     - Active-low reset
//   data_in   - 8-bit input data
//   enable    - Processing enable
//
// Outputs:
//   data_out  - 8-bit processed data (data_in + 1)
//   data_valid - High when data_out holds valid processed data
//=============================================================================

module data_processor (
    input  logic        clk,
    input  logic        rst_n,
    input  logic [7:0]  data_in,
    input  logic        enable,
    output logic [7:0]  data_out,
    output logic        data_valid
);

    //=========================================================================
    // Internal Signals
    //=========================================================================
    logic [7:0] data_reg;
    logic       valid_reg;

    //=========================================================================
    // Registered Processing Logic
    //=========================================================================
    // On power-up after gating, rst_n must be asserted to re-initialize
    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            data_reg  <= 8'h00;
            valid_reg <= 1'b0;
        end else if (enable) begin
            data_reg  <= data_in + 8'h01;  // Simple processing: increment
            valid_reg <= 1'b1;
        end else begin
            valid_reg <= 1'b0;
        end
    end

    //=========================================================================
    // Output Assignments
    //=========================================================================
    assign data_out   = data_reg;
    assign data_valid = valid_reg;

endmodule
