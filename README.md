<h1 align="center"> VHDL Wave </h1>
This extension allows you to invoke GHDL functions, as well as GTKWave to perform simlation of VHDL files. Beyond, it lists the errors that were reported by GHDL in the GHDL Output channel. Using <ctrl> key you can click the description of the error location in the log to reach that location and fix your mistake.

![VHDL-Wave usage](https://github.com/Giles314/vscode-vhdl-wave/blob/master/res/huge/ghdl_demo.gif?raw=true)

## Requirements

You will need to have [GHDL](https://github.com/ghdl/ghdl/releases) and [GTKWave](http://gtkwave.sourceforge.net/) installed on your system. Furthermore both must be set in your environment variables.

## Usage

### GHDL

At present it is possible to invoke the following GHDL functions by either right-clicking at the editor or at the explorer on the specific file and then selecting the desired funtion.

| Editor Option  | GHDL Function                  |
| -------------- | :----------------------------- |
| ghdl analyze   | `ghdl -a [File]`               |
| ghdl elaborate | `ghdl -e [Unit]`               |
| ghdl run       | `ghdl -r [Unit] [export file]` |
| ghdl make      | `ghdl -m [unit]` (+ run if OK) |
| ghdl remove    | `ghdl --remove`                |

In addition to that the GHDL analyze function offers you error highlighting in the editor.

### GTKWave

To open your simulation files with GTKWave, simply right-click on them (.ghw or .vcd file required) in the explorer and then select `gtkwave`

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

Not available yet.


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

## VHDL-LS

VHDL-Wave recommends VHDL-LS for syntax highlighting. VHDL-Wave automatically generates the configuration file that VHDL-LS needs to
find all references. This feature can be disabled in setting (see `vhdl-wave > General: Enable Ls Toml`).

It is still possible to complement the generated `vhdl-ls.toml` file with additional data. This must be done below the limit indicated in the file.

When a library is added to the configuration (setting `Library Directories`) this directory is searched for files following library naming rule:

`<library-name>_obj<vhdl-version>.cf`

These library files are then parsed to find the corresponding source files which are then added to `vhdl-ls.toml` file.

## `vhdl-wave.json` file

The file `.vscode/vhdl-wave.json` in the workspace folder allows overriding the following settings: `Work Library Name` and `Work Library Path`.

The aim is to allow switching easily between library development and main application development.

The standard development takes place in the `work` library which is the default _VHDL-Wave_ setting. But when you develop a library you must name the working library with the target library name. And you may want to place it in a particular place where you locate your libraries.

By defining specific library name and location in `vhdl-wave.json` file of the library development folder you will allow to use the right parameters as soon you enter the library development folder with vscode.

The typical content of `vhdl-wave.json` file to develop a library `myCustomLibrary` is:

```JSON
{ 
    "WorkLibraryPath": "/mylibrary/rootpath/" ,
    "WorkLibraryName": "myCustomLibrary"
}
```

## Contributions

In case you encounter any problems or have suggestions regarding the extension, feel free to open an issue at first.

## License

The extension is [licensed](LICENSE "license") under the MIT license.

