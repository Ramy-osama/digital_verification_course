//=============================================================================
// Testbench: alu_tb
// Description: Coverage demonstration testbench for the 8-bit ALU
//
// Demonstrates:
//   - Covergroups with sampling events
//   - Coverpoints with explicit bins, auto-bins, and illegal_bins
//   - Transition coverage (operation sequences)
//   - Cross coverage (operation x operand ranges)
//   - Constrained randomization
//   - Coverage-driven stimulus (stop when coverage target met)
//   - Self-checking with immediate assertions
//=============================================================================

module alu_tb;

    //=========================================================================
    // Signals
    //=========================================================================
    logic        clk;
    logic [7:0]  a, b;
    logic [2:0]  op;
    logic [7:0]  result;
    logic        zero, carry;

    //=========================================================================
    // DUT Instantiation
    //=========================================================================
    alu dut (
        .a      (a),
        .b      (b),
        .op     (op),
        .result (result),
        .zero   (zero),
        .carry  (carry)
    );

    //=========================================================================
    // Clock Generation: 10ns period
    //=========================================================================
    initial clk = 0;
    always #5 clk = ~clk;

    //=========================================================================
    // Coverage Definitions
    //=========================================================================

    // --- Covergroup: alu_cg ---
    // Sampled on the positive edge of clk
    covergroup alu_cg @(posedge clk);

        // ---- Coverpoint: ALU Operation ----
        // Named bins for every valid operation
        cp_op: coverpoint op {
            bins add_op = {3'b000};
            bins sub_op = {3'b001};
            bins and_op = {3'b010};
            bins or_op  = {3'b011};
            bins xor_op = {3'b100};
            bins not_op = {3'b101};
            bins sll_op = {3'b110};
            bins srl_op = {3'b111};
        }

        // ---- Coverpoint: Operand A (with interesting value bins) ----
        cp_a: coverpoint a {
            bins zero       = {8'h00};
            bins one        = {8'h01};
            bins mid_val    = {[8'h3F:8'h41]};  // around 0x40
            bins high_val   = {[8'hF0:8'hFE]};
            bins all_ones   = {8'hFF};
            bins low_range  = {[8'h02:8'h3E]};
            bins high_range = {[8'h42:8'hEF]};
        }

        // ---- Coverpoint: Operand B (with interesting value bins) ----
        cp_b: coverpoint b {
            bins zero       = {8'h00};
            bins one        = {8'h01};
            bins mid_val    = {[8'h3F:8'h41]};
            bins high_val   = {[8'hF0:8'hFE]};
            bins all_ones   = {8'hFF};
            bins low_range  = {[8'h02:8'h3E]};
            bins high_range = {[8'h42:8'hEF]};
        }

        // ---- Coverpoint: Result ranges ----
        cp_result: coverpoint result {
            bins res_zero    = {8'h00};
            bins res_low     = {[8'h01:8'h7F]};
            bins res_high    = {[8'h80:8'hFE]};
            bins res_max     = {8'hFF};
        }

        // ---- Coverpoint: Zero flag ----
        cp_zero_flag: coverpoint zero {
            bins flag_set   = {1'b1};
            bins flag_clear = {1'b0};
        }

        // ---- Coverpoint: Carry flag ----
        cp_carry_flag: coverpoint carry {
            bins carry_set   = {1'b1};
            bins carry_clear = {1'b0};
        }

        // ---- Transition Coverage on Operations ----
        // Track interesting operation sequences
        cp_op_trans: coverpoint op {
            bins add_to_sub    = (3'b000 => 3'b001);
            bins sub_to_add    = (3'b001 => 3'b000);
            bins arith_to_logic = (3'b000 => 3'b010),
                                  (3'b001 => 3'b010);
            bins logic_to_shift = (3'b010 => 3'b110),
                                  (3'b011 => 3'b110),
                                  (3'b100 => 3'b110);
            bins shift_to_arith = (3'b110 => 3'b000),
                                  (3'b111 => 3'b000);
            bins all_ops_seq    = (3'b000 => 3'b001 => 3'b010 => 3'b011 =>
                                   3'b100 => 3'b101 => 3'b110 => 3'b111);
        }

        // ---- Cross Coverage: Operation x Operand A ----
        // Ensures every operation is tested with every interesting 'a' range
        op_x_a: cross cp_op, cp_a;

        // ---- Cross Coverage: Operation x Operand B ----
        op_x_b: cross cp_op, cp_b;

        // ---- Cross Coverage: Operation x Zero Flag ----
        // Ensures each operation produces both zero and non-zero results
        op_x_zero: cross cp_op, cp_zero_flag;

    endgroup

    // Instantiate covergroup
    alu_cg cg = new();

    //=========================================================================
    // Stimulus Task: Apply inputs and wait one clock
    //=========================================================================
    task automatic apply_stimulus(input logic [2:0] t_op,
                                  input logic [7:0] t_a,
                                  input logic [7:0] t_b);
        @(negedge clk);  // Setup inputs on falling edge
        op = t_op;
        a  = t_a;
        b  = t_b;
        @(posedge clk);  // Covergroup samples here
        #1;              // Small delay for output to settle
    endtask

    //=========================================================================
    // Self-Checking: Verify ADD and SUB results
    //=========================================================================
    task automatic check_add(input logic [7:0] t_a, input logic [7:0] t_b);
        logic [8:0] expected;
        expected = {1'b0, t_a} + {1'b0, t_b};
        assert (result == expected[7:0])
            else $error("ADD FAIL: %0h + %0h = %0h, expected %0h",
                        t_a, t_b, result, expected[7:0]);
        assert (carry == expected[8])
            else $error("ADD CARRY FAIL: %0h + %0h carry=%0b, expected %0b",
                        t_a, t_b, carry, expected[8]);
    endtask

    task automatic check_sub(input logic [7:0] t_a, input logic [7:0] t_b);
        logic [8:0] expected;
        expected = {1'b0, t_a} - {1'b0, t_b};
        assert (result == expected[7:0])
            else $error("SUB FAIL: %0h - %0h = %0h, expected %0h",
                        t_a, t_b, result, expected[7:0]);
    endtask

    //=========================================================================
    // Main Test Stimulus
    //=========================================================================
    initial begin
        // Initialize signals
        op = 3'b000;
        a  = 8'h00;
        b  = 8'h00;

        $display("============================================");
        $display(" ALU Coverage Demonstration - Starting Test");
        $display("============================================");

        //---------------------------------------------------------------------
        // PHASE 1: Directed Tests (Corner Cases)
        //---------------------------------------------------------------------
        $display("\n--- Phase 1: Directed Corner-Case Tests ---");

        // ADD corner cases
        apply_stimulus(3'b000, 8'h00, 8'h00); check_add(8'h00, 8'h00);  // 0+0
        apply_stimulus(3'b000, 8'hFF, 8'h01); check_add(8'hFF, 8'h01);  // overflow
        apply_stimulus(3'b000, 8'hFF, 8'hFF); check_add(8'hFF, 8'hFF);  // max+max
        apply_stimulus(3'b000, 8'h80, 8'h80); check_add(8'h80, 8'h80);  // 128+128
        apply_stimulus(3'b000, 8'h01, 8'h01); check_add(8'h01, 8'h01);  // 1+1

        // SUB corner cases
        apply_stimulus(3'b001, 8'h00, 8'h00); check_sub(8'h00, 8'h00);  // 0-0
        apply_stimulus(3'b001, 8'hFF, 8'h01); check_sub(8'hFF, 8'h01);  // FF-1
        apply_stimulus(3'b001, 8'h00, 8'h01); check_sub(8'h00, 8'h01);  // underflow
        apply_stimulus(3'b001, 8'h40, 8'h40); check_sub(8'h40, 8'h40);  // equal

        // AND/OR/XOR with corner values
        apply_stimulus(3'b010, 8'hFF, 8'h00);  // AND: FF & 00 = 00
        apply_stimulus(3'b010, 8'hFF, 8'hFF);  // AND: FF & FF = FF
        apply_stimulus(3'b011, 8'h00, 8'h00);  // OR:  00 | 00 = 00
        apply_stimulus(3'b011, 8'hAA, 8'h55);  // OR:  AA | 55 = FF
        apply_stimulus(3'b100, 8'hFF, 8'hFF);  // XOR: FF ^ FF = 00
        apply_stimulus(3'b100, 8'hAA, 8'h55);  // XOR: AA ^ 55 = FF

        // NOT corner values
        apply_stimulus(3'b101, 8'h00, 8'h00);  // NOT 00 = FF
        apply_stimulus(3'b101, 8'hFF, 8'h00);  // NOT FF = 00

        // Shift corner values
        apply_stimulus(3'b110, 8'h80, 8'h00);  // SLL: 80 << 1 (carry out)
        apply_stimulus(3'b110, 8'h01, 8'h00);  // SLL: 01 << 1
        apply_stimulus(3'b111, 8'h01, 8'h00);  // SRL: 01 >> 1 (goes to 0)
        apply_stimulus(3'b111, 8'h80, 8'h00);  // SRL: 80 >> 1

        // Trigger the sequential transition: 000->001->010->011->100->101->110->111
        apply_stimulus(3'b000, 8'h12, 8'h34);
        apply_stimulus(3'b001, 8'h56, 8'h78);
        apply_stimulus(3'b010, 8'h9A, 8'hBC);
        apply_stimulus(3'b011, 8'hDE, 8'hF0);
        apply_stimulus(3'b100, 8'h11, 8'h22);
        apply_stimulus(3'b101, 8'h33, 8'h44);
        apply_stimulus(3'b110, 8'h55, 8'h66);
        apply_stimulus(3'b111, 8'h77, 8'h88);

        $display("Phase 1 Coverage: %.2f%%", cg.get_coverage());

        //---------------------------------------------------------------------
        // PHASE 2: Constrained-Random Stimulus
        //---------------------------------------------------------------------
        $display("\n--- Phase 2: Constrained-Random Stimulus (500 iterations) ---");

        repeat (500) begin
            logic [2:0] rand_op;
            logic [7:0] rand_a, rand_b;

            // Randomize
            assert(std::randomize(rand_op));
            assert(std::randomize(rand_a));
            assert(std::randomize(rand_b));

            apply_stimulus(rand_op, rand_a, rand_b);

            // Self-check for arithmetic operations
            if (rand_op == 3'b000) check_add(rand_a, rand_b);
            if (rand_op == 3'b001) check_sub(rand_a, rand_b);
        end

        $display("Phase 2 Coverage: %.2f%%", cg.get_coverage());

        //---------------------------------------------------------------------
        // PHASE 3: Coverage-Driven Closing Loop
        //---------------------------------------------------------------------
        $display("\n--- Phase 3: Coverage-Driven Closing Loop (target: 98%%) ---");

        begin
            automatic int iter_count = 0;
            while (cg.get_coverage() < 98.0 && iter_count < 2000) begin
                logic [2:0] rand_op;
                logic [7:0] rand_a, rand_b;

                assert(std::randomize(rand_op));
                assert(std::randomize(rand_a));
                assert(std::randomize(rand_b));

                apply_stimulus(rand_op, rand_a, rand_b);
                iter_count++;

                // Print progress every 200 iterations
                if (iter_count % 200 == 0)
                    $display("  Iteration %0d, Coverage: %.2f%%",
                             iter_count, cg.get_coverage());
            end
            $display("  Closing loop finished after %0d iterations", iter_count);
        end

        //---------------------------------------------------------------------
        // Final Coverage Report
        //---------------------------------------------------------------------
        $display("\n============================================");
        $display(" FINAL COVERAGE RESULTS");
        $display("============================================");
        $display("  Overall Coverage:    %.2f%%", cg.get_coverage());
        $display("  cp_op Coverage:      %.2f%%", cg.cp_op.get_coverage());
        $display("  cp_a Coverage:       %.2f%%", cg.cp_a.get_coverage());
        $display("  cp_b Coverage:       %.2f%%", cg.cp_b.get_coverage());
        $display("  cp_result Coverage:  %.2f%%", cg.cp_result.get_coverage());
        $display("  cp_zero_flag:        %.2f%%", cg.cp_zero_flag.get_coverage());
        $display("  cp_carry_flag:       %.2f%%", cg.cp_carry_flag.get_coverage());
        $display("  cp_op_trans:         %.2f%%", cg.cp_op_trans.get_coverage());
        $display("  op_x_a Cross:        %.2f%%", cg.op_x_a.get_coverage());
        $display("  op_x_b Cross:        %.2f%%", cg.op_x_b.get_coverage());
        $display("  op_x_zero Cross:     %.2f%%", cg.op_x_zero.get_coverage());
        $display("============================================\n");

        #100;
        $finish;
    end

    //=========================================================================
    // Timeout Watchdog
    //=========================================================================
    initial begin
        #1_000_000;
        $display("ERROR: Simulation timeout!");
        $finish;
    end

endmodule
