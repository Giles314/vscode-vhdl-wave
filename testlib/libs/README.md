# Building Libraries

This empty directory is dedicated to build the library from `src/counter.vhdl`.

It is referred to by the `.vscode/setting.json` file as the work library directory for the testlib workspace.
When building a VHDL unit in this workspace, it is stored in a library having the work library name.
This work library name is also defined in `.vscode/setting.json` file.

This builds a library that may be referred to in another project.
The demo project is an example of such library usage.
