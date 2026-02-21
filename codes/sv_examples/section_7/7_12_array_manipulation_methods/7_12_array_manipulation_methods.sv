//=============================================================================
// LRM Section 7.12 - Array Manipulation Methods
// Covers: Locator, ordering, reduction methods, iterator index querying
//=============================================================================
module array_manipulation_methods_tb;

    initial begin
        //=====================================================================
        $display("=== 7.12.1 Locator Methods - find() ===");
        //=====================================================================
        begin
            int IA[int];
            int qi[$];

            IA[0] = 1;  IA[1] = 8;  IA[2] = 3;
            IA[3] = 12;  IA[4] = 5;  IA[5] = 2;

            // Find all items greater than 5
            qi = IA.find(x) with (x > 5);
            $display("find(x > 5) = %p", qi);
            // Output: find(x > 5) = '{8, 12}
        end

        //=====================================================================
        $display("\n=== 7.12.1 Locator Methods - find_index() ===");
        //=====================================================================
        begin
            int arr[] = '{10, 20, 30, 20, 40};
            int qi[$];

            // Find indices of all items equal to 20
            qi = arr.find_index with (item == 20);
            $display("find_index(==20) = %p", qi);
            // Output: find_index(==20) = '{1, 3}
        end

        //=====================================================================
        $display("\n=== 7.12.1 Locator Methods - find_first / find_last ===");
        //=====================================================================
        begin
            string SA[5] = '{"Alice", "Bob", "Charlie", "Bob", "Eve"};
            string qs[$];

            // Find first "Bob"
            qs = SA.find_first with (item == "Bob");
            $display("find_first(Bob) = %p", qs);
            // Output: find_first(Bob) = '{"Bob"}

            // Find last "Bob"
            qs = SA.find_last with (item == "Bob");
            $display("find_last(Bob)  = %p", qs);
            // Output: find_last(Bob)  = '{"Bob"}

            // Find first index of "Bob"
            begin
                int qi[$];
                qi = SA.find_first_index with (item == "Bob");
                $display("find_first_index(Bob) = %p", qi);
                // Output: find_first_index(Bob) = '{1}
            end

            // Find last index of "Bob"
            begin
                int qi[$];
                qi = SA.find_last_index with (item == "Bob");
                $display("find_last_index(Bob) = %p", qi);
                // Output: find_last_index(Bob) = '{3}
            end
        end

        //=====================================================================
        $display("\n=== 7.12.1 Locator Methods - min / max ===");
        //=====================================================================
        begin
            int arr[] = '{42, 7, 99, 3, 55};
            int qi[$];

            qi = arr.min;
            $display("min = %p", qi);
            // Output: min = '{3}

            qi = arr.max;
            $display("max = %p", qi);
            // Output: max = '{99}
        end

        //=====================================================================
        $display("\n=== 7.12.1 Locator Methods - unique / unique_index ===");
        //=====================================================================
        begin
            int arr[] = '{3, 1, 2, 3, 1, 4, 2};
            int qi[$];

            qi = arr.unique;
            $display("unique = %p", qi);
            // Output: unique = '{3, 1, 2, 4}  (one per unique value)

            qi = arr.unique_index;
            $display("unique_index = %p", qi);
            // Output: unique_index = '{0, 1, 2, 5}  (one index per unique value)
        end

        //=====================================================================
        $display("\n=== 7.12.1 Locator with 'with' Expression ===");
        //=====================================================================
        begin
            string SA[5] = '{"HELLO", "world", "FOO", "bar", "BAZ"};
            string qs[$];

            // Find all unique strings in lowercase
            qs = SA.unique(s) with (s.tolower);
            $display("unique(tolower) = %p", qs);
            // Output: unique(tolower) = '{"HELLO", "world", "FOO", "bar", "BAZ"}
        end

        //=====================================================================
        $display("\n=== 7.12.2 Ordering Methods - reverse() ===");
        //=====================================================================
        begin
            string s[] = '{"hello", "sad", "world"};

            s.reverse;
            $display("After reverse: s = %p", s);
            // Output: After reverse: s = '{"world", "sad", "hello"}
        end

        //=====================================================================
        $display("\n=== 7.12.2 Ordering Methods - sort() ===");
        //=====================================================================
        begin
            int q[$] = '{4, 5, 3, 1};

            q.sort;
            $display("After sort: q = %p", q);
            // Output: After sort: q = '{1, 3, 4, 5}
        end

        //=====================================================================
        $display("\n=== 7.12.2 Ordering Methods - sort() with expression ===");
        //=====================================================================
        begin
            typedef struct {
                byte red, green, blue;
            } color_t;

            color_t c[4];
            c[0] = '{red:200, green:50,  blue:30};
            c[1] = '{red:10,  green:255, blue:100};
            c[2] = '{red:150, green:100, blue:200};
            c[3] = '{red:50,  green:75,  blue:10};

            // Sort by red field only
            c.sort with (item.red);
            $display("After sort by red:");
            foreach (c[i])
                $display("  c[%0d]: R=%0d G=%0d B=%0d",
                          i, c[i].red, c[i].green, c[i].blue);
            // Output:   c[0]: R=10 G=255 B=100
            // Output:   c[1]: R=50 G=75 B=10
            // Output:   c[2]: R=150 G=100 B=200
            // Output:   c[3]: R=200 G=50 B=30

            // Sort by blue then green (concatenated key)
            c.sort(x) with ({x.blue, x.green});
            $display("After sort by {blue,green}:");
            foreach (c[i])
                $display("  c[%0d]: R=%0d G=%0d B=%0d",
                          i, c[i].red, c[i].green, c[i].blue);
            // Output:   c[0]: R=50 G=75 B=10
            // Output:   c[1]: R=200 G=50 B=30
            // Output:   c[2]: R=10 G=255 B=100
            // Output:   c[3]: R=150 G=100 B=200
        end

        //=====================================================================
        $display("\n=== 7.12.2 Ordering Methods - rsort() ===");
        //=====================================================================
        begin
            int q[$] = '{4, 5, 3, 1};

            q.rsort;
            $display("After rsort: q = %p", q);
            // Output: After rsort: q = '{5, 4, 3, 1}
        end

        //=====================================================================
        $display("\n=== 7.12.2 Ordering Methods - shuffle() ===");
        //=====================================================================
        begin
            int q[$] = '{1, 2, 3, 4, 5};

            q.shuffle;
            $display("After shuffle: q = %p (random order)", q);
            // Output: After shuffle: q = '{...} (random order, varies each run)
        end

        //=====================================================================
        $display("\n=== 7.12.3 Reduction Methods - sum() ===");
        //=====================================================================
        begin
            byte b[] = '{1, 2, 3, 4};
            int y;

            y = b.sum;
            $display("sum = %0d", y);
            // Output: sum = 10
        end

        //=====================================================================
        $display("\n=== 7.12.3 Reduction Methods - product() ===");
        //=====================================================================
        begin
            byte b[] = '{1, 2, 3, 4};
            int y;

            y = b.product;
            $display("product = %0d", y);
            // Output: product = 24
        end

        //=====================================================================
        $display("\n=== 7.12.3 Reduction Methods - and / or / xor ===");
        //=====================================================================
        begin
            byte b[] = '{8'hFF, 8'h0F, 8'hF0};
            int y;

            y = b.and;
            $display("and = %h", y);
            // Output: and = 00

            y = b.or;
            $display("or  = %h", y);
            // Output: or  = ff

            y = b.xor;
            $display("xor = %h", y);
            // Output: xor = 00
        end

        //=====================================================================
        $display("\n=== 7.12.3 Reduction with 'with' Clause ===");
        //=====================================================================
        begin
            byte b[] = '{1, 2, 3, 4};
            int y;

            y = b.xor with (item + 4);
            $display("xor with (item+4) = %0d", y);
            // Output: xor with (item+4) = 12  (5^6^7^8 = 12)
        end

        //=====================================================================
        $display("\n=== 7.12.3 Multidimensional sum ===");
        //=====================================================================
        begin
            logic [7:0] m[2][2] = '{'{ 5, 10}, '{15, 20}};
            int y;

            y = m.sum with (item.sum with (item));
            $display("2D sum = %0d", y);
            // Output: 2D sum = 50  (5+10+15+20)
        end

        //=====================================================================
        $display("\n=== 7.12.3 Bit-Width Casting in sum ===");
        //=====================================================================
        begin
            logic bit_arr[8] = '{1, 0, 1, 1, 0, 1, 0, 1};
            int y;

            // Cast to int to avoid 1-bit overflow
            y = bit_arr.sum with (int'(item));
            $display("bit_arr sum (cast to int) = %0d", y);
            // Output: bit_arr sum (cast to int) = 5
        end

        //=====================================================================
        $display("\n=== 7.12.4 Iterator Index Querying ===");
        //=====================================================================
        begin
            int arr[] = '{0, 10, 2, 30, 4};
            int qi[$];

            // Find all items equal to their index position
            qi = arr.find with (item == item.index);
            $display("Items equal to their index: %p", qi);
            // Output: Items equal to their index: '{0, 2, 4}

            // Find indices where value equals index
            qi = arr.find_index with (item == item.index);
            $display("Indices where value==index: %p", qi);
            // Output: Indices where value==index: '{0, 2, 4}
        end

        $display("\n=== End of Section 7.12 Examples ===");
        $finish;
    end

endmodule
