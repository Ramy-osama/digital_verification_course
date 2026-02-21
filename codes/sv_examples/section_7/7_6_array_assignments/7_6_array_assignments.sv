//=============================================================================
// LRM Section 7.6 - Array Assignments
// Covers: Fixed-to-fixed, dynamic-to-fixed, unpacked array concatenation
//=============================================================================
module array_assignments_tb;

    initial begin
        //=====================================================================
        $display("=== 7.6 Fixed-Size to Fixed-Size Assignment ===");
        //=====================================================================
        begin
            int A[10:1];
            int B[0:9];

            foreach (B[i]) B[i] = i * 11;
            A = B;  // OK: compatible type and same size (10 elements)

            // Left-to-right correspondence: B[0]->A[10], B[1]->A[9], etc.
            $display("A[10]=%0d (was B[0])", A[10]);
            // Output: A[10]=0 (was B[0])
            $display("A[9] =%0d (was B[1])", A[9]);
            // Output: A[9] =11 (was B[1])
            $display("A[1] =%0d (was B[9])", A[1]);
            // Output: A[1] =99 (was B[9])
        end

        //=====================================================================
        $display("\n=== 7.6 Fixed-Size to Dynamic Assignment ===");
        //=====================================================================
        begin
            int A[100:1];
            int B[];
            int C[];

            foreach (A[i]) A[i] = i;

            // Dynamic auto-resizes to match source
            B = A;
            $display("B.size() = %0d (matches A)", B.size());
            // Output: B.size() = 100 (matches A)
            $display("B[0]=%0d, B[99]=%0d", B[0], B[99]);
            // Output: B[0]=100, B[99]=1

            C = new[8];
            foreach (C[i]) C[i] = i * 100;
            B = C;
            $display("After B=C: B.size() = %0d", B.size());
            // Output: After B=C: B.size() = 8
            $display("B[0]=%0d, B[7]=%0d", B[0], B[7]);
            // Output: B[0]=0, B[7]=700
        end

        //=====================================================================
        $display("\n=== 7.6 Dynamic to Fixed-Size Assignment ===");
        //=====================================================================
        begin
            int A[2][100:1];
            int B[];

            B = new[100];
            foreach (B[i]) B[i] = i + 1;

            A[1] = B;  // OK: both are arrays of 100 ints
            $display("A[1][100]=%0d, A[1][1]=%0d", A[1][100], A[1][1]);
            // Output: A[1][100]=1, A[1][1]=100
        end

        //=====================================================================
        $display("\n=== 7.6 Unpacked Array Concatenation ===");
        //=====================================================================
        begin
            string d[1:5] = '{"a", "b", "c", "d", "e"};
            string p[];

            // Concatenate slices + literal into dynamic array
            p = {d[1:3], "hello", d[4:5]};
            $display("p.size() = %0d", p.size());
            // Output: p.size() = 6
            $display("p = %p", p);
            // Output: p = '{"a", "b", "c", "hello", "d", "e"}
        end

        //=====================================================================
        $display("\n=== 7.6 Wire to Variable Array Assignment ===");
        //=====================================================================
        begin
            logic [7:0] V1[10:1];
            logic [7:0] V2[10];

            foreach (V1[i]) V1[i] = i * 5;
            V2 = V1;  // compatible assignment
            $display("V2[0]=%0d (was V1[10]), V2[9]=%0d (was V1[1])",
                      V2[0], V2[9]);
            // Output: V2[0]=50 (was V1[10]), V2[9]=5 (was V1[1])
        end

        $display("\n=== End of Section 7.6 Examples ===");
        $finish;
    end

endmodule
