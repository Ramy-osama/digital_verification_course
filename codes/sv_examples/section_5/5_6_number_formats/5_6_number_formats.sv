// LRM Section 5.7 - Number Formats and Literals

module top;
    initial begin
        logic [15:0] val;

        // --- Unsized Decimal ---
        $display("=== Unsized Decimal ===");
        $display("659 = %0d", 659);

        // --- Sized Literals (base formats) ---
        $display("\n=== Sized Literals ===");
        val = 4'b1001;
        $display("4'b1001 = %b (decimal %0d)", val, val);
        val = 8'hFF;
        $display("8'hFF   = %h (decimal %0d)", val, val);
        val = 12'o7460;
        $display("12'o7460 = %o (decimal %0d)", val, val);
        val = 8'd200;
        $display("8'd200  = %0d", val);

        // --- Signed Literals ---
        $display("\n=== Signed Literals ===");
        $display("4'shF = %0d (signed -1)", $signed(4'shF));
        $display("-8'd6 = %0d (two's complement)", -8'd6);

        // --- Special Values ---
        $display("\n=== Special Values (x and z) ===");
        val = 8'hxF;
        $display("8'hxF  = %h", val);
        val = 4'bz;
        $display("4'bz   = %b", val);
        val = 4'b10?1;
        $display("4'b10?1 = %b (? is z)", val);

        // --- Unbased Unsized Literals ---
        $display("\n=== Unbased Unsized Literals ===");
        logic [7:0] all_ones, all_zeros;
        all_ones  = '1;
        all_zeros = '0;
        $display("'1 in 8 bits = %b (%h)", all_ones, all_ones);
        $display("'0 in 8 bits = %b (%h)", all_zeros, all_zeros);

        // --- Real Literals ---
        $display("\n=== Real Literals ===");
        real r;
        r = 3.14;     $display("3.14     = %f", r);
        r = 1.2e3;    $display("1.2e3    = %f", r);
        r = 0.1e-2;   $display("0.1e-2   = %f", r);

        // --- String Literals ---
        $display("\n=== String Literals ===");
        string s;
        s = "Hello, SystemVerilog!";
        $display("s = %s", s);
        $display("length = %0d", s.len());

        // --- Underscores for Readability ---
        $display("\n=== Underscores ===");
        val = 16'b0011_0101_0001_1111;
        $display("16'b0011_0101_0001_1111 = %h", val);

        $finish;
    end
endmodule
