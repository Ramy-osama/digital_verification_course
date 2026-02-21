// LRM Sections 6.20.3 / 6.25 - Parameterized Types

// --- 6.20.3: Type Parameters ---
// Module with a type parameter (generic data type)
module generic_register #(
    parameter type T = logic [7:0]
)(
    input  logic clk, rst, en,
    input  T     d,
    output T     q
);
    always_ff @(posedge clk or posedge rst) begin
        if (rst)  q <= T'(0);
        else if (en) q <= d;
    end
endmodule

// --- 6.25: Parameterized Data Types via Class ---
// Virtual class as a parameterized type container
virtual class vector_types #(parameter type T = logic, parameter int SIZE = 8);
    typedef T [SIZE-1:0] vector_t;
    typedef T            element_t;
endclass

// Testbench
module top;
    logic clk = 0, rst, en;
    always #5 clk = ~clk;

    // Instantiate with default type (logic [7:0])
    logic [7:0] d8, q8;
    generic_register           u_reg8  (.clk, .rst, .en, .d(d8),  .q(q8));

    // Instantiate with int type
    int d32, q32;
    generic_register #(.T(int)) u_reg32 (.clk, .rst, .en, .d(d32), .q(q32));

    // Instantiate with custom struct type
    typedef struct packed {
        logic [7:0] tag;
        logic [7:0] data;
    } pkt_t;
    pkt_t dp, qp;
    generic_register #(.T(pkt_t)) u_regp (.clk, .rst, .en, .d(dp), .q(qp));

    // Use parameterized data types from virtual class
    typedef vector_types #(bit, 4)::vector_t nibble_t;
    nibble_t n;

    initial begin
        $display("=== Parameterized Types ===");

        // Reset
        rst = 1; en = 0; d8 = 0; d32 = 0; dp = '0;
        @(posedge clk); @(posedge clk);
        rst = 0;
        $display("After reset: q8=%h, q32=%0d, qp=%h", q8, q32, qp);

        // Write 8-bit register
        en = 1; d8 = 8'hA5;
        @(posedge clk); #1;
        $display("8-bit reg:   q8=%h", q8);

        // Write 32-bit register
        d32 = 32'd123456;
        @(posedge clk); #1;
        $display("32-bit reg:  q32=%0d", q32);

        // Write struct register
        dp.tag = 8'hFF; dp.data = 8'h42;
        @(posedge clk); #1;
        $display("Struct reg:  tag=%h, data=%h", qp.tag, qp.data);

        // Parameterized data type from class
        n = 4'b1010;
        $display("\nnibble_t (vector_types#(bit,4)::vector_t) = %b", n);

        $display("\n=== Key Takeaways ===");
        $display("parameter type T: generic module works with any type");
        $display("virtual class #(type T): type container for typedefs");

        en = 0;
        $finish;
    end
endmodule
