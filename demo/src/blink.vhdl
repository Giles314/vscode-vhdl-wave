-- MIT License

-- Copyright (c) 2024-2025 Philippe Chevrier

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
use ieee.numeric_std.all;

library basic_comp;


entity blink is
	generic (
		WIDTH  : INTEGER := 22
	);
	port (
		CLOCK : in std_logic;
		RESET : in std_logic;
		LED   : out std_logic
	);
end entity;


architecture ALGO of blink is

	component SIMPLE_COUNTER
	generic (
		WIDTH  : INTEGER
	);
	port (
		CLOCK  : IN  STD_LOGIC;
		RESET  : IN  STD_LOGIC;
		Q      : OUT STD_LOGIC_VECTOR (WIDTH-1 downto 0)
	);
	end component SIMPLE_COUNTER;
	
	signal Q      : STD_LOGIC_VECTOR (WIDTH-1 downto 0);

begin

	i_SIMPLE_COUNTER : SIMPLE_COUNTER
	generic map (
		WIDTH  => WIDTH
	)
	port map (
		CLOCK  => CLOCK,
		RESET  => not RESET,
		Q      => Q
	);

	LED <= Q(WIDTH-1);

end architecture;