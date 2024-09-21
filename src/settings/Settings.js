// MIT License

//const { settings } = require('cluster');

// Copyright (c) 2020 Johannes Bonk

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

 

const fs     = require('fs');
const path   = require('path'); 

const TaskEnum = Object.freeze({"analyze":1, "elaborate":2, "run":3});


class Settings {
    constructor(vscode) {
        this.vscode = vscode; 
    }


    /**
     * @param {string} filePath
     */
    getWorkspaceDirPath(filePath) {
        let dirPath;
        const Folders = this.vscode.workspace.workspaceFolders;
        if (Folders == undefined) {
            dirPath = path.dirname(filePath); // When no workspace folder is defined use the file folder
        } else {
            dirPath = Folders[0].uri.fsPath;  // Get path of workspace root directory where the ghdl command must be run by default
        }
        return dirPath;
    }

    /**
     * @param {{ get: (arg0: string) => any; }} workspaceConfig
     * @param {string} dirPath
     */
    getWorkLibraryPath(workspaceConfig, dirPath) {
        let libPath = workspaceConfig.get("library.WorkLibraryPath")
        if((libPath == "") || (libPath == null)) {
            libPath = ""
        } else {
            if (! path.isAbsolute(libPath)) {
                libPath = path.join(dirPath, libPath);
            }
            if(! fs.existsSync(libPath)) {
                // Include the path inside a library to indicate it does not exists
                libPath = [ libPath ];
            }
        }
        return libPath;
    }

    /**
     * @param {string} filePath
     * @param {number} [task]
     */
    get(filePath, task) {
        let settingsList;
        let runOptionList;
        let dirPath = this.getWorkspaceDirPath(filePath);
        const workspaceConfig = this.vscode.workspace.getConfiguration(this.getExtensionId());
        const workDir = this.getWorkLibraryPath(workspaceConfig, dirPath);
        if (! Array.isArray(workDir)) {
            if(task == TaskEnum.analyze) {
                settingsList = [].concat(this.getWorkDirectoryName(workspaceConfig),
                                         this.getWorkLibraryOption(workDir) ,
                                         this.getLibraryDirectory(workspaceConfig) ,
                                         this.getVhdlStandard(workspaceConfig) ,
                                         this.getIeeeVersion(workspaceConfig) ,
                                         this.getVerbose(workspaceConfig) ,
                                         this.getRelaxedRules(workspaceConfig) ,
                                         this.getVitalChecks(workspaceConfig) ,
                                         this.getPsl(workspaceConfig) ,
                                         this.getExplicit(workspaceConfig) ,
                                         this.getSynBinding(workspaceConfig) ,
                                         this.getMbComments(workspaceConfig) 
                                        );
            } else if(task == TaskEnum.elaborate) {
                settingsList = [].concat(this.getWorkDirectoryName(workspaceConfig) ,
                                         this.getWorkLibraryOption(workDir) ,
                                         this.getLibraryDirectory(workspaceConfig) ,
                                         this.getVhdlStandard(workspaceConfig) , 
                                         this.getIeeeVersion(workspaceConfig) ,
                                         this.getVerbose(workspaceConfig) ,
                                         this.getRelaxedRules(workspaceConfig) , 
                                         this.getVitalChecks(workspaceConfig) ,
                                         this.getPsl(workspaceConfig) ,
                                         this.getExplicit(workspaceConfig) ,
                                         this.getSynBinding(workspaceConfig) ,
                                         this.getMbComments(workspaceConfig)
                                        );
            } else if(task == TaskEnum.run) {
                settingsList = [].concat(this.getWorkDirectoryName(workspaceConfig) , 
                                         this.getWorkLibraryOption(workDir) ,
                                         this.getLibraryDirectory(workspaceConfig) ,
                                         this.getVhdlStandard(workspaceConfig) , 
                                         this.getIeeeVersion(workspaceConfig) ,
                                         this.getVerbose(workspaceConfig) ,
                                         this.getTimeResolution(workspaceConfig) ,
                                         this.getRelaxedRules(workspaceConfig) ,
                                         this.getVitalChecks(workspaceConfig) ,
                                         this.getPsl(workspaceConfig) ,
                                         this.getExplicit(workspaceConfig) ,
                                         this.getSynBinding(workspaceConfig) ,
                                         this.getMbComments(workspaceConfig)
                                        );
                runOptionList= [].concat(this.getStopTime(workspaceConfig));
            }
        }
        else {
            //-- Report error with the array containing the missing directory path
            dirPath = workDir;
        }
        return [ dirPath, settingsList, path.basename(filePath), runOptionList ];
    }

