// LRM Section 3.13 - Subroutines: Functions and Tasks

module top;

    // --- Functions ---
    // Function with return value (combinational, no delays)
    function automatic int factorial(int n);
        if (n <= 1) return 1;
        else        return n * factorial(n - 1);
    endfunction

    // Function with multiple outputs via ref
    function automatic void swap(ref int a, ref int b);
        int temp;
        temp = a;
        a = b;
        b = temp;
    endfunction

    // Function with default argument
    function int clamp(int val, int lo = 0, int hi = 255);
        if (val < lo) return lo;
        if (val > hi) return hi;
        return val;
    endfunction

    // --- Tasks ---
    // Tasks CAN contain delays (unlike functions)
    task automatic delayed_print(input string msg, input int delay_ns);
        #delay_ns;
        $display("[%0t] %s", $time, msg);
    endtask

    // Task with output
    task automatic compute_sum(input int a, b, output int result);
        result = a + b;
        #1;
    endtask

    initial begin
        int x, y, res;

        // Function calls
        $display("factorial(5) = %0d", factorial(5));
        $display("factorial(0) = %0d", factorial(0));

        x = 10; y = 20;
        swap(x, y);
        $display("After swap: x=%0d, y=%0d", x, y);

        $display("clamp(300) = %0d", clamp(300));
        $display("clamp(-5)  = %0d", clamp(-5));
        $display("clamp(100) = %0d", clamp(100));

        // Task calls
        delayed_print("Hello after 10ns", 10);
        compute_sum(30, 12, res);
        $display("compute_sum(30,12) = %0d", res);

        $finish;
    end
endmodule
