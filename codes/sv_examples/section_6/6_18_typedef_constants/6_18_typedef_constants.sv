// LRM Section 6.18 / 6.20 - typedef, Constants, Parameters

module top;
    // --- typedef: create named types ---
    typedef logic [7:0]  byte_t;
    typedef logic [31:0] word_t;

    typedef struct packed {
        byte_t opcode;
        byte_t operand1;
        byte_t operand2;
        byte_t result;
    } instruction_t;

    typedef enum logic [1:0] {
        ADD = 2'b00,
        SUB = 2'b01,
        MUL = 2'b10,
        NOP = 2'b11
    } alu_op_t;

    // --- Parameters ---
    parameter int DATA_WIDTH = 8;
    parameter int DEPTH = 16;
    localparam int ADDR_WIDTH = $clog2(DEPTH);

    // --- Constants ---
    const int VERSION = 42;

    initial begin
        byte_t b;
        word_t w;
        instruction_t instr;
        alu_op_t op;

        // --- typedef usage ---
        $display("=== typedef ===");
        b = 8'hAB;
        w = 32'hDEAD_BEEF;
        $display("byte_t b = %h", b);
        $display("word_t w = %h", w);

        instr.opcode   = 8'h01;
        instr.operand1 = 8'h0A;
        instr.operand2 = 8'h14;
        instr.result   = 8'h1E;
        $display("instr = %h (packed)", instr);

        op = ADD;
        $display("op = %s (%b)", op.name(), op);

        // --- Parameters ---
        $display("\n=== Parameters ===");
        $display("DATA_WIDTH = %0d", DATA_WIDTH);
        $display("DEPTH      = %0d", DEPTH);
        $display("ADDR_WIDTH = %0d (localparam, clog2)", ADDR_WIDTH);

        // --- Constants ---
        $display("\n=== Constants ===");
        $display("VERSION = %0d (const, cannot be changed)", VERSION);

        // parameter vs localparam:
        $display("\n=== parameter vs localparam ===");
        $display("parameter:  can be overridden at instantiation");
        $display("localparam: computed, cannot be overridden");

        $finish;
    end
endmodule
