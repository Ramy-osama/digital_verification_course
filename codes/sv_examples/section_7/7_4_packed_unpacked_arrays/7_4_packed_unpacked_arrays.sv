//=============================================================================
// LRM Section 7.4 - Packed and Unpacked Arrays
// Covers: Declarations, operations, memories, multidimensional arrays,
//         indexing/slicing, array querying functions (7.11)
//=============================================================================
module packed_unpacked_arrays_tb;

    initial begin
        //=====================================================================
        $display("=== 7.4.1 Packed Array Declarations ===");
        //=====================================================================
        begin
            bit [7:0] c1;           // packed array of scalar bit types
            bit [3:0][7:0] data32;  // 4 bytes packed into 32 bits

            c1 = 8'hA5;
            $display("c1 = %h", c1);
            // Output: c1 = a5

            data32 = 32'hCAFE_BABE;
            $display("data32         = %h", data32);
            // Output: data32         = cafebabe
            $display("data32[3]      = %h (MSByte)", data32[3]);
            // Output: data32[3]      = ca (MSByte)
            $display("data32[0]      = %h (LSByte)", data32[0]);
            // Output: data32[0]      = be (LSByte)

            // Packed array used in arithmetic
            $display("data32 + 1     = %h", data32 + 1);
            // Output: data32 + 1     = cafebabf
        end

        //=====================================================================
        $display("\n=== 7.4.2 Unpacked Array Declarations ===");
        //=====================================================================
        begin
            int ArrayA[0:7][0:31];  // using ranges
            int ArrayB[8][32];      // using sizes (equivalent to above)

            real u[7:0];            // unpacked array of reals

            ArrayA[0][0] = 42;
            ArrayB[0][0] = 42;
            $display("ArrayA[0][0] = %0d", ArrayA[0][0]);
            // Output: ArrayA[0][0] = 42
            $display("ArrayB[0][0] = %0d", ArrayB[0][0]);
            // Output: ArrayB[0][0] = 42

            u[0] = 3.14;
            $display("u[0] = %f", u[0]);
            // Output: u[0] = 3.140000
        end

        //=====================================================================
        $display("\n=== 7.4.3 Operations on Arrays ===");
        //=====================================================================
        begin
            int A[0:3], B[0:3];

            A = '{10, 20, 30, 40};
            B = '{10, 20, 30, 40};

            // Array equality
            if (A == B)
                $display("A == B : TRUE");
            // Output: A == B : TRUE

            // Element read/write
            A[2] = 99;
            $display("After A[2]=99: A[2]=%0d", A[2]);
            // Output: After A[2]=99: A[2]=99

            // Slice read/write
            B[1:2] = A[1:2];
            $display("After slice copy: B[1]=%0d, B[2]=%0d", B[1], B[2]);
            // Output: After slice copy: B[1]=20, B[2]=99

            // Inequality after modification
            if (A != B)
                $display("A != B : TRUE (after modification)");
            // Output: A != B : TRUE (after modification)
        end

        //=====================================================================
        $display("\n=== 7.4.4 Memories ===");
        //=====================================================================
        begin
            logic [7:0] mema [0:255];
            logic [7:0] data;

            mema[5]  = 8'hAA;
            mema[10] = 8'h55;
            data = mema[5];
            $display("mema[5]  = %h", data);
            // Output: mema[5]  = aa
            $display("mema[10] = %h", mema[10]);
            // Output: mema[10] = 55
            $display("mema[0]  = %h (uninitialized = x)", mema[0]);
            // Output: mema[0]  = xx (uninitialized = x)
        end

        //=====================================================================
        $display("\n=== 7.4.5 Multidimensional Arrays ===");
        //=====================================================================
        begin
            // 10 elements, each is 4 packed bytes (32 bits)
            bit [3:0][7:0] joe [1:10];

            joe[1] = 32'h01020304;
            joe[2] = 32'h05060708;

            $display("joe[1]       = %h", joe[1]);
            // Output: joe[1]       = 01020304
            $display("joe[1][3]    = %h (MSByte)", joe[1][3]);
            // Output: joe[1][3]    = 01 (MSByte)
            $display("joe[1][0]    = %h (LSByte)", joe[1][0]);
            // Output: joe[1][0]    = 04 (LSByte)

            // 4-byte add
            joe[3] = joe[1] + joe[2];
            $display("joe[3] = joe[1]+joe[2] = %h", joe[3]);
            // Output: joe[3] = joe[1]+joe[2] = 06080a0c

            // 2-byte copy
            joe[4][3:2] = joe[1][1:0];
            $display("joe[4][3:2] = joe[1][1:0] -> joe[4][3]=%h, joe[4][2]=%h",
                      joe[4][3], joe[4][2]);
            // Output: joe[4][3:2] = joe[1][1:0] -> joe[4][3]=03, joe[4][2]=04
        end

        //=====================================================================
        $display("\n=== 7.4.5 Typedef Staging of Dimensions ===");
        //=====================================================================
        begin
            typedef bit [1:5] bsix;
            bsix [1:10] v5;

            typedef bsix mem_type [0:3];
            mem_type ba [0:1];

            v5[1] = 5'b10101;
            $display("v5[1] = %b", v5[1]);
            // Output: v5[1] = 10101

            ba[0][0] = 5'b11100;
            $display("ba[0][0] = %b", ba[0][0]);
            // Output: ba[0][0] = 11100
        end

        //=====================================================================
        $display("\n=== 7.4.5 Integer Types as Packed Arrays ===");
        //=====================================================================
        begin
            byte     c2;
            integer  i1;

            c2 = 8'hF0;
            i1 = 32'hABCD_1234;

            // Can be selected as if packed array [n-1:0]
            $display("c2       = %h", c2);
            // Output: c2       = f0
            $display("c2[7:4]  = %h", c2[7:4]);
            // Output: c2[7:4]  = f
            $display("i1[31:16]= %h", i1[31:16]);
            // Output: i1[31:16]= abcd
        end

        //=====================================================================
        $display("\n=== 7.4.6 Indexing and Slicing ===");
        //=====================================================================
        begin
            logic [63:0] data;
            logic [7:0]  byte2;

            data = 64'h0123_4567_89AB_CDEF;

            // Part-select
            byte2 = data[23:16];
            $display("data[23:16] = %h", byte2);
            // Output: data[23:16] = ab

            // Indexed select from packed array
            begin
                bit [3:0][7:0] j;
                byte k;
                j = 32'hAABBCCDD;
                k = j[2];
                $display("j[2] = %h", k);
                // Output: j[2] = bb
            end

            // Slice of unpacked array
            begin
                bit signed [31:0] busA [7:0];
                int busB [1:0];
                busA[7] = 32'h700;
                busA[6] = 32'h600;
                busB = busA[7:6];
                $display("busB[0]=%0h, busB[1]=%0h", busB[0], busB[1]);
                // Output: busB[0]=700, busB[1]=600
            end

            // Variable-width part-select (+: and -:)
            begin
                logic [31:0] bitvec;
                int j_idx;
                bitvec = 32'hFEDC_BA98;
                j_idx = 8;
                $display("bitvec[%0d +: 8] = %h", j_idx, bitvec[j_idx +: 8]);
                // Output: bitvec[8 +: 8] = a9 (bits [15:8])
                $display("bitvec[23 -: 8] = %h", bitvec[23 -: 8]);
                // Output: bitvec[23 -: 8] = dc (bits [23:16])
            end
        end

        //=====================================================================
        $display("\n=== 7.11 Array Querying Functions ===");
        //=====================================================================
        begin
            logic [7:0] arr [3:0][2:0];

            $display("$left(arr, 1)              = %0d", $left(arr, 1));
            // Output: $left(arr, 1)              = 3
            $display("$right(arr, 1)             = %0d", $right(arr, 1));
            // Output: $right(arr, 1)             = 0
            $display("$low(arr, 1)               = %0d", $low(arr, 1));
            // Output: $low(arr, 1)               = 0
            $display("$high(arr, 1)              = %0d", $high(arr, 1));
            // Output: $high(arr, 1)              = 3
            $display("$size(arr, 1)              = %0d", $size(arr, 1));
            // Output: $size(arr, 1)              = 4
            $display("$size(arr, 2)              = %0d", $size(arr, 2));
            // Output: $size(arr, 2)              = 3
            $display("$dimensions(arr)           = %0d", $dimensions(arr));
            // Output: $dimensions(arr)           = 3
            $display("$unpacked_dimensions(arr)  = %0d", $unpacked_dimensions(arr));
            // Output: $unpacked_dimensions(arr)  = 2
            $display("$increment(arr, 1)         = %0d", $increment(arr, 1));
            // Output: $increment(arr, 1)         = -1
        end

        $display("\n=== End of Section 7.4 / 7.11 Examples ===");
        $finish;
    end

endmodule
