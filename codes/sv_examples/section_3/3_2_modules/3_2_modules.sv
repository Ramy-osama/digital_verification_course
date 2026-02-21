// LRM Section 3.2 - Modules: Declaration, Ports, Parameterization, Instantiation

// Simple module with ports
module adder (
    input  logic [7:0] a, b,
    output logic [8:0] sum
);
    assign sum = a + b;
endmodule

// Parameterized module with default values
module counter #(
    parameter WIDTH = 8,
    parameter MAX_COUNT = 255
)(
    input  logic             clk, rst,
    output logic [WIDTH-1:0] count
);
    always_ff @(posedge clk or posedge rst) begin
        if (rst)
            count <= '0;
        else if (count < MAX_COUNT)
            count <= count + 1;
    end
endmodule

// Top-level testbench demonstrating instantiation
module top;
    logic [7:0] a, b;
    logic [8:0] sum;

    // Named port connection
    adder u_add (.a(a), .b(b), .sum(sum));

    // Parameterized instantiation
    logic clk, rst;
    logic [3:0]  cnt4;
    logic [15:0] cnt16;

    counter #(.WIDTH(4), .MAX_COUNT(9))  u_cnt4  (.clk(clk), .rst(rst), .count(cnt4));
    counter #(.WIDTH(16))                u_cnt16 (.clk(clk), .rst(rst), .count(cnt16));

    initial begin
        // Test adder
        a = 8'd100; b = 8'd55;
        #1;
        $display("adder: %0d + %0d = %0d", a, b, sum);

        a = 8'hFF; b = 8'h01;
        #1;
        $display("adder: %0d + %0d = %0d (9-bit)", a, b, sum);

        // Test counter
        clk = 0; rst = 1;
        #10 rst = 0;
        repeat (5) begin
            #5 clk = 1; #5 clk = 0;
        end
        $display("cnt4 after 5 clocks = %0d", cnt4);
        $display("cnt16 after 5 clocks = %0d", cnt16);

        $finish;
    end
endmodule
