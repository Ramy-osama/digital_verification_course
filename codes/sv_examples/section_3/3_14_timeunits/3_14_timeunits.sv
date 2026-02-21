// LRM Section 3.14 - Timeunits and Timeprecision

// Method 1: timeunit/timeprecision declarations
module timing_demo;
    timeunit 1ns;
    timeprecision 1ps;

    initial begin
        $timeformat(-9, 3, " ns", 12);

        $display("Time at start: %t", $time);
        #1;
        $display("After #1 (1ns): %t", $time);
        #0.5;
        $display("After #0.5 (0.5ns): %t", $time);
        #10.123;
        $display("After #10.123: %t", $time);

        $display("\n--- Timeunit Info ---");
        $display("timeunit = 1ns, timeprecision = 1ps");
        $display("Delays are in units of 1ns");
        $display("Precision allows sub-ns accuracy");

        $finish;
    end
endmodule

// Top module
module top;
    timing_demo u_demo();
endmodule
