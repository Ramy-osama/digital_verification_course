//=============================================================================
// Module: alu
// Description: Simple 8-bit ALU for coverage demonstration
//
// Operations (op[2:0]):
//   000 - ADD   : result = a + b
//   001 - SUB   : result = a - b
//   010 - AND   : result = a & b
//   011 - OR    : result = a | b
//   100 - XOR   : result = a ^ b
//   101 - NOT   : result = ~a
//   110 - SLL   : result = a << 1
//   111 - SRL   : result = a >> 1
//
// Outputs:
//   result[7:0] - ALU result
//   zero        - Asserted when result == 0
//   carry       - Carry/borrow output (valid for ADD/SUB)
//=============================================================================

module alu (
    input  logic [7:0] a,
    input  logic [7:0] b,
    input  logic [2:0] op,
    output logic [7:0] result,
    output logic       zero,
    output logic       carry
);

    // Internal 9-bit result to capture carry
    logic [8:0] alu_wide;

    always_comb begin
        // Default values
        alu_wide = 9'b0;

        case (op)
            3'b000: begin // ADD
                alu_wide = {1'b0, a} + {1'b0, b};
            end

            3'b001: begin // SUB
                alu_wide = {1'b0, a} - {1'b0, b};
            end

            3'b010: begin // AND
                alu_wide = {1'b0, a & b};
            end

            3'b011: begin // OR
                alu_wide = {1'b0, a | b};
            end

            3'b100: begin // XOR
                alu_wide = {1'b0, a ^ b};
            end

            3'b101: begin // NOT
                alu_wide = {1'b0, ~a};
            end

            3'b110: begin // SLL (shift left logical by 1)
                alu_wide = {a, 1'b0};  // MSB goes to carry
            end

            3'b111: begin // SRL (shift right logical by 1)
                alu_wide = {1'b0, 1'b0, a[7:1]};  // LSB is lost
            end

            default: begin
                alu_wide = 9'b0;
            end
        endcase
    end

    // Output assignments
    assign result = alu_wide[7:0];
    assign carry  = alu_wide[8];
    assign zero   = (alu_wide[7:0] == 8'b0);

endmodule
