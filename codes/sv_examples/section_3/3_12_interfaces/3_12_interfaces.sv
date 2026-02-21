// LRM Section 3.12 - Interfaces: Declaration, Modports

// Interface groups related signals together
interface bus_if (input logic clk);
    logic       valid;
    logic       ready;
    logic [7:0] data;

    // Modports define directional views
    modport master (output valid, data, input  ready);
    modport slave  (input  valid, data, output ready);
endinterface

// Producer module uses master modport
module producer (bus_if.master bus);
    logic [7:0] counter = 0;
    always @(posedge bus.valid) begin
        bus.data  = counter;
        counter   = counter + 1;
    end
endmodule

// Consumer module uses slave modport
module consumer (bus_if.slave bus);
    always @(posedge bus.valid) begin
        bus.ready = 1;
    end
endmodule

// Testbench
module top;
    logic clk = 0;
    always #5 clk = ~clk;

    bus_if bif (clk);

    producer u_prod (.bus(bif));
    consumer u_cons (.bus(bif));

    initial begin
        bif.valid = 0; bif.ready = 0; bif.data = 0;

        #10;
        bif.valid = 1; bif.data = 8'hAA;
        #10;
        $display("valid=%b, data=%h, ready=%b", bif.valid, bif.data, bif.ready);

        bif.valid = 0;
        #10;
        bif.valid = 1; bif.data = 8'h55;
        #10;
        $display("valid=%b, data=%h, ready=%b", bif.valid, bif.data, bif.ready);

        $finish;
    end
endmodule
