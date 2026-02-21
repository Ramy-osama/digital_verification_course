//=============================================================================
// LRM Section 7.10 - Queues
// Covers: Declaration, operators, methods, assignment-based manipulation
//=============================================================================
module queues_tb;

    initial begin
        //=====================================================================
        $display("=== 7.10 Queue Declaration ===");
        //=====================================================================
        begin
            byte    q1[$];                     // unbounded queue of bytes
            string  names[$] = {"Bob"};        // queue with one element
            integer Q[$]     = {3, 2, 7};      // initialized queue
            bit     q2[$:255];                 // bounded queue (max 256)

            $display("q1.size()    = %0d (empty)", q1.size());
            // Output: q1.size()    = 0 (empty)
            $display("names.size() = %0d", names.size());
            // Output: names.size() = 1
            $display("names[0]     = %s", names[0]);
            // Output: names[0]     = Bob
            $display("Q            = %p", Q);
            // Output: Q            = '{3, 2, 7}
        end

        //=====================================================================
        $display("\n=== 7.10.1 Queue Operators - Slicing ===");
        //=====================================================================
        begin
            int Q[$] = {10, 20, 30, 40, 50};
            int slice[$];

            // Q[1:3] -> elements at indices 1, 2, 3
            slice = Q[1:3];
            $display("Q[1:3] = %p", slice);
            // Output: Q[1:3] = '{20, 30, 40}

            // Q[n:n] -> single-element queue
            slice = Q[2:2];
            $display("Q[2:2] = %p", slice);
            // Output: Q[2:2] = '{30}

            // Q[a:b] where a > b -> empty queue
            slice = Q[3:1];
            $display("Q[3:1] = %p (empty, a > b)", slice);
            // Output: Q[3:1] = '{} (empty, a > b)

            // Q[0:$] -> entire queue
            slice = Q[0:$];
            $display("Q[0:$] = %p", slice);
            // Output: Q[0:$] = '{10, 20, 30, 40, 50}
        end

        //=====================================================================
        $display("\n=== 7.10.2.1 size() ===");
        //=====================================================================
        begin
            int Q[$] = {1, 2, 3, 4, 5};
            $display("Q.size() = %0d", Q.size());
            // Output: Q.size() = 5
        end

        //=====================================================================
        $display("\n=== 7.10.2.2 insert() ===");
        //=====================================================================
        begin
            int Q[$] = {10, 20, 30};

            Q.insert(1, 15);  // insert 15 at index 1
            $display("After insert(1,15): Q = %p", Q);
            // Output: After insert(1,15): Q = '{10, 15, 20, 30}

            Q.insert(0, 5);   // insert at front
            $display("After insert(0,5):  Q = %p", Q);
            // Output: After insert(0,5):  Q = '{5, 10, 15, 20, 30}
        end

        //=====================================================================
        $display("\n=== 7.10.2.3 delete() ===");
        //=====================================================================
        begin
            int Q[$] = {10, 20, 30, 40, 50};

            Q.delete(2);  // delete element at index 2
            $display("After delete(2): Q = %p", Q);
            // Output: After delete(2): Q = '{10, 20, 40, 50}

            Q.delete;     // delete all elements
            $display("After delete:    Q.size() = %0d", Q.size());
            // Output: After delete:    Q.size() = 0
        end

        //=====================================================================
        $display("\n=== 7.10.2.4 pop_front() ===");
        //=====================================================================
        begin
            int Q[$] = {100, 200, 300};
            int e;

            e = Q.pop_front();
            $display("pop_front() returned %0d, Q = %p", e, Q);
            // Output: pop_front() returned 100, Q = '{200, 300}
        end

        //=====================================================================
        $display("\n=== 7.10.2.5 pop_back() ===");
        //=====================================================================
        begin
            int Q[$] = {100, 200, 300};
            int e;

            e = Q.pop_back();
            $display("pop_back() returned %0d, Q = %p", e, Q);
            // Output: pop_back() returned 300, Q = '{100, 200}
        end

        //=====================================================================
        $display("\n=== 7.10.2.6 push_front() ===");
        //=====================================================================
        begin
            int Q[$] = {20, 30};

            Q.push_front(10);
            $display("After push_front(10): Q = %p", Q);
            // Output: After push_front(10): Q = '{10, 20, 30}
        end

        //=====================================================================
        $display("\n=== 7.10.2.7 push_back() ===");
        //=====================================================================
        begin
            int Q[$] = {10, 20};

            Q.push_back(30);
            $display("After push_back(30): Q = %p", Q);
            // Output: After push_back(30): Q = '{10, 20, 30}
        end

        //=====================================================================
        $display("\n=== 7.10.4 Queue Manipulation via Assignment ===");
        //=====================================================================
        begin
            int q[$] = {2, 4, 8};
            int e = 99;
            int pos = 1;

            // push_back equivalent
            q = {q, 6};
            $display("push_back(6):     q = %p", q);
            // Output: push_back(6):     q = '{2, 4, 8, 6}

            // push_front equivalent
            q = {e, q};
            $display("push_front(99):   q = %p", q);
            // Output: push_front(99):   q = '{99, 2, 4, 8, 6}

            // pop_front equivalent
            q = q[1:$];
            $display("pop_front:        q = %p", q);
            // Output: pop_front:        q = '{2, 4, 8, 6}

            // pop_back equivalent
            q = q[0:$-1];
            $display("pop_back:         q = %p", q);
            // Output: pop_back:         q = '{2, 4, 8}

            // insert at position
            e = 55;
            pos = 1;
            q = {q[0:pos-1], e, q[pos:$]};
            $display("insert(1,55):     q = %p", q);
            // Output: insert(1,55):     q = '{2, 55, 4, 8}

            // clear
            q = {};
            $display("clear:            q.size() = %0d", q.size());
            // Output: clear:            q.size() = 0
        end

        //=====================================================================
        $display("\n=== 7.10.4 Advanced Slice Operations ===");
        //=====================================================================
        begin
            int q[$] = {10, 20, 30, 40, 50};

            // Remove first two items
            q = q[2:$];
            $display("q[2:$]:           q = %p", q);
            // Output: q[2:$]:           q = '{30, 40, 50}

            // Remove first and last
            q = {10, 20, 30, 40, 50};
            q = q[1:$-1];
            $display("q[1:$-1]:         q = %p", q);
            // Output: q[1:$-1]:         q = '{20, 30, 40}
        end

        //=====================================================================
        $display("\n=== 7.10.5 Bounded Queue ===");
        //=====================================================================
        begin
            int bq[$:3] = {10, 20, 30};  // max 4 elements (indices 0..3)

            $display("Bounded queue:    bq = %p (max size 4)", bq);
            // Output: Bounded queue:    bq = '{10, 20, 30} (max size 4)

            bq.push_back(40);
            $display("After push_back(40): bq = %p", bq);
            // Output: After push_back(40): bq = '{10, 20, 30, 40}

            $display("bq.size() = %0d (at max)", bq.size());
            // Output: bq.size() = 4 (at max)
        end

        $display("\n=== End of Section 7.10 Examples ===");
        $finish;
    end

endmodule