    getExtensionId() {
        return "vhdl-wave"; 
    }

    /**
     * @param {{ get: (arg0: string) => any; }} workspaceConfig
     */
    getWorkDirectoryName(workspaceConfig) {
        const libName = workspaceConfig.get("library.WorkLibraryName")
        if((libName != "") && (libName != null)) {
            return [ `--work=${libName}` ];
        } else {
            return [];
        }
    }

    /**
     * @param {string} workDir
     */
    getWorkLibraryOption(workDir) {
        if(workDir == "") {
            return [];
        } 
        else {
            return [ `--workdir=${workDir}` ];
        }
    }

    /**
     * @param {{ get: (arg0: string) => any; }} workspaceConfig
     */
    getLibraryDirectory(workspaceConfig) {
        let cmdOption = [];
        const libPathArr = workspaceConfig.get("library.LibraryDirectories");
        if (libPathArr != '') {
            libPathArr.forEach(libPath => {
                if(fs.existsSync(libPath)) {
                    cmdOption = cmdOption.concat([ `-P"${libPath}"` ]);
                } else {
                    this.vscode.window.showInformationMessage(`Specified path of external library '${libPath}' not found, ignoring argument. Check value in extension settings`);
                }
            });
        }
        return cmdOption;
    }

    /**
     * @param {{ get: (arg0: string) => any; }} workspaceConfig
     */
    getVhdlStandard(workspaceConfig) {
        const vhdlStd = workspaceConfig.get("standard.VHDL");
        const cmdOption = `--std=${vhdlStd}`;
        return cmdOption;
    }

    /**
     * @param {{ get: (arg0: string) => any; }} workspaceConfig
     */
    getIeeeVersion(workspaceConfig) {
        const ieeVer = workspaceConfig.get("standard.IEEE");
        let cmdOption = [];
        switch(ieeVer) {
            case "standard" :
                cmdOption.push(`--ieee=${ieeVer}`);
                break;
            case "none" :
                break;
            default:
                cmdOption.push("-fsynopsys");
        }
        return cmdOption;
    }

    /**
     * @param {{ get: (arg0: string) => any; }} workspaceConfig
     */
    getVerbose(workspaceConfig) {
        if(workspaceConfig.get("general.verbose")) {
            return [ "-v" ];
        } else {
            return [];
        }
    }

    /**
     * @param {{ get: (arg0: string) => any; }} workspaceConfig
     */
    getTimeResolution(workspaceConfig) {
        const timeRes = workspaceConfig.get("simulation.TimeResolution")
        const cmdOption = [ `--time-resolution=${timeRes}` ]; 
        return cmdOption
    }

    /**
     * @param {{ get: (arg0: string) => any; }} workspaceConfig
     */
    getStopTime(workspaceConfig) {
        let stopTime = workspaceConfig.get("simulation.StopTime");
        if(stopTime == '') {
            stopTime = '1sec';
        }
        return [ `--stop-time=${stopTime}` ];
    }

    /**
     * @param {{ get: (arg0: string) => any; }} workspaceConfig
     */
    getRelaxedRules(workspaceConfig) {
        if(workspaceConfig.get("general.RelaxedRules")) {
            return [ "-frelaxed-rules" ];
        } else {
            return [];
        }
    }

    /**
     * @param {{ get: (arg0: string) => any; }} workspaceConfig
     */
    getVitalChecks(workspaceConfig) {
        if(workspaceConfig.get("general.vitalChecks")) {
            return [];
        } else {
            return [ "--no-vital-checks" ];
        }
    }

    /**
     * @param {{ get: (arg0: string) => any; }} workspaceConfig
     */
    getPsl(workspaceConfig) {
        if(workspaceConfig.get("general.PSL")) {
            return [ "-fpsl" ];
        } else {
            return [];
        }
    }

    /**
     * @param {{ get: (arg0: string) => any; }} workspaceConfig
     */
    getExplicit(workspaceConfig) {
        if(workspaceConfig.get("general.explicit")) {
            return [ "-fexplicit" ];
        } else {
            return [];
        }
    }

    /**
     * @param {{ get: (arg0: string) => any; }} workspaceConfig
     */
    getSynBinding(workspaceConfig) {
        if(workspaceConfig.get("general.synBinding")) {
            return [ "--syn-binding" ];
        } else {
            return [];
        }
    }

    /**
     * @param {{ get: (arg0: string) => any; }} workspaceConfig
     */
    getMbComments(workspaceConfig) {
        if(workspaceConfig.get("general.mbComments")) {
            return [ "--mb-comments" ];
        } else {
            return [];
        }
    }
}

module.exports = { Settings, TaskEnum };
