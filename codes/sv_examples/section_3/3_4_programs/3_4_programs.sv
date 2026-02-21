// LRM Section 3.4 - Program Blocks: Testbench Separation

// DUT: simple register
module dut (
    input  logic       clk, rst, wr_en,
    input  logic [7:0] data_in,
    output logic [7:0] data_out
);
    always_ff @(posedge clk or posedge rst) begin
        if (rst)       data_out <= 8'h00;
        else if (wr_en) data_out <= data_in;
    end
endmodule

// Program block for testbench
// Programs execute in the Reactive region (after design events),
// avoiding race conditions between TB and DUT
program test (
    input  logic       clk,
    output logic       rst, wr_en,
    output logic [7:0] data_in,
    input  logic [7:0] data_out
);
    initial begin
        $display("=== Program Block Testbench ===");
        rst = 1; wr_en = 0; data_in = 0;
        @(posedge clk);
        @(posedge clk);
        rst = 0;

        // Write value
        @(posedge clk);
        wr_en = 1; data_in = 8'hA5;
        @(posedge clk);
        wr_en = 0;
        @(posedge clk);
        $display("Wrote 0xA5, read back: 0x%h", data_out);

        // Write another value
        @(posedge clk);
        wr_en = 1; data_in = 8'h3C;
        @(posedge clk);
        wr_en = 0;
        @(posedge clk);
        $display("Wrote 0x3C, read back: 0x%h", data_out);

        $finish;
    end
endprogram

// Top-level connecting DUT and program
module top;
    logic clk = 0;
    always #5 clk = ~clk;

    logic rst, wr_en;
    logic [7:0] data_in, data_out;

    dut  u_dut  (.clk, .rst, .wr_en, .data_in, .data_out);
    test u_test (.clk, .rst, .wr_en, .data_in, .data_out);
endmodule
