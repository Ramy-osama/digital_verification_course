// LRM Section 4 - Scheduling Semantics:
// Blocking (=) vs Non-Blocking (<=) and Race Conditions

module top;

    // --- Blocking vs Non-Blocking ---
    logic a, b, c;

    // Demo 1: Blocking assignments execute sequentially
    initial begin
        $display("=== Blocking Assignments (=) ===");
        a = 0; b = 0; c = 0;
        a = 1;     // executes first
        b = a;     // sees a=1
        c = b;     // sees b=1
        $display("Blocking:     a=%b, b=%b, c=%b", a, b, c);
    end

    // Demo 2: Non-blocking assignments all sample BEFORE updating
    logic x, y, z;
    initial begin
        $display("=== Non-Blocking Assignments (<=) ===");
        #1;
        x = 1; y = 0; z = 0;
        #1;
        x <= 0;    // schedules x=0
        y <= x;    // samples x=1 (old value), schedules y=1
        z <= y;    // samples y=0 (old value), schedules z=0
        #0;        // let NBA update
        #1;
        $display("Non-Blocking: x=%b, y=%b, z=%b", x, y, z);
    end

    // Demo 3: Race condition with blocking in always blocks
    logic clk = 0;
    logic [7:0] pipe_a, pipe_b;
    always #5 clk = ~clk;

    // WRONG: blocking in sequential logic causes race
    // (order depends on simulator scheduling)
    // always @(posedge clk) pipe_a = 8'hAA;
    // always @(posedge clk) pipe_b = pipe_a;  // may or may not see 8'hAA

    // CORRECT: non-blocking in sequential logic
    always @(posedge clk) pipe_a <= 8'hAA;
    always @(posedge clk) pipe_b <= pipe_a;    // always sees OLD pipe_a

    initial begin
        pipe_a = 8'h00; pipe_b = 8'h00;
        #1;
        $display("\n=== Pipeline with Non-Blocking ===");
        $display("Before clock: pipe_a=%h, pipe_b=%h", pipe_a, pipe_b);
        @(posedge clk); #1;
        $display("After clk 1:  pipe_a=%h, pipe_b=%h", pipe_a, pipe_b);
        @(posedge clk); #1;
        $display("After clk 2:  pipe_a=%h, pipe_b=%h", pipe_a, pipe_b);

        $display("\n=== Rules of Thumb ===");
        $display("1. Use = (blocking) in combinational logic");
        $display("2. Use <= (non-blocking) in sequential logic");
        $display("3. Never mix = and <= for same signal");

        $finish;
    end
endmodule
