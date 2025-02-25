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
use basic_comp.counter;

entity SIMPLE_COUNTER is
	generic (
		WIDTH  : INTEGER
	);
	port (
		CLOCK   : in std_logic;
		RESET   : in std_logic;
		Q       : OUT STD_LOGIC_VECTOR (WIDTH-1 downto 0)
	);
end entity SIMPLE_COUNTER;


architecture ALGO of SIMPLE_COUNTER is

	component COUNTER
	generic (
		WIDTH  : INTEGER;
		MODULO : INTEGER
	);
	port (
		CLK    : IN  STD_LOGIC;
		RESET  : IN  STD_LOGIC;
		ENABLE : IN  STD_LOGIC;
		UP     : IN  STD_LOGIC;
		LOAD   : IN  STD_LOGIC;
		D      : IN  STD_LOGIC_VECTOR (WIDTH-1 downto 0) := ( others => '0' );
		Q      : OUT STD_LOGIC_VECTOR (WIDTH-1 downto 0);
		CARRY  : OUT STD_LOGIC
	);
	end component COUNTER;

begin

	i_COUNTER : COUNTER
	generic map (
		WIDTH  => WIDTH,
		MODULO => 2 ** WIDTH
	)
	port map (
		CLK    => CLOCK,
		RESET  => RESET,
		ENABLE => '1',
		UP     => '1',
		LOAD   => '0',
		D      => ( others => '0' ),
		Q      => Q,
		CARRY  => open
	);	

end architecture;