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

 

const fs = require('fs');

const TaskEnum = Object.freeze({"analyze":1, "elaborate":2, "run":3});

class Settings {
    constructor(vscode) {
        this.vscode = vscode; 
    }

    getSettingsString(task) {
        const workspaceConfig = this.vscode.workspace.getConfiguration(this.getExtensionId())
        let settingsString = ""
        if(task == TaskEnum.analyze) {
            settingsString =    this.getWorkDirectoryName(workspaceConfig) + " " + 
                                this.getWorkLibraryPath(workspaceConfig) + " " + 
                                this.getLibraryDirectory(workspaceConfig) + " " +
                                this.getVhdlStandard(workspaceConfig) + " " + 
                                this.getIeeeVersion(workspaceConfig) + " " +
                                this.getVerbose(workspaceConfig) + " " +
                                this.getRelaxedRules(workspaceConfig) + " " +
                                this.getVitalChecks(workspaceConfig) + " " +
                                this.getPsl(workspaceConfig) + " " +
                                this.getExplicit(workspaceConfig) + " " +
                                this.getSynBinding(workspaceConfig) + " " +
                                this.getMbComments(workspaceConfig)
        } else if(task == TaskEnum.elaborate) {
            settingsString =    this.getWorkDirectoryName(workspaceConfig) + " " + 
                                this.getWorkLibraryPath(workspaceConfig) + " " + 
                                this.getLibraryDirectory(workspaceConfig) + " " +
                                this.getVhdlStandard(workspaceConfig) + " " + 
                                this.getIeeeVersion(workspaceConfig) + " " +
                                this.getVerbose(workspaceConfig) + " " +
                                this.getRelaxedRules(workspaceConfig) + " " +
                                this.getVitalChecks(workspaceConfig) + " " +
                                this.getPsl(workspaceConfig) + " " +
                                this.getExplicit(workspaceConfig) + " " +
                                this.getSynBinding(workspaceConfig) + " " +
                                this.getMbComments(workspaceConfig)
        } else if(task == TaskEnum.run) {
            settingsString =    this.getWorkDirectoryName(workspaceConfig) + " " + 
                                this.getWorkLibraryPath(workspaceConfig) + " " + 
                                this.getLibraryDirectory(workspaceConfig) + " " +
                                this.getVhdlStandard(workspaceConfig) + " " + 
                                this.getIeeeVersion(workspaceConfig) + " " +
                                this.getVerbose(workspaceConfig) + " " +
                                this.getTimeResolution(workspaceConfig) + " " +
                                this.getRelaxedRules(workspaceConfig) + " " +
                                this.getVitalChecks(workspaceConfig) + " " +
                                this.getPsl(workspaceConfig) + " " +
                                this.getExplicit(workspaceConfig) + " " +
                                this.getSynBinding(workspaceConfig) + " " +
                                this.getMbComments(workspaceConfig)
        } else {
            return null; 
        }
        return settingsString
    }

    getExtensionId() {
        const extensionId = "vhdl-wave";

        return extensionId; 
    }

    getWorkDirectoryName(workspaceConfig) {
        const libName = workspaceConfig.get("library.WorkLibraryName")
        if((libName != "") && (libName != null)) {
            return "--work=" + libName
        } else {
            return ""
        }
    }

    getWorkLibraryPath(workspaceConfig) {
        const libPath = workspaceConfig.get("library.WorkLibraryPath")
        if((libPath == "") || (libPath == null)) {
            return ""
        } else if(fs.existsSync(libPath)) {
            return "--workdir=" + libPath 
        } else {
            this.vscode.window.showInformationMessage("Specified path of library 'WORK' not found, ignoring argument. Check value in extension settings")
            return ""; 
        }
    }

    getLibraryDirectory(workspaceConfig) {
        let cmdOption = "";
        const libPathArr = workspaceConfig.get("library.LibraryDirectories")
        if (libPathArr != '') {
            libPathArr.forEach(libPath => {
                if(fs.existsSync(libPath)) {
                    cmdOption = cmdOption + " " + "-P" + '"' + libPath + '"'
                } else {
                    this.vscode.window.showInformationMessage(`Specified path of external library '${libPath}' not found, ignoring argument. Check value in extension settings`)
                }
            });
        }
        return cmdOption;
    }

    getVhdlStandard(workspaceConfig) {
        const vhdlStd = workspaceConfig.get("standard.VHDL")
        const cmdOption = "--std=" + vhdlStd
        return cmdOption
    }

    getIeeeVersion(workspaceConfig) {
        const ieeVer = workspaceConfig.get("standard.IEEE")
        let cmdOption = "";
        switch(ieeVer) {
            case "standard" :
                cmdOption = "--ieee=" + ieeVer;
                break;
            case "none" :
                break;
            default:
                cmdOption = "-fsynopsys";
        }
        return cmdOption
    }

    getVerbose(workspaceConfig) {
        if(workspaceConfig.get("general.verbose")) {
            return "-v"
        } else {
            return ""
        }
    }

    getTimeResolution(workspaceConfig) {
        const timeRes = workspaceConfig.get("simulation.TimeResolution")
        const cmdOption = "--time-resolution=" + timeRes
        return cmdOption
    }

    getRelaxedRules(workspaceConfig) {
        if(workspaceConfig.get("general.RelaxedRules")) {
            return "-frelaxed-rules"
        } else {
            return ""
        }
    }

    getVitalChecks(workspaceConfig) {
        if(workspaceConfig.get("general.vitalChecks")) {
            return ""
        } else {
            return "--no-vital-checks"
        }
    }

    getPsl(workspaceConfig) {
        if(workspaceConfig.get("general.PSL")) {
            return "-fpsl"
        } else {
            return ""
        }
    }

    getExplicit(workspaceConfig) {
        if(workspaceConfig.get("general.explicit")) {
            return "-fexplicit"
        } else {
            return ""
        }
    }

    getSynBinding(workspaceConfig) {
        if(workspaceConfig.get("general.synBinding")) {
            return "--syn-binding"
        } else {
            return ""
        }
    }

    getMbComments(workspaceConfig) {
        if(workspaceConfig.get("general.mbComments")) {
            return "--mb-comments"
        } else {
            return ""
        }
    }
}

module.exports = { Settings, TaskEnum };
