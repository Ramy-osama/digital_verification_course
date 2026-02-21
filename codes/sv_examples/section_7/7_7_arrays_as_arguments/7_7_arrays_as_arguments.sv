//=============================================================================
// LRM Section 7.7 - Arrays as Arguments to Subroutines
// Covers: Pass by value, pass by ref, compatibility rules
//=============================================================================
module arrays_as_arguments_tb;

    //=========================================================================
    // Task accepting a fixed-size 2D array (3x3)
    //=========================================================================
    task print_matrix(int a[3:1][3:1]);
        $display("  Matrix contents:");
        for (int i = 3; i >= 1; i--)
            $display("    [%0d]: %0d %0d %0d", i, a[i][1], a[i][2], a[i][3]);
    endtask

    //=========================================================================
    // Task accepting a fixed-size 1D array of 4 strings
    //=========================================================================
    task print_names(string arr[4:1]);
        $display("  Names:");
        for (int i = 1; i <= 4; i++)
            $display("    [%0d]: %s", i, arr[i]);
    endtask

    //=========================================================================
    // Task accepting a dynamic array of strings
    //=========================================================================
    task print_dynamic(string arr[]);
        $display("  Dynamic array (size=%0d):", arr.size());
        foreach (arr[i])
            $display("    [%0d]: %s", i, arr[i]);
    endtask

    //=========================================================================
    // Task modifying array via pass-by-reference
    //=========================================================================
    task double_elements(ref int arr[]);
        foreach (arr[i])
            arr[i] = arr[i] * 2;
    endtask

    //=========================================================================
    // Function accepting fixed-size array, returning sum
    //=========================================================================
    function int sum_array(int arr[0:3]);
        int s = 0;
        foreach (arr[i]) s += arr[i];
        return s;
    endfunction

    initial begin
        //=====================================================================
        $display("=== 7.7 Fixed-Size Array Argument (2D, 3x3) ===");
        //=====================================================================
        begin
            int b[3:1][3:1];
            for (int i = 1; i <= 3; i++)
                for (int j = 1; j <= 3; j++)
                    b[i][j] = i * 10 + j;

            print_matrix(b);
            // Output:   Matrix contents:
            // Output:     [3]: 31 32 33
            // Output:     [2]: 21 22 23
            // Output:     [1]: 11 12 13
        end

        //=====================================================================
        $display("\n=== 7.7 Compatible Ranges (different range, same size) ===");
        //=====================================================================
        begin
            int c[1:3][0:2];  // different ranges but same size 3x3
            for (int i = 1; i <= 3; i++)
                for (int j = 0; j <= 2; j++)
                    c[i][j] = i * 100 + j;

            print_matrix(c);  // OK: same dimension and size
            // Output:   Matrix contents:
            // Output:     [3]: 300 301 302
            // Output:     [2]: 200 201 202
            // Output:     [1]: 100 101 102
        end

        //=====================================================================
        $display("\n=== 7.7 Fixed-Size String Array Argument ===");
        //=====================================================================
        begin
            string names[4:1] = '{"Alice", "Bob", "Charlie", "Diana"};
            print_names(names);
            // Output:   Names:
            // Output:     [1]: Alice
            // Output:     [2]: Bob
            // Output:     [3]: Charlie
            // Output:     [4]: Diana
        end

        //=====================================================================
        $display("\n=== 7.7 Dynamic Array Passed to Dynamic Formal ===");
        //=====================================================================
        begin
            string fruits[] = '{"Apple", "Banana", "Cherry"};
            print_dynamic(fruits);
            // Output:   Dynamic array (size=3):
            // Output:     [0]: Apple
            // Output:     [1]: Banana
            // Output:     [2]: Cherry
        end

        //=====================================================================
        $display("\n=== 7.7 Fixed-Size Passed to Dynamic Formal ===");
        //=====================================================================
        begin
            string vegs[3] = '{"Carrot", "Potato", "Onion"};
            print_dynamic(vegs);  // OK: fixed can be passed to dynamic formal
            // Output:   Dynamic array (size=3):
            // Output:     [0]: Carrot
            // Output:     [1]: Potato
            // Output:     [2]: Onion
        end

        //=====================================================================
        $display("\n=== 7.7 Pass by Reference (ref) ===");
        //=====================================================================
        begin
            int data[] = '{10, 20, 30, 40};
            $display("Before double: data = %p", data);
            // Output: Before double: data = '{10, 20, 30, 40}

            double_elements(data);
            $display("After  double: data = %p", data);
            // Output: After  double: data = '{20, 40, 60, 80}
        end

        //=====================================================================
        $display("\n=== 7.7 Function with Fixed-Size Array Argument ===");
        //=====================================================================
        begin
            int vals[0:3] = '{10, 20, 30, 40};
            int total;
            total = sum_array(vals);
            $display("sum_array({10,20,30,40}) = %0d", total);
            // Output: sum_array({10,20,30,40}) = 100
        end

        $display("\n=== End of Section 7.7 Examples ===");
        $finish;
    end

endmodule
