// LRM Section 6.5-6.8 - Nets and Variables: wire, logic, reg

module driver1 (output wire [7:0] bus);
    assign bus = 8'hAA;
endmodule

module driver2 (output wire [7:0] bus);
    assign bus = 8'h55;
endmodule

module top;
    initial begin
        // --- Variables ---
        $display("=== Variables (logic, reg, int) ===");

        // logic: replaces reg in most cases
        logic [7:0] my_logic;
        my_logic = 8'hFF;
        $display("logic = %h", my_logic);

        // logic can be used in continuous assign AND procedural
        // reg can ONLY be used procedurally
        reg [7:0] my_reg;
        my_reg = 8'hAA;
        $display("reg   = %h", my_reg);

        $display("logic replaces reg for most use cases");
        $display("logic supports 4 values: 0, 1, x, z");

        // --- Nets ---
        $display("\n=== Net Types ===");
        $display("%-8s %s", "wire", "most common, for connections");
        $display("%-8s %s", "wand", "wired-AND of drivers");
        $display("%-8s %s", "wor", "wired-OR of drivers");
        $display("%-8s %s", "tri", "same as wire, multiple drivers");
        $display("%-8s %s", "supply0", "tied to ground");
        $display("%-8s %s", "supply1", "tied to VCC");

        // --- wire vs logic ---
        $display("\n=== wire vs logic ===");
        $display("wire:  can have multiple drivers (resolved)");
        $display("logic: single driver only (procedural or assign)");
        $display("Use wire for multi-driver buses");
        $display("Use logic everywhere else (replaces reg)");

        // --- Implicit vs Explicit ---
        $display("\n=== Variable Scope ===");
        begin : my_block
            int local_var = 42;
            $display("local_var in block = %0d", local_var);
        end

        $finish;
    end
endmodule
