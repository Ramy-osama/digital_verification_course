//=============================================================================
// LRM Section 7.2 - Structures
// Covers: Anonymous structs, typedef structs, packed structs, assignments
//=============================================================================
module structures_tb;

    //=========================================================================
    // 7.2 Basic Structure Declaration (Anonymous Struct)
    //=========================================================================
    struct {
        bit [7:0]  opcode;
        bit [23:0] addr;
    } IR;

    //=========================================================================
    // 7.2 Named Structure Type (typedef struct)
    //=========================================================================
    typedef struct {
        bit [7:0]  opcode;
        bit [23:0] addr;
    } instruction;

    instruction IR2;

    //=========================================================================
    // 7.2.1 Packed Structures - Signed (2-state)
    //=========================================================================
    struct packed signed {
        int       a;
        shortint  b;
        byte      c;
        bit [7:0] d;
    } pack1;

    //=========================================================================
    // 7.2.1 Packed Structures - Unsigned (4-state)
    //=========================================================================
    struct packed unsigned {
        time         a;
        integer      b;
        logic [31:0] c;
    } pack2;

    //=========================================================================
    // 7.2.1 Packed Structure with typedef (ATM Cell)
    //=========================================================================
    typedef struct packed {
        bit [3:0]          GFC;
        bit [7:0]          VPI;
        bit [11:0]         VCI;
        bit                CLP;
        bit [3:0]          PT;
        bit [7:0]          HEC;
    } s_atmheader;

    s_atmheader atm_hdr;

    //=========================================================================
    // 7.2.2 Assigning to Structures - Default Member Values
    //=========================================================================
    typedef struct {
        int  addr;
        int  crc;
        byte data [4];
    } packet1;

    packet1 p1;

    initial begin
        //=====================================================================
        $display("=== 7.2 Anonymous Struct ===");
        //=====================================================================
        IR.opcode = 8'hAB;
        IR.addr   = 24'h123456;
        $display("IR.opcode = %0h", IR.opcode);
        // Output: IR.opcode = ab
        $display("IR.addr   = %0h", IR.addr);
        // Output: IR.addr   = 123456

        //=====================================================================
        $display("\n=== 7.2 Typedef Struct ===");
        //=====================================================================
        IR2.opcode = 8'hFF;
        IR2.addr   = 24'hDEAD00;
        $display("IR2.opcode = %0h", IR2.opcode);
        // Output: IR2.opcode = ff
        $display("IR2.addr   = %0h", IR2.addr);
        // Output: IR2.addr   = dead00

        //=====================================================================
        $display("\n=== 7.2.1 Packed Struct (signed, 2-state) ===");
        //=====================================================================
        pack1.a = 32'h0000_0001;
        pack1.b = 16'h0002;
        pack1.c = 8'h03;
        pack1.d = 8'h04;
        $display("pack1.a = %0h, pack1.b = %0h, pack1.c = %0h, pack1.d = %0h",
                  pack1.a, pack1.b, pack1.c, pack1.d);
        // Output: pack1.a = 1, pack1.b = 2, pack1.c = 3, pack1.d = 4

        // Packed struct treated as a single vector [63:0]
        $display("pack1 as vector = %0h", pack1);
        // Output: pack1 as vector = 100020304

        // Bit-select from packed struct (c is bits [15:8])
        $display("pack1[15:8] = %0h (same as pack1.c)", pack1[15:8]);
        // Output: pack1[15:8] = 3 (same as pack1.c)

        //=====================================================================
        $display("\n=== 7.2.1 Packed Struct (unsigned, 4-state) ===");
        //=====================================================================
        pack2.a = 64'hAAAA_BBBB_CCCC_DDDD;
        pack2.b = 32'h1111_2222;
        pack2.c = 32'h3333_4444;
        $display("pack2 as vector = %0h", pack2);
        // Output: pack2 as vector = aaaabbbbccccdddd111122223333444

        //=====================================================================
        $display("\n=== 7.2.1 ATM Header Packed Struct ===");
        //=====================================================================
        atm_hdr.GFC = 4'hA;
        atm_hdr.VPI = 8'hBB;
        atm_hdr.VCI = 12'hCCC;
        atm_hdr.CLP = 1'b1;
        atm_hdr.PT  = 4'h5;
        atm_hdr.HEC = 8'hFF;
        $display("ATM Header GFC=%0h VPI=%0h VCI=%0h CLP=%0b PT=%0h HEC=%0h",
                  atm_hdr.GFC, atm_hdr.VPI, atm_hdr.VCI,
                  atm_hdr.CLP, atm_hdr.PT, atm_hdr.HEC);
        // Output: ATM Header GFC=a VPI=bb VCI=ccc CLP=1 PT=5 HEC=ff
        $display("ATM Header as single vector = %0h", atm_hdr);
        // Output: ATM Header as single vector = abbcccbfff
        $display("Bit width of atm_hdr = %0d bits", $bits(atm_hdr));
        // Output: Bit width of atm_hdr = 38 bits

        //=====================================================================
        $display("\n=== 7.2.2 Assigning to Structures ===");
        //=====================================================================

        // Default initialization (addr=0, crc=0, data='{0,0,0,0})
        $display("p1.addr = %0d (default)", p1.addr);
        // Output: p1.addr = 0 (default)
        $display("p1.crc  = %0d (default)", p1.crc);
        // Output: p1.crc  = 0 (default)

        // Assignment pattern overrides defaults
        p1 = '{10, 32'hDEAD, '{8'hAA, 8'hBB, 8'hCC, 8'hDD}};
        $display("After assignment pattern:");
        $display("  p1.addr    = %0d", p1.addr);
        // Output:   p1.addr    = 10
        $display("  p1.crc     = %0h", p1.crc);
        // Output:   p1.crc     = dead
        $display("  p1.data[0] = %0h", p1.data[0]);
        // Output:   p1.data[0] = aa
        $display("  p1.data[3] = %0h", p1.data[3]);
        // Output:   p1.data[3] = dd

        // Named assignment pattern
        p1 = '{addr: 42, crc: 32'hBEEF, data: '{1, 2, 3, 4}};
        $display("After named assignment pattern:");
        $display("  p1.addr = %0d, p1.crc = %0h", p1.addr, p1.crc);
        // Output:   p1.addr = 42, p1.crc = beef

        $display("\n=== End of Section 7.2 Examples ===");
        $finish;
    end

endmodule
