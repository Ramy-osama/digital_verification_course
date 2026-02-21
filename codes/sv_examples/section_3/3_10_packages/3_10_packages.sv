// LRM Section 3.10 - Packages: Definition, Import, Scope Resolution

// Package definition
package math_pkg;
    parameter int PI_INT = 3;

    typedef struct {
        int x;
        int y;
    } point_t;

    function automatic int max(int a, int b);
        return (a > b) ? a : b;
    endfunction

    function automatic int min(int a, int b);
        return (a < b) ? a : b;
    endfunction
endpackage

// Another package
package color_pkg;
    typedef enum {RED, GREEN, BLUE, YELLOW} color_t;

    function automatic string color_name(color_t c);
        case (c)
            RED:    return "Red";
            GREEN:  return "Green";
            BLUE:   return "Blue";
            YELLOW: return "Yellow";
            default: return "Unknown";
        endcase
    endfunction
endpackage

module top;
    // Explicit import of specific items
    import math_pkg::point_t;
    import math_pkg::max;

    // Wildcard import
    import color_pkg::*;

    initial begin
        point_t p;
        p.x = 10; p.y = 20;
        $display("point = (%0d, %0d)", p.x, p.y);
        $display("max(%0d, %0d) = %0d", p.x, p.y, max(p.x, p.y));

        // Using scope resolution operator ::
        $display("min(%0d, %0d) = %0d", p.x, p.y, math_pkg::min(p.x, p.y));
        $display("PI_INT = %0d", math_pkg::PI_INT);

        // Using wildcard-imported items
        color_t c = GREEN;
        $display("color = %s (%0d)", color_name(c), c);
        c = BLUE;
        $display("color = %s (%0d)", color_name(c), c);

        $finish;
    end
endmodule
