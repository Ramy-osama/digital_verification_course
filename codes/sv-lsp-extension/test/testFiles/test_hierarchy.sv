// =============================================================================
// Test file for Class Inheritance Hierarchy feature
//
// Hierarchy:
//
//                  uvm_object
//                      |
//                base_transaction
//                 /            \
//      read_transaction    write_transaction
//                               |
//                      burst_write_transaction
//
// =============================================================================


// Root class (simulating an external UVM base class)
class uvm_object;
    int obj_id;

    function void print();
        $display("obj_id = %0d", obj_id);
    endfunction
endclass


// Base transaction extending uvm_object
class base_transaction extends uvm_object;
    rand bit [31:0] addr;
    rand bit [7:0]  data;
    rand bit [3:0]  id;

    constraint valid_addr {
        addr inside {[32'h0000_0000 : 32'h0000_FFFF]};
    }

    function void display();
        $display("addr=0x%08h data=0x%02h id=%0d", addr, data, id);
    endfunction
endclass


// Read transaction
class read_transaction extends base_transaction;
    rand int unsigned read_latency;

    constraint latency_c {
        read_latency inside {[1:10]};
    }

    function void display();
        super.display();
        $display("  read_latency = %0d", read_latency);
    endfunction
endclass


// Write transaction
class write_transaction extends base_transaction;
    rand bit [7:0] write_data[];
    rand bit       write_strobe;

    constraint data_size_c {
        write_data.size() inside {[1:16]};
    }

    function void display();
        super.display();
        $display("  write_strobe = %0b, data_size = %0d", write_strobe, write_data.size());
    endfunction
endclass


// Burst write extends write
class burst_write_transaction extends write_transaction;
    rand int unsigned burst_length;
    rand bit [1:0]    burst_type;

    constraint burst_c {
        burst_length inside {1, 2, 4, 8, 16};
        burst_type inside {[0:2]};
    }

    function void display();
        super.display();
        $display("  burst_length = %0d, burst_type = %0d", burst_length, burst_type);
    endfunction
endclass


// =============================================================================
// Macro-based extends test
//
// Extended Hierarchy:
//
//                  uvm_object
//                      |
//                base_transaction
//                 /      |       \
//   read_transaction  write_transaction  macro_transaction
//                       |
//              burst_write_transaction
//
// =============================================================================

`define MACRO_BASE base_transaction
`define MACRO_WRITE write_transaction

// This class extends via a `define macro — the parser should resolve it
class macro_transaction extends `MACRO_BASE;
    rand bit [15:0] macro_field;
endclass

// This class extends via a different macro
class macro_burst extends `MACRO_WRITE;
    rand bit [3:0] burst_id;
endclass


// Testbench to exercise the hierarchy
module test_hierarchy_tb;
    initial begin
        burst_write_transaction bw;
        read_transaction rd;

        bw = new();
        rd = new();

        repeat(5) begin
            assert(bw.randomize()) else $fatal(1, "BW randomize failed");
            bw.display();
            $display("---");
        end

        repeat(5) begin
            assert(rd.randomize()) else $fatal(1, "RD randomize failed");
            rd.display();
            $display("---");
        end

        $finish;
    end
endmodule
