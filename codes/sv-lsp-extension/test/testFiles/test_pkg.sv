// =============================================================================
// Test file: Package with classes for cross-file resolution testing
// =============================================================================

package my_pkg;

  class base_item;
    rand bit [7:0] data;
    rand bit [3:0] id;

    constraint data_c {
      data inside {[0:200]};
    }

    function void display();
      $display("data=0x%02h id=%0d", data, id);
    endfunction
  endclass

  class special_item extends base_item;
    rand bit [15:0] addr;

    constraint addr_c {
      addr[1:0] == 2'b00;
    }

    function void show_addr();
      $display("addr=0x%04h", addr);
    endfunction
  endclass

  typedef bit [31:0] word_t;

endpackage
