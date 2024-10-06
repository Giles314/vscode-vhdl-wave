-- MIT License

-- Copyright (c) 2024 Philippe Chevrier

-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:

-- The above copyright notice and this permission notice shall be included in all
-- copies or substantial portions of the Software.

-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.


library ieee;
use ieee.std_logic_1164.all;
use std.textio.all;

entity BENCH is
end entity;

architecture ALGO of BENCH is
	signal CLOCK: std_logic := '1';
	signal RESET: std_logic := '1';
	signal LED  : std_logic;

	signal CLOCK_COUNT : integer := 0;
	constant RST_DELAY : integer := 4;

	component BLINK
	port (
		CLOCK : IN  std_logic;
		RESET : IN  std_logic;
		LED   : OUT std_logic
	);
	end component BLINK;

	procedure LOG_LOOP (LOOP_COUNT : in integer) is
		variable PRINT_LINE : line;
		constant LINE_LABEL : string := "Loop ";
	begin
		write(PRINT_LINE, LINE_LABEL);
		write(PRINT_LINE, LOOP_COUNT, right, 9);
		writeline(output, PRINT_LINE);
	end LOG_LOOP;
	

begin

	DUT_BLINK : BLINK
	port map (
		CLOCK => CLOCK,
		RESET => RESET,
		LED   => LED
	);


	PERIODIC_LOOP: process
	begin
		wait for 50 ns;
		CLOCK <= not CLOCK;
		if CLOCK_COUNT mod 2000 = 0 then
			LOG_LOOP(CLOCK_COUNT/20);
		end if;
		CLOCK_COUNT <= CLOCK_COUNT + 1;
	end process;

	RESET <= '0' when CLOCK_COUNT >= RST_DELAY else '1';

end architecture;