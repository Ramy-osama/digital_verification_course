//=============================================================================
// LRM Section 7.9 - Associative Array Methods
// Covers: num/size, delete, exists, first/last/next/prev, literals, assignment
//=============================================================================
module associative_array_methods_tb;

    initial begin
        //=====================================================================
        $display("=== 7.9.1 num() and size() ===");
        //=====================================================================
        begin
            int imem[int];

            imem[3]        = 1;
            imem[16'hFFFF] = 2;
            imem[4'b1000]  = 3;

            $display("imem.num()  = %0d", imem.num());
            // Output: imem.num()  = 3
            $display("imem.size() = %0d", imem.size());
            // Output: imem.size() = 3
        end

        //=====================================================================
        $display("\n=== 7.9.2 delete() - Single Entry and All ===");
        //=====================================================================
        begin
            int map[string];

            map["hello"] = 1;
            map["sad"]   = 2;
            map["world"] = 3;
            $display("Before delete: map.size() = %0d", map.size());
            // Output: Before delete: map.size() = 3

            map.delete("sad");
            $display("After delete(\"sad\"): map.size() = %0d", map.size());
            // Output: After delete("sad"): map.size() = 2

            map.delete;
            $display("After delete all: map.size() = %0d", map.size());
            // Output: After delete all: map.size() = 0
        end

        //=====================================================================
        $display("\n=== 7.9.3 exists() ===");
        //=====================================================================
        begin
            int map[string];
            map["hello"] = 1;
            map["world"] = 2;

            if (map.exists("hello"))
                $display("map.exists(\"hello\") = 1 (found)");
            // Output: map.exists("hello") = 1 (found)

            if (!map.exists("missing"))
                $display("map.exists(\"missing\") = 0 (not found)");
            // Output: map.exists("missing") = 0 (not found)
        end

        //=====================================================================
        $display("\n=== 7.9.4 first() ===");
        //=====================================================================
        begin
            int map[string];
            string s;

            map["banana"] = 2;
            map["apple"]  = 1;
            map["cherry"] = 3;

            if (map.first(s))
                $display("First entry: map[\"%s\"] = %0d", s, map[s]);
            // Output: First entry: map["apple"] = 1
        end

        //=====================================================================
        $display("\n=== 7.9.5 last() ===");
        //=====================================================================
        begin
            int map[string];
            string s;

            map["banana"] = 2;
            map["apple"]  = 1;
            map["cherry"] = 3;

            if (map.last(s))
                $display("Last entry: map[\"%s\"] = %0d", s, map[s]);
            // Output: Last entry: map["cherry"] = 3
        end

        //=====================================================================
        $display("\n=== 7.9.6 next() - Forward Traversal ===");
        //=====================================================================
        begin
            int map[string];
            string s;

            map["banana"] = 2;
            map["apple"]  = 1;
            map["cherry"] = 3;
            map["date"]   = 4;

            $display("Forward traversal (lexicographic order):");
            if (map.first(s))
                do
                    $display("  map[\"%s\"] = %0d", s, map[s]);
                while (map.next(s));
            // Output:   map["apple"] = 1
            // Output:   map["banana"] = 2
            // Output:   map["cherry"] = 3
            // Output:   map["date"] = 4
        end

        //=====================================================================
        $display("\n=== 7.9.7 prev() - Reverse Traversal ===");
        //=====================================================================
        begin
            int map[string];
            string s;

            map["banana"] = 2;
            map["apple"]  = 1;
            map["cherry"] = 3;

            $display("Reverse traversal:");
            if (map.last(s))
                do
                    $display("  map[\"%s\"] = %0d", s, map[s]);
                while (map.prev(s));
            // Output:   map["cherry"] = 3
            // Output:   map["banana"] = 2
            // Output:   map["apple"] = 1
        end

        //=====================================================================
        $display("\n=== 7.9.6 next() - Integer-Indexed Traversal ===");
        //=====================================================================
        begin
            string names[int];
            int idx;

            names[100] = "Alice";
            names[5]   = "Bob";
            names[42]  = "Charlie";

            $display("Traversal (signed numerical order):");
            if (names.first(idx))
                do
                    $display("  names[%0d] = %s", idx, names[idx]);
                while (names.next(idx));
            // Output:   names[5] = Bob
            // Output:   names[42] = Charlie
            // Output:   names[100] = Alice
        end

        //=====================================================================
        $display("\n=== 7.9.9 Associative Array Assignment ===");
        //=====================================================================
        begin
            int src[string], dst[string];

            src["a"] = 1;
            src["b"] = 2;
            src["c"] = 3;

            dst = src;  // copy all entries
            $display("dst.size() = %0d (copied from src)", dst.size());
            // Output: dst.size() = 3 (copied from src)
            $display("dst[\"b\"] = %0d", dst["b"]);
            // Output: dst["b"] = 2

            // Modifying dst does not affect src
            dst["b"] = 99;
            $display("After dst[\"b\"]=99: src[\"b\"]=%0d, dst[\"b\"]=%0d",
                      src["b"], dst["b"]);
            // Output: After dst["b"]=99: src["b"]=2, dst["b"]=99
        end

        //=====================================================================
        $display("\n=== 7.9.11 Associative Array Literals ===");
        //=====================================================================
        begin
            // Literal with default value
            string words[int] = '{default: "hello"};
            $display("words[999] = \"%s\" (default)", words[999]);
            // Output: words[999] = "hello" (default)

            // Literal with explicit entries and default
            integer tab[string] = '{"Peter":20, "Paul":22, "Mary":23,
                                     default:-1};
            $display("tab[\"Peter\"]   = %0d", tab["Peter"]);
            // Output: tab["Peter"]   = 20
            $display("tab[\"Paul\"]    = %0d", tab["Paul"]);
            // Output: tab["Paul"]    = 22
            $display("tab[\"unknown\"] = %0d (default)", tab["unknown"]);
            // Output: tab["unknown"] = -1 (default)
        end

        $display("\n=== End of Section 7.9 Examples ===");
        $finish;
    end

endmodule
