class address_alligned;

    rand bit [3:0] addr;
    rand bit [3:0] addr_correct;
    rand bit [3:0] err_inj;
    rand bit [2:0] size; 


    constraint size_word {
        $onehot(size);
    }

    constraint address_alligned {
        addr_correct % size == 0;
    }

    constraint err_inj_c {
        addr dist {addr_correct := 95, err_inj := 5};
    }


endclass



module address_alligned_tb;

    address_alligned a1;
    initial begin
        a1 = new();
        repeat(10) begin
            assert(a1.randomize()) else $fatal(1, "Randomization failed");
            $display("address = %0d, size = %0d", a1.addr, a1.size);
        end
    end
endmodule