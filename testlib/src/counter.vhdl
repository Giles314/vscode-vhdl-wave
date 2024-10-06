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
use ieee.numeric_std.all;
use ieee.math_real.all;


-- Generic counter
entity COUNTER is
	generic (
		WIDTH  : INTEGER := 8;
		MODULO : INTEGER := 2 ** WIDTH -1
	);
	port (
		CLK    : in  STD_LOGIC;
		RESET  : in  STD_LOGIC := '0'; -- asynchronous
		ENABLE : in  STD_LOGIC := '1'; -- Stop counting (up or down) when 0. Can be used as CARRY input
		UP     : in  STD_LOGIC := '1'; -- count down when 0
		LOAD   : in  STD_LOGIC := '0'; -- synchronous
		D      : in  STD_LOGIC_VECTOR (WIDTH-1 downto 0) := ( others => '0' ); -- synchronous
		Q      : out STD_LOGIC_VECTOR (WIDTH-1 downto 0);
		CARRY  : out STD_LOGIC         -- Carry output
	);
end entity;


architecture ALGO of COUNTER is
	signal Q_VALUE : UNSIGNED (WIDTH-1 downto 0) := (others => '0');
	constant U_MODULO_M_1 : UNSIGNED (WIDTH-1 downto 0) := TO_UNSIGNED(MODULO - 1, WIDTH);
begin

	process (CLK, RESET, ENABLE, UP, LOAD)
	begin

		if RESET = '1' then  -- Asynchronous reset
			Q_VALUE <= ( others => '0' );

		elsif rising_edge(CLK) then
			if LOAD = '1' then  -- Synchronous load
				Q_VALUE <= UNSIGNED(D);
			elsif ENABLE = '1' then
				if UP = '1' then
					if Q_VALUE = U_MODULO_M_1 then
						Q_VALUE <= (others => '0');
					else
						Q_VALUE <= Q_VALUE + 1;
					end if;
				else
					if Q_VALUE = 0 then
						Q_VALUE <= U_MODULO_M_1;
					else
						Q_VALUE <= Q_VALUE - 1;
					end if;
				end if;
			end if;
		end if;
	end process;

	CARRY   <= '1' when ((UP = '0') and (Q_VALUE = 0)) or ((UP = '1') and (Q_VALUE = MODULO -1)) else '0';
	Q <= STD_LOGIC_VECTOR( Q_VALUE );

end architecture;