//=============================================================================
// LRM Section 7.3 - Unions
// Covers: Unpacked unions, packed unions, tagged unions
//=============================================================================
module unions_tb;

    //=========================================================================
    // 7.3 Basic Union (typedef)
    //=========================================================================
    typedef union {
        int      i;
        shortreal f;
    } num;

    //=========================================================================
    // 7.3 Anonymous Union Inside a Struct
    //=========================================================================
    typedef struct {
        bit isfloat;
        union {
            int      i;
            shortreal f;
        } n;
    } tagged_st;

    //=========================================================================
    // 7.3.1 Packed Union (all members same size)
    //=========================================================================
    typedef union packed {
        logic [31:0] word;
        logic [3:0][7:0] bytes;
        logic [1:0][15:0] halves;
    } word_u;

    //=========================================================================
    // 7.3.2 Tagged Union - VInt Example
    //=========================================================================
    typedef union tagged {
        void Invalid;
        int  Valid;
    } VInt;

    //=========================================================================
    // 7.3.2 Tagged Union - Instruction Example
    //=========================================================================
    typedef union tagged {
        struct {
            bit [4:0] reg1, reg2, regd;
        } Add;
        union tagged {
            bit [9:0] JmpU;
            struct {
                bit [1:0] cc;
                bit [9:0] addr;
            } JmpC;
        } Jmp;
    } Instr;

    num       n1;
    tagged_st ts;
    word_u    wu;
    VInt      vi;
    Instr     instr1, instr2, instr3;

    initial begin
        //=====================================================================
        $display("=== 7.3 Basic Unpacked Union ===");
        //=====================================================================
        n1.i = 42;
        $display("n1.i = %0d", n1.i);
        // Output: n1.i = 42

        n1.f = 3.14;
        $display("n1.f = %f", n1.f);
        // Output: n1.f = 3.140000

        //=====================================================================
        $display("\n=== 7.3 Anonymous Union Inside Struct ===");
        //=====================================================================
        ts.isfloat = 0;
        ts.n.i = 100;
        $display("ts.isfloat=%0b, ts.n.i=%0d", ts.isfloat, ts.n.i);
        // Output: ts.isfloat=0, ts.n.i=100

        ts.isfloat = 1;
        ts.n.f = 2.718;
        $display("ts.isfloat=%0b, ts.n.f=%f", ts.isfloat, ts.n.f);
        // Output: ts.isfloat=1, ts.n.f=2.718000

        //=====================================================================
        $display("\n=== 7.3.1 Packed Union ===");
        //=====================================================================
        wu.word = 32'hDEAD_BEEF;
        $display("wu.word   = %h", wu.word);
        // Output: wu.word   = deadbeef

        $display("wu.bytes[3] = %h (MSB)", wu.bytes[3]);
        // Output: wu.bytes[3] = de (MSB)
        $display("wu.bytes[2] = %h", wu.bytes[2]);
        // Output: wu.bytes[2] = ad
        $display("wu.bytes[1] = %h", wu.bytes[1]);
        // Output: wu.bytes[1] = be
        $display("wu.bytes[0] = %h (LSB)", wu.bytes[0]);
        // Output: wu.bytes[0] = ef (LSB)

        $display("wu.halves[1] = %h (upper)", wu.halves[1]);
        // Output: wu.halves[1] = dead (upper)
        $display("wu.halves[0] = %h (lower)", wu.halves[0]);
        // Output: wu.halves[0] = beef (lower)

        // Write via bytes, read via word
        wu.bytes[3] = 8'hCA;
        wu.bytes[2] = 8'hFE;
        wu.bytes[1] = 8'hBA;
        wu.bytes[0] = 8'hBE;
        $display("After byte writes: wu.word = %h", wu.word);
        // Output: After byte writes: wu.word = cafebabe

        // Bit-select from packed union (treated as vector [31:0])
        $display("wu[31:24] = %h (same as wu.bytes[3])", wu[31:24]);
        // Output: wu[31:24] = ca (same as wu.bytes[3])

        //=====================================================================
        $display("\n=== 7.3.2 Tagged Union - VInt ===");
        //=====================================================================
        vi = tagged Invalid;
        $display("vi is Invalid (void - no data)");
        // Output: vi is Invalid (void - no data)

        vi = tagged Valid (42);
        $display("vi.Valid = %0d", vi.Valid);
        // Output: vi.Valid = 42

        //=====================================================================
        $display("\n=== 7.3.2 Tagged Union - Instruction Set ===");
        //=====================================================================

        // Add instruction: reg1=1, reg2=2, regd=3
        instr1 = tagged Add '{5'd1, 5'd2, 5'd3};
        $display("Add: reg1=%0d, reg2=%0d, regd=%0d",
                  instr1.Add.reg1, instr1.Add.reg2, instr1.Add.regd);
        // Output: Add: reg1=1, reg2=2, regd=3

        // Unconditional Jump: address=10'h1FF
        instr2 = tagged Jmp (tagged JmpU (10'h1FF));
        $display("JmpU: addr=%0h", instr2.Jmp.JmpU);
        // Output: JmpU: addr=1ff

        // Conditional Jump: cc=2'b01, addr=10'h0AB
        instr3 = tagged Jmp (tagged JmpC '{2'b01, 10'h0AB});
        $display("JmpC: cc=%0b, addr=%0h",
                  instr3.Jmp.JmpC.cc, instr3.Jmp.JmpC.addr);
        // Output: JmpC: cc=1, addr=ab

        $display("\n=== End of Section 7.3 Examples ===");
        $finish;
    end

endmodule
