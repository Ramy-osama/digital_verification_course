// Code your testbench here
// or browse Examples


class tb_solve;
rand bit [9:0] len;
rand bit [9:0] even;
rand bit [9:0] odd;


constraint even_c {
  
  even[0] == 0; 
  
}
constraint odd_c {
  odd[0] == 1; 
}

constraint c {
  len dist {even := 70, odd := 30};
}

endclass




module tb();


tb_solve tb_solve_i;
int even_count, odd_count;


initial begin 
  tb_solve_i = new();
  
  repeat(1000) begin 
    tb_solve_i.randomize();
    if(tb_solve_i.len % 2 == 0) begin 
      even_count = even_count + 1;
    end else begin 
      odd_count = odd_count + 1;
    end
    $display("len value is %0d", tb_solve_i.len);
  end
  $display("even count is %0d, odd count is %0d", even_count, odd_count);
  
end


endmodule