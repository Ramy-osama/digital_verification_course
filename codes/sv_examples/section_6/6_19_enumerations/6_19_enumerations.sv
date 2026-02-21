// LRM Section 6.19 - Enumerations

module top;
    // Basic enum (auto-numbered 0, 1, 2, ...)
    typedef enum {IDLE, READ, WRITE, ERROR} state_t;

    // Enum with explicit values
    typedef enum logic [2:0] {
        CMD_NOP  = 3'b000,
        CMD_READ = 3'b010,
        CMD_WRITE= 3'b011,
        CMD_RST  = 3'b111
    } cmd_t;

    // Enum with ranges
    typedef enum {BRONZE=0, SILVER=5, GOLD=10, PLATINUM=15} rank_t;

    initial begin
        state_t st;
        cmd_t   cmd;
        rank_t  rk;

        // --- Basic Usage ---
        $display("=== Basic Enum ===");
        st = IDLE;
        $display("state = %s (value=%0d)", st.name(), st);
        st = WRITE;
        $display("state = %s (value=%0d)", st.name(), st);

        // --- Enum Methods ---
        $display("\n=== Enum Methods ===");
        st = st.first();
        $display("first() = %s", st.name());
        st = st.last();
        $display("last()  = %s", st.name());
        st = IDLE;
        st = st.next();
        $display("IDLE.next() = %s", st.name());
        st = st.prev();
        $display("READ.prev() = %s", st.name());

        // next with wrap-around
        st = ERROR;
        st = st.next();
        $display("ERROR.next() = %s (wraps around)", st.name());

        // --- Custom Values ---
        $display("\n=== Custom Valued Enum ===");
        cmd = CMD_READ;
        $display("cmd = %s (binary=%b)", cmd.name(), cmd);
        cmd = CMD_RST;
        $display("cmd = %s (binary=%b)", cmd.name(), cmd);

        // --- Iterating with next() ---
        $display("\n=== Iterating All Enum Values ===");
        st = st.first();
        do begin
            $display("  %s = %0d", st.name(), st);
            st = st.next();
        end while (st != st.first());

        // --- Enum in case ---
        $display("\n=== Enum in case Statement ===");
        cmd = CMD_WRITE;
        case (cmd)
            CMD_NOP:   $display("No operation");
            CMD_READ:  $display("Read command");
            CMD_WRITE: $display("Write command");
            CMD_RST:   $display("Reset command");
        endcase

        $finish;
    end
endmodule
