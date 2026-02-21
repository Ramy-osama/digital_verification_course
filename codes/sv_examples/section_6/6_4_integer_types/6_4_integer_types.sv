// LRM Section 6.4 - Integer Data Types: 2-State vs 4-State

module top;
    initial begin
        // --- 2-State Types (0, 1 only; default = 0) ---
        $display("=== 2-State Types (default = 0) ===");
        bit        b;
        bit [7:0]  b8;
        byte       by;       // signed 8-bit
        shortint   si;       // signed 16-bit
        int        i;        // signed 32-bit
        longint    li;       // signed 64-bit

        $display("bit      = %b", b);
        $display("bit[7:0] = %b", b8);
        $display("byte     = %0d", by);
        $display("shortint = %0d", si);
        $display("int      = %0d", i);
        $display("longint  = %0d", li);

        by = 127;
        $display("\nbyte max = %0d", by);
        by = by + 1;
        $display("byte overflow (127+1) = %0d (wraps to -128)", by);

        // --- 4-State Types (0, 1, x, z; default = x) ---
        $display("\n=== 4-State Types (default = x) ===");
        logic       l;
        logic [7:0] l8;
        integer     ig;       // signed 32-bit, 4-state
        time        t;        // unsigned 64-bit, 4-state
        reg         r;

        $display("logic      = %b", l);
        $display("logic[7:0] = %b", l8);
        $display("integer    = %b (x=unknown)", ig);
        $display("reg        = %b", r);

        l  = 1'bz;
        l8 = 8'bxxxx_zzzz;
        $display("\nlogic = %b (z=high-impedance)", l);
        $display("logic[7:0] = %b", l8);

        // --- Comparison Table ---
        $display("\n=== Type Comparison ===");
        $display("%-10s %-6s %-6s %-10s",
                 "Type", "Bits", "Sign", "States");
        $display("%-10s %-6s %-6s %-10s",
                 "bit",      "1",  "uns", "2-state");
        $display("%-10s %-6s %-6s %-10s",
                 "byte",     "8",  "sig", "2-state");
        $display("%-10s %-6s %-6s %-10s",
                 "int",      "32", "sig", "2-state");
        $display("%-10s %-6s %-6s %-10s",
                 "logic",    "1",  "uns", "4-state");
        $display("%-10s %-6s %-6s %-10s",
                 "integer",  "32", "sig", "4-state");
        $display("%-10s %-6s %-6s %-10s",
                 "reg",      "1",  "uns", "4-state");

        $finish;
    end
endmodule
