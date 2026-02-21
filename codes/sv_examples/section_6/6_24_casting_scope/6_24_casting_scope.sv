// LRM Section 6.24 - Casting and Scope Resolution

module top;
    typedef enum {RED, GREEN, BLUE} color_t;

    initial begin
        int i;
        real r;
        logic [7:0] v;
        color_t c;

        // --- Static Cast (compile-time) ---
        $display("=== Static Cast: type'(expr) ===");

        // int to real
        i = 42;
        r = real'(i);
        $display("int %0d -> real %f", i, r);

        // real to int (truncates)
        r = 3.99;
        i = int'(r);
        $display("real %f -> int %0d (truncated)", r, i);

        // Resize with cast
        i = 300;
        v = 8'(i);
        $display("int %0d -> 8-bit = %0d (%h)", i, v, v);

        // Signed cast
        v = 8'hFF;
        $display("unsigned %h = %0d", v, v);
        $display("signed'(FF) = %0d", $signed(v));

        // --- $cast (dynamic, runtime check) ---
        $display("\n=== \\$cast (Dynamic Cast) ===");
        i = 1;
        if ($cast(c, i))
            $display("$cast(color, %0d) = %s (success)", i, c.name());
        else
            $display("$cast(color, %0d) failed", i);

        i = 5;
        if ($cast(c, i))
            $display("$cast(color, %0d) = %s", i, c.name());
        else
            $display("$cast(color, %0d) failed (out of range)", i);

        // --- Scope Resolution (::) ---
        $display("\n=== Scope Resolution (::) ===");
        $display("Use pkg::item to access package members");
        $display("Use class::member for static class members");
        $display("Example: math_pkg::PI, color_pkg::RED");

        $finish;
    end
endmodule
