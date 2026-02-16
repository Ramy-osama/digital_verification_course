module accum (
	input  wire	 	   clk , rst ,
	input  wire [31:0] amt ,
	output reg  [31:0] sum
	);

reg [31:0] internal_register ;

always @(posedge clk or posedge rst) begin
	if (rst) begin
		internal_register <= 32'd0  ;
		sum  		 	  <= 32'd0   ;
	end
	else  begin
		internal_register <= internal_register + amt ;
	end
end

always @(negedge clk) begin
	sum <= internal_register ;
end
endmodule 