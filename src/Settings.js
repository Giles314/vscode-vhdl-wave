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

const CommandTag = Object.freeze({
    "analyze":'-a', 
    "elaborate":'-e', 
    "make": '-m',
    "run":'-r', 
    "clean": '--clean', 
    "remove": '--remove', 
    "wave": '-z',
});

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
        this.workspaceConfig = this.vscode.workspace.getConfiguration(this.getExtensionId());
        this.defaultWorkLibraryName = 'work';
    }


    getExtensionId() {
        return "vhdl-wave"; 
    }


    getWorkLibraryPath() {
        this.workLibDir = this.workspaceOverride['WorkLibraryPath'];
        if (! this.workLibDir) {
            this.workLibDir = this.workspaceConfig.get("library.WorkLibraryPath");
        }
        if((this.workLibDir == "") || (this.workLibDir == null)) {
            this.workLibDir = "";
        } 
        else {
            if (! path.isAbsolute(this.workLibDir)) {
                this.workLibDir = path.join(this.dirPath, this.workLibDir);
            }
            if(! fs.existsSync(this.workLibDir)) {
                // Include the path inside a list to indicate it does not exists
                this.workLibDir = [ this.workLibDir ];
            }
        }
    }


    /**
     * @param {string | undefined} filePath  The path of the file that is the target of the command
     * @returns {Promise<void>}
     */
    async refresh(filePath = undefined) {

        /**
         * @type {string} workspaceOverride
         */
        this.dirPath = '';
        const folders = this.vscode.workspace.workspaceFolders;
        if (folders !== undefined) {
            // Get path of workspace root directory
            // where the GHDL command must be run by default
            this.dirPath = folders[0].uri.fsPath;
        }

        /**
         * @type {string} baseName
         */
        this.baseName = '';

        /**
         * @type {string} unitName
         */
        this.unitName = '';

        /**
         * @type {{}} workspaceOverride
         */
        this.workspaceOverride = {};

        /**
         * @type {boolean} isWorkLibDirExists
         */
        this.isWorkLibDirExists = true;

        /**
         * @type {string[]} libraryPaths
         */
        this.libraryPaths = [];

        /**
         * @type {string[]} cmdOption
         */
        this.cmdOption = [];

        if (this.dirPath != '') {
            if (filePath !== undefined) {
                this.baseName = path.basename(filePath);
                this.unitName = this.baseName.substring(0, this.baseName.lastIndexOf("."));
            }

            const overrideFilePath = path.join(this.dirPath, '.vscode', 'vhdl-wave.json');

            if (fs.existsSync(overrideFilePath)) {
                const data = fs.readFileSync(overrideFilePath, { encoding: 'utf8',} );
                this.workspaceOverride = JSON.parse(data);
            }


            /**
             * @type {string} workLibDirPath
             */
            this.workLibDirPath = this.workspaceOverride['WorkLibraryPath'];
            if (! this.workLibDirPath) {
                this.workLibDirPath = this.workspaceConfig.get("library.WorkLibraryPath");
            }
            if (this.workLibDirPath == null) {
                this.workLibDirPath = "";
            } 
            else if (this.workLibDirPath != "") {
                if (! path.isAbsolute(this.workLibDirPath)) {
                    this.workLibDirPath = path.join(this.dirPath, this.workLibDirPath);
                }
                if(! fs.existsSync(this.workLibDirPath)) {
                    // Include the path inside a list to indicate it does not exists
                    this.isWorkLibDirExists = false;
                }
            }

    
            /**
             * @type {string} workLibName
             */
            this.workLibName = this.workspaceOverride['WorkLibraryName'];
            if (!this.workLibName) {
                this.workLibName = this.workspaceConfig.get('library.WorkLibraryName');
            }
            if (this.workLibName == this.defaultWorkLibraryName) {
                // Use empty name instead of explicit default name to avoid returning synonyms
                this.workLibName = '';
            }

            const libPaths = this.workspaceConfig.get('library.LibraryDirectories');
            if (libPaths != '') {
                for(const libPath of libPaths) {
                    if(fs.existsSync(libPath)) {
                        this.libraryPaths.push(libPath);
                    } else {
                        this.vscode.window.showInformationMessage(`Specified path of external library '${libPath}' not found, ignoring argument. Check value in extension settings`);
                    }
                }
            }

            /**
             * @type {string} cmdOption
             */
            this.waveFile = this.workspaceConfig.get("simulation.WaveFile");
            if (this.waveFile != '') {
                if (! path.isAbsolute(this.waveFile)) {
                    this.waveFile = path.join(this.dirPath, this.waveFile);
                }
                let isDirectory;
                try {
                    const stats = fs.statSync(this.waveFile);
                    isDirectory = stats.isDirectory();
                }
                catch(err) {
                    switch (this.waveFile.slice(-1)) {
                        case '/':
                        case '\\':
                            isDirectory = true;
                        default:
                            isDirectory = false;
                    }
                }
                if (isDirectory) {
                    // Add a filename which has the run module name with extension .ghw
                    this.waveFile = path.join(this.waveFile, this.unitName.toLowerCase() + '.' + WAVE_EXT);
                }
                else {
                    const extPos = this.waveFile.lastIndexOf(".");
                    if (extPos < this.waveFile.length - 5) { //-- maximum length of extension: 4 characters
                        // The name has no extension add '.ghw'
                        this.waveFile += '.' + WAVE_EXT;
                    }
                }
            }
        }

        /**
         * @type {string[]} cmdOption
         */
        this.commonOptions = [];
    }


    /**
     * Compute the given command parameter list(s)
     * - First list (used by most tasks)
     * - Second list (used only by the run task)
     * 
     * Do NOT call if (this.dirPath == '')
     * Note that (this.dirPath == '') means that no workspace folder is defined
     * Because workspace is necessary for VHDL-Wave to manage its files
     * VHDL will do nothing when (this.dirPath == '')
     * 
     * @param {string} [command]
     * @returns {Promise<string[][]>}
     */
    async getParameters(command) {
        let settingsList  = [];
        let runOptionList = [];
        if (this.dirPath != '') {
            switch (command) {
            case CommandTag.run:
                runOptionList= [].concat(await this.getWaveFileRunOption() ,
                                         this.getStopTime()
                                        );
                //-- NO break;
            case CommandTag.analyze:
            case CommandTag.elaborate:
            case CommandTag.make:
                settingsList = this.getCommonOptions();
                break;
            case CommandTag.clean:
            case CommandTag.remove:
                settingsList = [].concat(
                    this.getWorkLibNameOption() , 
                    this.getWorkLibPathOption() ,
                    this.getVhdlStandardOption() , 
                    this.getVerbose()
                );
                break;
            } 
        }
        return [ settingsList, runOptionList ];
    }


    /**
     *  Options common to analyze, elaborate and run commands
     * 
     * @returns {string[]}
     */ 
    getCommonOptions() {
        if (this.commonOptions.length == 0) {
            this.commonOptions = this.commonOptions.concat(
                this.getWorkLibNameOption() , 
                this.getWorkLibPathOption() ,
                this.getLibraryDirsOption() ,
                this.getVhdlStandardOption() , 
                this.getIeeeVersion() ,
                this.getVerbose() ,
                this.getTimeResolution() ,
                this.getRelaxedRules() ,
                this.getVitalChecks() ,
                this.getPsl() ,
                this.getExplicit() ,
                this.getSynBinding() ,
                this.getMbComments()
            );
        }
        return this.commonOptions;
    }


    /**
     * @returns {string[]}
     */
    getWorkLibNameOption() {
        const libName = this.workLibName;
        if((libName != "") && (libName != null)) {
            return [ `--work=${libName}` ];
        } else {
            return [];
        }
    }

    /**
     * @returns {string[]}
     */
    getWorkLibPathOption() {
        if(this.workLibDirPath == "") {
            return [];
        } 
        else {
            return [ `--workdir=${this.workLibDirPath}` ];
        }
    }


    /**
     * @returns {string[]}
     */
    getLibraryDirsOption() {
        return this.libraryPaths.map(dir => `-P${dir}`);
    }


    /**
     * @returns {Promise<string>}
     */
    async getWaveFile() {
        if (this.waveFile == '') {
            const fileInfos = await this.vscode.window.showSaveDialog(ghwDialogOptions);
            if (fileInfos) {
                this.waveFile = path.normalize(fileInfos.fsPath);
            }
            else {
                throw "Command cancelled";
            }
        }
        return this.waveFile;
    }


    /**
     * @returns {Promise<string[]>}
     */
    async getWaveFileRunOption() {
        const waveFile = await this.getWaveFile();
        return [  `--wave=${waveFile}` ];
    }


    /**
     * @returns {string}
     */
    getVhdlStandard() {
        return this.workspaceConfig.get("standard.VHDL");
    }
    
    /**
     * @returns {string[]}
     */
    getVhdlStandardOption() {
        const vhdlStd = this.getVhdlStandard();
        const cmdOption = [ `--std=${vhdlStd}` ];
        return cmdOption;
    }

    /**
     * @returns {string[]}
     */
    getIeeeVersion() {
        const ieeeVer = this.workspaceConfig.get("standard.IEEE");
        let cmdOption = [];
        switch(ieeeVer) {
            case "standard" :
                cmdOption.push(`--ieee=${ieeeVer}`);
                break;
            case "none" :
                break;
            default:
                cmdOption.push("-fsynopsys");
        }
        return cmdOption;
    }

    /**
     * @returns {string[]}
     */
    getVerbose() {
        if(this.workspaceConfig.get("general.verbose")) {
            return [ "-v" ];
        } else {
            return [];
        }
    }

    /**
     * @returns {string[]}
     */
    getTimeResolution() {
        const timeRes = this.workspaceConfig.get("simulation.TimeResolution")
        const cmdOption = [ `--time-resolution=${timeRes}` ]; 
        return cmdOption
    }

    /**
     * @returns {string[]}
     */
    getStopTime() {
        let stopTime = this.workspaceConfig.get("simulation.StopTime");
        if(stopTime == '') {
            stopTime = '1sec';
        }
        return [ `--stop-time=${stopTime}` ];
    }

    /**
     * @returns {string[]}
     */
    getRelaxedRules() {
        if(this.workspaceConfig.get("general.RelaxedRules")) {
            return [ "-frelaxed-rules" ];
        } else {
            return [];
        }
    }

    /**
     * @returns {string[]}
     */
    getVitalChecks() {
        if(this.workspaceConfig.get("general.vitalChecks")) {
            return [];
        } else {
            return [ "--no-vital-checks" ];
        }
    }

    /**
     * @returns {string[]}
     */
    getPsl() {
        if(this.workspaceConfig.get("general.PSL")) {
            return [ '-fpsl' ];
        } else {
            return [];
        }
    }

    /**
     * @returns {string[]}
     */
    getExplicit() {
        if(this.workspaceConfig.get("general.explicit")) {
            return [ '-fexplicit' ];
        } else {
            return [];
        }
    }

    /**
     * @returns {string[]}
     */
    getSynBinding() {
        if(this.workspaceConfig.get('general.synBinding')) {
            return [ '--syn-binding' ];
        } else {
            return [];
        }
    }

    /**
     * @returns {string[]}
     */
    getMbComments() {
        if(this.workspaceConfig.get("general.mbComments")) {
            return [ "--mb-comments" ];
        } else {
            return [];
        }
    }

    /**
     * @returns {Boolean}
     */
    isEnableLsToml() {
        return this.workspaceConfig.get("general.enableLsToml");
    }
}

module.exports = { Settings, CommandTag };
