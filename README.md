<h1 align="center"> VHDL Wave </h1>
This extension allows you to invoke GHDL functions, as well as GTKWave to perform simlation of VHDL files. Beyond, it lists the errors that were reported by GHDL in the GHDL Output channel. Using <ctrl> key you can click the description of the error location in the log to reach that location and fix your mistake.

![VHDL-Wave usage](https://github.com/Giles314/vscode-vhdl-wave/blob/master/res/huge/ghdl_demo.gif?raw=true)

## Requirements

You will need to have [GHDL](https://github.com/ghdl/ghdl/releases) and [GTKWave](http://gtkwave.sourceforge.net/) installed on your system. Furthermore both must be set in your environment variables.

You also need Cologne Chip GateMate Tool Chain to synthetize for this FPGA. Refer to the corresponding paragraph below for more details.

| Environment Variables | Directory Paths             |
|-----------------------|-----------------------------|
| PATH                  | GHDL and GTKWave bin directories |
| GATEMATE_TOOLCHAIN_PATH | bin directory parent of yosis, p_r and openFPGALoader |

## Usage

### GHDL

At present it is possible to invoke the following GHDL functions by either right-clicking at the editor or at the explorer on the specific file and then selecting the desired funtion.

| Editor Option    | GHDL Function                  |
| ---------------- | :----------------------------- |
| GHDL > Analyze   | `ghdl -a [File]`               |
| GHDL > Elaborate | `ghdl -e [Unit]`               |
| GHDL > Run       | `ghdl -r [Unit] [export file]` |
| GHDL > Make      | `ghdl -m [unit]` (+ run if OK) |
| GHDL > Remove    | `ghdl --remove`                |

The log of these commands is displayed in the `OUTPUT` panel. When `analyze` displays syntax errors,
clicking on the error location line number in the `OUTPUT` brings your cursor to the error location in your source file.

The `GHDL > Run` and `GHDL > Make` commands produce a Wave file (suffix .ghw). Its name and location are determined by `Wave Dir Path` setting (see details in paragraph `Directories from Setting` below).

### GTKWave

To open your simulation files with GTKWave, simply right-click on them (.ghw or .vcd file required) in the explorer and then select `GTKWave`.

## Cologne Chip GateMate Tool Chain _(new in V2.0)_

To make use of these functions you need to install the GateMate Tool Chain. Part of it, is open source, but other parts are not.
So you must download it on the [Cologne Chip web site](https://colognechip.com/programmable-logic/gatemate/#tab-313423).
Then after unzipping the downloaded package in a directory, define an environment variable called `GATEMATE_TOOLCHAIN_PATH`
so it refers to the `bin` sub-directory that contains the yosys, p_r and OpenFPGALoader tools.

### Yosys synthesis

Yosys is able to synthesize a hardware design to produce an optimized net list referring to logic gates parts of Cologne Chip GateMate basic logic gates and IPs. Unfortunately Yosis is working with Verilog sources and output. But it can use GHDL as a plug-in to convert VHDL hardware design into a basic net list and process it as a starting point to perform the synthesis of the net list.

Because Verilog is case-sensitive, Yosys interprets GHDL output in case-sensitive way. As GHDL use always same case representation for all occurence of a given name, so this is not an issue. The only case of inconsistency occurs when specifiying the top unit.

> To avoid top unit case issue always write the top unit name in lower case (at least when declaring the entity) and name the corresponding source file in lower case.

The VHDL source files that will be compiled by Yosys are those included in the `src` directory and its sub-directories,
at the root of the workspace directory. This behaviour can not yet be modified ([issue #17](https://github.com/Giles314/vscode-vhdl-wave/issues/17)).
VHDL-Wave will also include in the synthesis, the libraries that are listed in the setting parameter `Library: Library Directories`.
This should not include the test bench files that are usually not synthesizable and by essence not part of final implemented project.
Therefore the test bench files must not be located below the `src` directory.

### Place and Route

Place and Route (`p_r`) is a software developped by Cologne Chip that converts the net list obtained by Yosys synthesis of your VHDL hardware design
to an actual GateMate FPGA implementation. To compute this, it needs the mapping of the design inputs and outputs to the FPGA pins (balls for this chip).
This must be provided in a file called `<module-filename>.ccf` that must be placed in the same directory as the top module source file.
> Again because `p_r` is case-sensitive, the pin name case must match the signal name case used in top entity declaration.

Check the example files from the GateMate tool chain package for syntax of this `.ccf` file.

### OpenFPGALoader

OpenFPGALoader is an open source software capable to upload a FPGA configuration through a FPGA or SPI interface and through several hardware and drivers managing this interface. In addition, the configuration may be loaded in the FPGA cache memory or in a flash memory. The effective configuration must be selected in the `Tool Chain: Load Interface` setting.

At this stage only 6 configuration are supported and only one (the default) has been tested with corresponding hardware. Please give feedback if you have tested (successfuly or not) one of the untested options.

| Option Name                   | Hardware Interface | Target | Target Interface | Status     |
| ----------------------------- | ------------------ | ------ | ---------------- | ---------- |
| dirtyjtag-jtag-fpga (default) | (pico-)dirtyjtag   | FPGA   | JTAG             | **Tested** |
| dirtyjtag-jtag-flash          | (pico-)dirtyjtag   | Flash  | JTAG             | NOT Tested |
| gatemate-evb-jtag-fpga        | GateMate EVB       | FPGA   | JTAG             | NOT Tested |
| gatemate-evb-jtag-flash       | GateMate EVB       | Flash  | JTAG             | NOT Tested |
| gatemate-evb-spi-fpga         | GateMate EVB       | FPGA   | SPI              | NOT Tested |
| gatemate-evb-spi-flash        | GateMate EVB       | Flash  | SPI              | NOT Tested |

## Keybindings

It is also possible to invoke the GHDL functions via the following keybindings.

| Editor Option  | Windows          | Linux             | MacOS             |
| -------------- | :--------------- | :---------------- | :---------------- |
| ghdl analyze   | `ctrl + alt + a` | `shift + alt + a` | `shift + cmd + a` |
| ghdl elaborate | `ctrl + alt + l` | `shift + alt + e` | `shift + cmd + e` |
| ghdl run       | `ctrl + alt + r` | `shift + alt + r` | `shift + cmd + r` |
| ghdl make      | `ctrl + alt + m` | `shift + alt + m` | `shift + cmd + m` |
| ghdl remove    | `ctrl + alt + d` | `shift + alt + d` | `shift + cmd + d` |
| synthesize     | `ctrl + alt + s` | `shift + alt + s` | `shift + cmd + s` |
| implement      | `ctrl + alt + i` | `shift + alt + i` | `shift + cmd + i` |
| load FPGA      | `ctrl + alt + f` | `shift + alt + f` | `shift + cmd + f` |

## VHDL-LS

VHDL-Wave recommends VHDL-LS for syntax highlighting. VHDL-Wave automatically generates the configuration file that VHDL-LS needs to
find all references. This feature can be disabled in setting (see `vhdl-wave > General: Enable Ls Toml`).

It is still possible to complement the generated `vhdl-ls.toml` file with additional data. This must be done below the limit indicated in the file.

When a library is added to the configuration (setting `Library Directories`) this directory is searched for files following library naming rule:

`<library-name>_obj<vhdl-version>.cf`

These library files are then parsed to find the corresponding source files which are then added to `vhdl-ls.toml` file.

## VHDL-Wave Directories

### Directories from Setting

Several directories must be configured in VHDL-Wave settings:

`Build Root Path`: This directory will contain all the files produced  
by the gateway toolchain, the default GTKWave files generation location
and the default place where the GHDL library is created.
By defauit this directory is located below the workspace root
and is called `build`.

The build directory content should not be kept in configuration management.
Add an entry in `.gitignore` file to exclude this directory.

> This directory must exist to run VHDL-wave tool commands.
So if this directory cannot be found none of the VHDL-wave tool commands
are available, instead a special command to create the directory is provided.
Once the directory is created the tool commands become available.

`Work Library Path`: This directory will contain the GHDL library
(it is not the directory that is the GHDL library but it contains it).
By default (when left empty) this directory is the `Build Root Path`.

`Library Directories`: When your design refers to a non-standard library that
has been built outside of your projet, GHDL must be aware of the directory where to find it.
This is the role of each entry of this list of directories.
Like for `Work Library Path` the directories in this list are not library directories
but directories that contain library directories.
Each directory may contain several libraries,
either the same one built for various language versions
or several different libraries built for the same language version (or a mix).

`Wave Dir Path`: This parameter is used to determine the directory path of the Wave file produced by `GHDL > Run` or `GHDL > Make` commands.
If left empty, the directory path defaults to the `Build Root Path`.
Note that the generated file is named like the run TOP unit with a `.ghw` extension.

> All these paths may be specified in absolute or relative way.
Relative paths are relative to the workspace directory.

### Directories from Environment Variables

VHDL-Wave will use other directories that are not defined in settings:
It will search PATH environment variable for the directories that contains
the binaries for GHDL and GTKWave.

It will also used the variable `GATEMATE_TOOLCHAIN_PATH` to locate the directory that contains the GateMate tool chain binaries. See above more details about this.

### Building and using Custom Libraries

When building a custom library set your `Work Library Path` at the place where you expect your library to be stored.

Avoid to leave the `Work Library Path` in the build directory (default value) as you probably don't want your library to be deleted when cleaning the build directory.

Set your library name in parameter settings `Work Library Name`.

When using your library from another project, you may use default build directory, and keep your working library in it, keeping also its default `work` name by leaving `Work Library Path`, `Work Library Name` and `Build Root Path` empty.

But you will add the library directory path (the value of `Work Library Path` settings when you were building the cutom library) to the list of `Library Directories`.

And of course in the units using the custom library you will add the following line:

`library <the-library-name>`

where `<the-library-name>` is the value of the setting `Work Library Name` when you were building the library.

> Because your settings are different between the library building workspace and the library using workspace, it is recommended to set settings per workspace and avoid user settings that are identical for all workspaces.

## Contributions

In case you encounter any problems or have suggestions regarding the extension, feel free to open an issue at first.

## License

The extension is [licensed](LICENSE "license") under the MIT license.

