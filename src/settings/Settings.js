// MIT License

// Copyright (c) 2024 Philippe Chevrier
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

const WAVE_EXT = 'ghw';

const ghwDialogOptions = {
	canSelectMany: false,
	openLabel: 'Open',
	filters: {
	   '${WAVE_EXT} files': [ WAVE_EXT ]
   }
};


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
            if (filePath) {
                dirPath = path.dirname(filePath); // When no workspace folder is defined use the file folder
            }
            else {
                dirPath = '';
            }
        } else {
            dirPath = Folders[0].uri.fsPath;  // Get path of workspace root directory where the ghdl command must be run by default
        }
        return dirPath;
    }

    /**
     * @param {{ get: (arg0: string) => any; }} workspaceConfig
     * @param {string} dirPath
     */
    getWorkLibraryPath(workspaceConfig, overrideData, dirPath) {
        let libPath = overrideData['WorkLibraryPath'];
        if (!libPath) {
            libPath = workspaceConfig.get("library.WorkLibraryPath");
        }
        if((libPath == "") || (libPath == null)) {
            libPath = ""
        } else {
            if (! path.isAbsolute(libPath)) {
                libPath = path.join(dirPath, libPath);
            }
            if(! fs.existsSync(libPath)) {
                // Include the path inside a list to indicate it does not exists
                libPath = [ libPath ];
            }
        }
        return libPath;
    }
    

    getExtensionId() {
        return "vhdl-wave"; 
    }


    getWorkSpaceConfig() {
        return this.vscode.workspace.getConfiguration(this.getExtensionId());
    }


    getWorkSpaceOverride(dirPath) {
        let result = {};
        const overrideFilePath = path.join(dirPath, '.vscode', 'vhdl-wave.json');
        if(fs.existsSync(overrideFilePath)) {
            const data = fs.readFileSync(overrideFilePath, { encoding: 'utf8',} );
            result = JSON.parse(data);
        }
        return result;
    }


    /**
     * @param {string} filePath
     * @param {number} [task]
     */
    async get(filePath, task) {
        let settingsList;
        let runOptionList;
        let dirPath = this.getWorkspaceDirPath(filePath);
        const baseName = path.basename(filePath);
        const unitName = baseName.substring(0, baseName.lastIndexOf("."));
        const workspaceConfig = this.getWorkSpaceConfig();
        const overrideData = this.getWorkSpaceOverride(dirPath);
        const workDir = this.getWorkLibraryPath(workspaceConfig, overrideData, dirPath);
        if (! Array.isArray(workDir)) {
            if(task == TaskEnum.analyze) {
                settingsList = [].concat(this.getWorkDirectoryName(workspaceConfig, overrideData),
                                         this.getWorkLibraryOption(workDir) ,
                                         this.getLibraryDirectories(workspaceConfig) ,
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
                settingsList = [].concat(this.getWorkDirectoryName(workspaceConfig, overrideData) ,
                                         this.getWorkLibraryOption(workDir) ,
                                         this.getLibraryDirectories(workspaceConfig) ,
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
                settingsList = [].concat(this.getWorkDirectoryName(workspaceConfig, overrideData) , 
                                         this.getWorkLibraryOption(workDir) ,
                                         this.getLibraryDirectories(workspaceConfig) ,
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
                runOptionList= [].concat(await this.getWaveFile(workspaceConfig, dirPath, unitName) ,
                                         this.getStopTime(workspaceConfig)
                                        );
            }
        }
        else {
            //-- Report error with the array containing the missing directory path
            dirPath = workDir;
        }
        return [ dirPath, settingsList, baseName, unitName, runOptionList ];
    }

    /**
     * @param {{get: (arg0: string) => any;}} workspaceConfig
     * @param {{ [x: string]: any; }} overrideData
     */
    getWorkDirectoryName(workspaceConfig, overrideData) {
        let libName = overrideData['WorkLibraryName'];
        if (!libName) {
            libName = workspaceConfig.get('library.WorkLibraryName')
        }
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
     * @param {{get: (arg0: string) => any;}} workspaceConfig
     */
    getLibraryDirectories(workspaceConfig) {
        let cmdOption = [];
        const libPathArr = workspaceConfig.get("library.LibraryDirectories");
        if (libPathArr != '') {
            libPathArr.forEach(libPath => {
                if(fs.existsSync(libPath)) {
                    cmdOption = cmdOption.concat([ `-P${libPath}` ]);
                } else {
                    this.vscode.window.showInformationMessage(`Specified path of external library '${libPath}' not found, ignoring argument. Check value in extension settings`);
                }
            });
        }
        return cmdOption;
    }

    /**
     * @param {{get: (arg0: string) => any;}} workspaceConfig
     * @param {string} dirPath
     * @param {string} unitName
     */
    async getWaveFile(workspaceConfig, dirPath, unitName) {
        let waveFile = workspaceConfig.get("simulation.WaveFile");
        if(waveFile != '') {
            if (! path.isAbsolute(waveFile)) {
                waveFile = path.join(dirPath, waveFile);
            }
            let isDirectory;
            try {
                const stats = fs.statSync(waveFile);
                isDirectory = stats.isDirectory();
            }
            catch(err) {
                switch (waveFile.slice(-1)) {
                    case '/':
                    case '\\':
                        isDirectory = true;
                    default:
                        isDirectory = false;
                }
            }
            if (isDirectory) {
                // Add a filename which has the run module name with extension .ghw
                waveFile = waveFile + path.sep + unitName.toLowerCase() + '.' + WAVE_EXT;
            }
            else {
                const extPos = waveFile.lastIndexOf(".");
                if (extPos < waveFile.length - 5) { //-- maximum length of extension: 4 characters
                    // The name has no extension add '.ghw'
                    waveFile += '.' + WAVE_EXT;
                }
            }
        }
        else {
            const fileInfos = await this.vscode.window.showSaveDialog(ghwDialogOptions);
            if (fileInfos) {
                waveFile = path.normalize(fileInfos.fsPath);
            }
            else {
                throw "Command cancelled";
            }
        };
        return [  `--wave=${waveFile}` ];
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
