// =============================================================================
// Test file: Uses imports and class-type variables
// =============================================================================

`include "test_pkg.sv"

import my_pkg::*;

module import_test_tb;
  initial begin
    base_item bi;
    special_item si;

    bi = new();
    si = new();

    assert(bi.randomize()) else $fatal(1, "randomize failed");
    bi.display();

    assert(si.randomize()) else $fatal(1, "randomize failed");
    si.display();
    si.show_addr();

    $finish;
  end
endmodule
