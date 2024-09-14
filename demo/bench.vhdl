library ieee;
use ieee.std_logic_1164.all;

entity BENCH is
end entity;

architecture ALGO of BENCH is
	signal CLOCK: std_logic := '0';
	signal RESET: std_logic := '1';
	signal LED  : std_logic;

	signal RST_DUR: integer := 0;
	constant RST_DELAY : integer := 4;

	component BLINK
	port (
		CLOCK : IN  std_logic;
		RESET : IN  std_logic;
		LED   : OUT std_logic
	);
	end component BLINK;
	

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
		if RST_DUR < RST_DELAY then
			RST_DUR <= RST_DUR + 1;
		else
			RESET <= '0';
		end if;
		CLOCK <= not CLOCK;
	end process;

end architecture;