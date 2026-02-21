// LRM Section 5.11 - Operators Overview

module top;
    initial begin
        logic [7:0] a, b, result;
        logic cond;
        int x, y;

        // --- Arithmetic ---
        $display("=== Arithmetic Operators ===");
        a = 8'd15; b = 8'd4;
        $display("%0d + %0d = %0d", a, b, a + b);
        $display("%0d - %0d = %0d", a, b, a - b);
        $display("%0d * %0d = %0d", a, b, a * b);
        $display("%0d / %0d = %0d", a, b, a / b);
        $display("%0d %% %0d = %0d", a, b, a % b);
        $display("%0d ** 2 = %0d", a, a ** 2);

        // --- Relational ---
        $display("\n=== Relational Operators ===");
        $display("15 >  4 = %b", a > b);
        $display("15 <  4 = %b", a < b);
        $display("15 >= 15 = %b", a >= 8'd15);
        $display("15 == 15 = %b", a == 8'd15);
        $display("15 != 4  = %b", a != b);

        // --- Logical ---
        $display("\n=== Logical Operators ===");
        $display("1 && 0 = %b", 1'b1 && 1'b0);
        $display("1 || 0 = %b", 1'b1 || 1'b0);
        $display("!1     = %b", !1'b1);

        // --- Bitwise ---
        $display("\n=== Bitwise Operators ===");
        a = 8'hA5; b = 8'h3C;
        $display("A5 & 3C  = %h", a & b);
        $display("A5 | 3C  = %h", a | b);
        $display("A5 ^ 3C  = %h", a ^ b);
        $display("~A5      = %h", ~a);

        // --- Reduction ---
        $display("\n=== Reduction Operators ===");
        a = 8'hFF;
        $display("&FF  = %b (AND reduce)", &a);
        $display("|FF  = %b (OR reduce)", |a);
        $display("^A5  = %b (XOR reduce)", ^8'hA5);

        // --- Shift ---
        $display("\n=== Shift Operators ===");
        a = 8'b1010_0101;
        $display("A5 << 2  = %b", a << 2);
        $display("A5 >> 2  = %b", a >> 2);
        x = -8;
        $display("-8 >>> 1 = %0d (arithmetic)", x >>> 1);

        // --- Concatenation & Replication ---
        $display("\n=== Concatenation & Replication ===");
        a = 8'hAB; b = 8'hCD;
        $display("{AB, CD}   = %h", {a, b});
        $display("{4{2'b10}} = %b", {4{2'b10}});

        // --- Conditional (Ternary) ---
        $display("\n=== Conditional Operator ===");
        cond = 1;
        result = cond ? 8'hAA : 8'h55;
        $display("1 ? AA : 55 = %h", result);
        cond = 0;
        result = cond ? 8'hAA : 8'h55;
        $display("0 ? AA : 55 = %h", result);

        $finish;
    end
endmodule
