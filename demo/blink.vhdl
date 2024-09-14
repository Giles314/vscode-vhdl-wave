library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity BLINK is
	port (
		CLOCK : in std_logic;
		RESET : in std_logic;
		LED   : out std_logic
	);
end entity;

architecture ALGO of BLINK is

	signal COUNTER : unsigned(23 downto 0);

begin

	COUNT: process(CLOCK, RESET)
	begin
		if RESET = '1' then
			COUNTER <= (others => '0');
		elsif rising_edge(CLOCK) then
			COUNTER <= COUNTER + 1;
		end if;
	end process;

	LED <= COUNTER(23);

end architecture;