# [Changelog](https://github.com/Giles314/vscode-vhdl-wave/releases)

## VHDL-Wave

### version 2.0.0

* #24 Improved packaging

### version 1.4.0

* #15 Improve usability of Clean/Remove commands.

### version 1.3.0

* #9 Enhancement: Auto-generate language server configuration file so it can resolve all files and libraries from projects
* #12 Enhancement: Simplify switching between development of library and main project by storing in the workspace the settings that may need to be modified when switching

### version 1.2.2

* #11 Fix incorrect directory used when running analyze command

### version 1.2.1

* #10 Fix packaging and version numbering.

### version 1.2.0

* #3 Improve usability of 'work' directory path in settings
* #4 Add simulation duration limit and fix success message of run command
* #5 Improve time scale usability
* #6 Add waveFile setting that avoids being queried for run target file
* #7 Display output of GHDL or GTKWave commands in real time
* #8 Add support of GHDL Make command

### version 1.1.0 - 14.09.2024

* #1 - Use the output channel to display GHDL output
* #2 - Add test data to be also used for creating the animated GIF

### version 1.0.0 - 08.09.2024

* Name and maintainer change
* Bugs fixed around setup and folders probably link to obsolescence
* Submenu for editor and explorer context menus to avoid cluterring menus

### VHDL-Wave fork

## GHDL-Interface

### Version 1.1.2 - 23.07.2020

* New feature: Set GHDL options in User/Workspace settings

### Version 1.0.2 - 04.07.2020

* Bugfix: changed all occurences of `resourceExtname == vhdl` to `resourceExtname == .vhdl` to recognize the ".vhdl" file extension

### Version 1.0.1 - 16.04.2020

* Added GHDL functions
  * GHDL elaborate
  * GHDL run unit (export to .ghw file)
  * GHDL clean
  * GHDL remove
* GHDL functions can now be invoked from the explorer
* Added keybindings (for more details see README)
* Shows full error message in Toast
* Implemented GTKWave invokation function (only available in explorer)

### Version 0.0.1 - 1.4.2020

* Initial release
* Implemented basic functionality:
  * Analyze files with ghdl
  * Highlight reported errors in editor
* Keybindings (for analyze file):  
  * Windows: cntrl + alt + a
  * Mac: shift + cmd + a
  * Linux: shift + alt + a