// Test file for SystemVerilog LSP extension
// Use this file to verify all LSP features

module test_alu #(
    parameter DATA_WIDTH = 8,
    parameter OP_WIDTH   = 3
)(
    input  logic                  clk,
    input  logic                  rst_n,
    input  logic [DATA_WIDTH-1:0] a,
    input  logic [DATA_WIDTH-1:0] b,
    input  logic [OP_WIDTH-1:0]   op,
    output logic [DATA_WIDTH-1:0] result,
    output logic                  zero,
    output logic                  carry
);

    // Internal signals
    logic [DATA_WIDTH:0] alu_wide;
    logic                valid;

    // Combinational ALU logic
    always_comb begin
        alu_wide = '0;

        case (op)
            3'b000: alu_wide = {1'b0, a} + {1'b0, b};   // ADD
            3'b001: alu_wide = {1'b0, a} - {1'b0, b};   // SUB
            3'b010: alu_wide = {1'b0, a & b};            // AND
            3'b011: alu_wide = {1'b0, a | b};            // OR
            3'b100: alu_wide = {1'b0, a ^ b};            // XOR
            3'b101: alu_wide = {1'b0, ~a};               // NOT
            3'b110: alu_wide = {a, 1'b0};                // SLL
            3'b111: alu_wide = {1'b0, 1'b0, a[7:1]};    // SRL
            default: alu_wide = '0;
        endcase
    end

    // Registered outputs
    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            result <= '0;
            zero   <= 1'b0;
            carry  <= 1'b0;
            valid  <= 1'b0;
        end else begin
            result <= alu_wide[DATA_WIDTH-1:0];
            carry  <= alu_wide[DATA_WIDTH];
            zero   <= (alu_wide[DATA_WIDTH-1:0] == '0);
            valid  <= 1'b1;
        end
    end

endmodule


class transaction;
    rand bit [7:0] data_in;
    rand bit [2:0] opcode;
    rand bit       enable;

    constraint valid_op {
        opcode inside {[0:7]};
    }

    constraint data_range {
        data_in dist {0 := 5, [1:254] := 90, 255 := 5};
    }

    function void display();
        $display("data_in=%0d, opcode=%0d, enable=%0d", data_in, opcode, enable);
    endfunction
endclass


module test_tb;
    logic clk, rst_n;
    logic [7:0] a, b, result;
    logic [2:0] op;
    logic zero, carry;

    test_alu #(.DATA_WIDTH(8), .OP_WIDTH(3)) dut (
        .clk(clk),
        .rst_n(rst_n),
        .a(a),
        .b(b),
        .op(op),
        .result(result),
        .zero(zero),
        .carry(carry)
    );

    transaction txn;

    initial begin
        clk = 0;
        rst_n = 0;
        txn = new();

        #10 rst_n = 1;

        repeat(20) begin
            @(posedge clk);
            assert(txn.randomize()) else $fatal(1, "Randomization failed");
            a = txn.data_in;
            op = txn.opcode;
        end

        $finish;
    end

    always #5 clk = ~clk;
endmodule
