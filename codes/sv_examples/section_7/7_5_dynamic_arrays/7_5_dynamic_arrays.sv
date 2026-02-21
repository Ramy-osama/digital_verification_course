//=============================================================================
// LRM Section 7.5 - Dynamic Arrays
// Covers: Declaration, new[], resize, size(), delete()
//=============================================================================
module dynamic_arrays_tb;

    initial begin
        //=====================================================================
        $display("=== 7.5 Dynamic Array Declaration ===");
        //=====================================================================
        begin
            bit [3:0] nibble[];   // dynamic array of 4-bit vectors
            integer   mem[2][];   // fixed-size array of 2 dynamic subarrays

            $display("nibble.size() = %0d (uninitialized)", nibble.size());
            // Output: nibble.size() = 0 (uninitialized)
        end

        //=====================================================================
        $display("\n=== 7.5.1 new[] Constructor ===");
        //=====================================================================
        begin
            int arr[];

            // Set size to 5, default initialized to 0
            arr = new[5];
            $display("arr.size() = %0d", arr.size());
            // Output: arr.size() = 5
            $display("arr[0]=%0d, arr[4]=%0d (defaults)", arr[0], arr[4]);
            // Output: arr[0]=0, arr[4]=0 (defaults)

            // Assign some values
            foreach (arr[i]) arr[i] = (i + 1) * 10;
            $display("After foreach: arr = %p", arr);
            // Output: After foreach: arr = '{10, 20, 30, 40, 50}
        end

        //=====================================================================
        $display("\n=== 7.5.1 new[] with Initialization ===");
        //=====================================================================
        begin
            int isrc[3] = '{5, 6, 7};
            int idest[];

            // Copy source array into dynamic array
            idest = new[3](isrc);
            $display("idest = %p", idest);
            // Output: idest = '{5, 6, 7}
        end

        //=====================================================================
        $display("\n=== 7.5.1 Resize with Truncation and Padding ===");
        //=====================================================================
        begin
            int src[3] = '{2, 3, 4};
            int dest1[], dest2[];

            // Truncate: new size < source size
            dest1 = new[2](src);
            $display("Truncated (size 2): dest1 = %p", dest1);
            // Output: Truncated (size 2): dest1 = '{2, 3}

            // Pad: new size > source size (padded with 0)
            dest2 = new[5](src);
            $display("Padded   (size 5): dest2 = %p", dest2);
            // Output: Padded   (size 5): dest2 = '{2, 3, 4, 0, 0}
        end

        //=====================================================================
        $display("\n=== 7.5.1 Resize Preserving Contents ===");
        //=====================================================================
        begin
            integer addr[];

            addr = new[4];
            foreach (addr[i]) addr[i] = i * 100;
            $display("Before resize: addr = %p (size=%0d)", addr, addr.size());
            // Output: Before resize: addr = '{0, 100, 200, 300} (size=4)

            // Double the size, preserving old contents
            addr = new[8](addr);
            $display("After  resize: addr = %p (size=%0d)", addr, addr.size());
            // Output: After  resize: addr = '{0, 100, 200, 300, 0, 0, 0, 0} (size=8)
        end

        //=====================================================================
        $display("\n=== 7.5.2 size() Method ===");
        //=====================================================================
        begin
            int arr[];
            arr = new[10];
            $display("arr.size() = %0d", arr.size());
            // Output: arr.size() = 10

            // Quadruple the array
            arr = new[arr.size() * 4](arr);
            $display("After quadruple: arr.size() = %0d", arr.size());
            // Output: After quadruple: arr.size() = 40
        end

        //=====================================================================
        $display("\n=== 7.5.3 delete() Method ===");
        //=====================================================================
        begin
            int ab[];
            ab = new[5];
            foreach (ab[i]) ab[i] = i;
            $display("Before delete: ab.size() = %0d", ab.size());
            // Output: Before delete: ab.size() = 5

            ab.delete;
            $display("After  delete: ab.size() = %0d", ab.size());
            // Output: After  delete: ab.size() = 0
        end

        $display("\n=== End of Section 7.5 Examples ===");
        $finish;
    end

endmodule
