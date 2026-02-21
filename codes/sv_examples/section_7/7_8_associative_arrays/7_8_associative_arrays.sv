//=============================================================================
// LRM Section 7.8 - Associative Arrays
// Covers: Wildcard [*], string, int, class index types, element allocation
//=============================================================================
module associative_arrays_tb;

    //=========================================================================
    // Class for class-indexed associative array (7.8.3)
    //=========================================================================
    class MyKey;
        int id;
        function new(int id);
            this.id = id;
        endfunction
        function string to_str();
            return $sformatf("MyKey(id=%0d)", id);
        endfunction
    endclass

    initial begin
        //=====================================================================
        $display("=== 7.8.1 Wildcard Index [*] ===");
        //=====================================================================
        begin
            integer i_array[*];

            i_array[0]     = 100;
            i_array[100]   = 200;
            i_array[65535] = 300;

            $display("i_array[0]     = %0d", i_array[0]);
            // Output: i_array[0]     = 100
            $display("i_array[100]   = %0d", i_array[100]);
            // Output: i_array[100]   = 200
            $display("i_array[65535] = %0d", i_array[65535]);
            // Output: i_array[65535] = 300

            $display("Num entries = %0d", i_array.num());
            // Output: Num entries = 3
        end

        //=====================================================================
        $display("\n=== 7.8.2 String Index ===");
        //=====================================================================
        begin
            bit [20:0] array_b[string];

            array_b["hello"]   = 21'h1AAAAA;
            array_b["world"]   = 21'h1BBBBB;
            array_b[""]        = 21'h000001;  // empty string is valid

            $display("array_b[\"hello\"] = %h", array_b["hello"]);
            // Output: array_b["hello"] = 1aaaaa
            $display("array_b[\"world\"] = %h", array_b["world"]);
            // Output: array_b["world"] = 1bbbbb
            $display("array_b[\"\"]      = %h (empty key is valid)",
                      array_b[""]);
            // Output: array_b[""]      = 000001 (empty key is valid)

            // Lexicographic ordering: "" < "hello" < "world"
            $display("Num entries = %0d", array_b.num());
            // Output: Num entries = 3
        end

        //=====================================================================
        $display("\n=== 7.8.4 Integral Index (int) ===");
        //=====================================================================
        begin
            int scores[int];

            scores[-10] = 50;
            scores[0]   = 75;
            scores[10]  = 100;

            $display("scores[-10] = %0d", scores[-10]);
            // Output: scores[-10] = 50
            $display("scores[0]   = %0d", scores[0]);
            // Output: scores[0]   = 75
            $display("scores[10]  = %0d", scores[10]);
            // Output: scores[10]  = 100

            // Signed numerical ordering: -10 < 0 < 10
            $display("Num entries = %0d", scores.num());
            // Output: Num entries = 3
        end

        //=====================================================================
        $display("\n=== 7.8.3 Class Index ===");
        //=====================================================================
        begin
            int data_map[MyKey];
            MyKey k1, k2, k3;

            k1 = new(1);
            k2 = new(2);
            k3 = new(3);

            data_map[k1] = 111;
            data_map[k2] = 222;
            data_map[k3] = 333;

            $display("data_map[k1] = %0d", data_map[k1]);
            // Output: data_map[k1] = 111
            $display("data_map[k2] = %0d", data_map[k2]);
            // Output: data_map[k2] = 222
            $display("data_map[k3] = %0d", data_map[k3]);
            // Output: data_map[k3] = 333
            $display("Num entries = %0d", data_map.num());
            // Output: Num entries = 3
        end

        //=====================================================================
        $display("\n=== 7.8.6 Reading Nonexistent Entry ===");
        //=====================================================================
        begin
            int arr_int[string];
            string arr_str[int];

            // Reading nonexistent returns default for that type
            $display("Nonexistent int    = %0d (default 0)",  arr_int["nope"]);
            // Output: Nonexistent int    = 0 (default 0)
            $display("Nonexistent string = \"%s\" (default empty)",
                      arr_str[999]);
            // Output: Nonexistent string = "" (default empty)
        end

        //=====================================================================
        $display("\n=== 7.8.7 Allocating on Assignment ===");
        //=====================================================================
        begin
            int a[int] = '{default:1};

            // a[1] does not exist yet; allocated with default=1, then incremented
            a[1]++;
            $display("a[1] after a[1]++ = %0d (allocated with default 1, then incremented)",
                      a[1]);
            // Output: a[1] after a[1]++ = 2 (allocated with default 1, then incremented)

            a[5] = 10;
            a[5] += 3;
            $display("a[5] = %0d", a[5]);
            // Output: a[5] = 13
        end

        //=====================================================================
        $display("\n=== 7.8.7 Struct Default with Allocation ===");
        //=====================================================================
        begin
            typedef struct { int x; int y; } xy_t;
            xy_t b[int];

            // b[2] allocated with struct defaults (x=0, y=0)
            b[2].x = 5;
            $display("b[2].x = %0d, b[2].y = %0d", b[2].x, b[2].y);
            // Output: b[2].x = 5, b[2].y = 0
        end

        $display("\n=== End of Section 7.8 Examples ===");
        $finish;
    end

endmodule
