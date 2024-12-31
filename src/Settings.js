// MIT License

// Copyright (c) 2024-2025 Philippe Chevrier
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
const { MiniGlob } = require('./util/miniglob.js');

const whichSync  = require('./util/which.js'); // extracted from https://www.npmjs.com/package/which


const TOOLCHAIN_ENVVAR = 'GATEMATE_TOOLCHAIN_PATH';

const CommandTag = Object.freeze({
    "analyze":'-a',
    "elaborate":'-e',
    "make": '-m',
    "run":'-r',
    "clean": '--clean',
    "remove": '--remove',
    "wave": '-z',
    "synth": '--warn-no-binding -C --ieee=synopsys',
    "implement": '-i',
    "load": '',
});


const interface2Options = {
    "dirtyjtag-jtag-fpga" : [ '-c', 'dirtyJtag' ],
    "dirtyjtag-jtag-flash" : [ '-c', 'dirtyJtag', '-f' ],
    "gatemate-evb-jtag-fpga" : [ '-b', 'gatemate_evb_jtag' ],
    "gatemate-evb-spi-fpga" : [ '-b', 'gatemate_evb_spi' ],
    "gatemate-evb-jtag-flash" : [ '-b', 'gatemate_evb_jtag', '-f' ],
    "gatemate-evb-spi-flash" : [ '-b', 'gatemate_evb_spi', '-f' ],
};

const WAVE_EXT = 'ghw';

const ghwDialogOptions = {
	canSelectMany: false,
	openLabel: 'Open',
	filters: {
	   '${WAVE_EXT} files': [ WAVE_EXT ]
   }
};


const defaultWorkLibNameInVhdlLs = "defaultLibrary";
    

/**
 * @param {string} dirPath
 * @param {string} explainName
 * @returns {boolean}
 */
function createDir(dirPath, explainName) {
    let result = true;
    try {
        fs.accessSync(dirPath, fs.constants.F_OK);
    } 
    catch (err) {
        try {
            fs.mkdirSync(dirPath, 0o744);
        }
        catch(err) {
            console.log(`Failed to create ${explainName} directory at ${dirPath}`);
            result = false;
        }
    }
    return result;
}


class Settings {

    constructor(vscode) {
        this.vscode = vscode;

        /**
         * @type {string} ghdlPath
         */
        this.ghdlPath = whichPath('ghdl', vscode);
        /**
         * @type {string} wavePath
         */
        this.wavePath = whichPath('gtkwave', vscode);
        /**
         * @type {string} defaultWorkLibraryName
         */
        this.defaultWorkLibraryName = 'work';
    }


    getExtensionId () {
        return "vhdl-wave";
    }


    getToolPath(toolName) {
        let toolPath = undefined;
        const toolchainDir = process.env[TOOLCHAIN_ENVVAR];
        if (toolchainDir !== undefined) {
            const execName = process.platform === 'win32' ? toolName + '.exe' : toolName;
            toolPath = path.join(toolchainDir, toolName, execName).toString();
            if (!fs.existsSync(toolPath)) {
                toolPath = undefined;
            }
        }
        return toolPath;
    }


    getLogFilePath(logFile) {
        const LogPath = path.join(this.logPath, logFile);
        return LogPath.toString().replace(/\\/g, '/');
    }


    makeSubDirs()  {
        const result = createDir(this.logPath, 'log')
                     && createDir(this.netPath, 'net');
        if (!result) {
            this.vscode.window.showErrorMessage('Failed to create log or net sub-directories in build directory');
        }
        return result;
    }


    /**
     * @param {string} unit
     * @returns {string}
     */
    getSynthNetlistFilename(unit) {
        return `net/${unit}_synth.v`
    }


    getUploadInterfaceOptions() {
        const loaderInterface = this.workspaceConfig.get("toolChain.loadInterface");
        return interface2Options[loaderInterface];
    }
    
    
    /**
     * @param {string | undefined} filePath  The path of the file that is the target of the command
     * @returns {Promise<void>}
     */
    async refresh(filePath = undefined, mustCreateBuildDir = false) {

        this.workspaceConfig = this.vscode.workspace.getConfiguration(this.getExtensionId());

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
        this.isWorkLibDirExists = false;

        /**
         * @type {boolean} isToolChainDirExists
         */
        this.isToolChainDirExists = false;

        /**
         * @type {string[]} libraryPaths
         */
        this.libraryPaths = [];

        let pattern = './src/**/*.vhd';
        if (! path.isAbsolute(pattern)) {
            pattern = path.join(this.dirPath, pattern).replace(/\\/g, '/');
        }

        /**
         * @type {string[]} includeCoreSourceFiles
         */
        this.includeCoreSourceFiles = [ pattern, pattern + 'l' ];

        /**
         * @type {string[]} cmdOption
         */
        this.cmdOption = [];

        let result = (this.dirPath != '');
        if (result) {
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
             * @type {string} buildPath
             */
            this.buildPath = this.workspaceConfig.get['library.BuildRootPath'];
            if (! this.buildPath) {
                this.buildPath = path.join(this.dirPath, 'build');
            }
            else {
                if (! path.isAbsolute(this.buildPath)) {
                    this.buildPath = path.join(this.dirPath, this.buildPath);
                }
            }


            /**
             * @type {string} workLibDirPath
             */
            this.workLibDirPath = this.workspaceOverride['WorkLibraryPath'];
            if (this.workLibDirPath === undefined) {
                this.workLibDirPath = this.workspaceConfig.get("library.WorkLibraryPath");
            }
            if ((this.workLibDirPath == null) || (this.workLibDirPath == '')) {
                this.workLibDirPath = this.buildPath;
                mustCreateBuildDir = true;
            }
            else if (! path.isAbsolute(this.workLibDirPath)) {
                this.workLibDirPath = path.join(this.dirPath, this.workLibDirPath);
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

            /**
             * @type {string[]} commonOptions
             */
            this.commonOptions = [];


            if (mustCreateBuildDir)  {
                result = createDir(this.buildPath, 'build');
                this.isToolChainDirExists = result;
            }

            if(fs.existsSync(this.workLibDirPath)) {
                this.isWorkLibDirExists = true;
            }
        }

        if (result) {
            /**
             * @type {string} logPath
             */
            this.logPath = path.join(this.buildPath, 'log');


            /**
             * @type {string} netPath
             */
            this.netPath = path.join(this.buildPath, 'net');


            this.interfaceType = this.workspaceConfig.get("toolChain.loadInterface");
        }
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
            case CommandTag.synth:
                settingsList = [].concat(
                    this.getLibraryDirsOption() ,
                    this.getVhdlStandardOption() ,
                    this.getVerbose() ,
                    this.getRelaxedRules() ,
                    this.getVitalChecks() ,
                    this.getPsl() ,
                    this.getExplicit() ,
                    this.getSynBinding() ,
                    this.getMbComments());
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


    /**
     * Retrieves the list of VHDL source files from the project directory
     *
     * @returns {string} A white space separated list of file paths to the VHDL source files.
     */
    get_project_source() {
        let fileList = [];
        for (const filePattern of this.includeCoreSourceFiles) {
            //-- version compatible with glob V11.0.0 (not compatible with vscode included glob)
            //-- const match = glob.globSync(filePattern); 
            //-- fileList = fileList.concat(match.found);
            const pattern = new MiniGlob(filePattern);
            const match = pattern.getMatchingPaths();
            fileList = fileList.concat(match);
        }

        return fileList.join(' ');
    }


    /**
     * Read the content of a GHDL library file and store the list of files in libraryFileLists
     * indexed by the library name.
     * The library file may contain relative paths that are resolved using the directory of the library file.
     * 
     * @param {{ [x: string]: string[]; }} libraryFileLists
     * @param {string} libraryName
     * @param {string} libraryPath
     */
    listLibraryFiles(libraryFileLists, libraryName, libraryPath) {
        try {
            let baseDirPath;
            let fileAry;
            // Open the library file
            const cfData = fs.readFileSync(libraryPath, { encoding: 'utf8',} );
            const lines = cfData.toString().split('\n');
            for(const line of lines) {
                // Read library line and consider only lines describing a filename
                if (line.startsWith('file')) {
                    // Split the line into fields
                    const parts = line.split(/\s+/);
                    if (parts.length >= 3) {
                        // Valid lines will contain at least 3 fields
                        const firstField = parts[1];
                        let absolutePath = parts[2];
                        if (absolutePath.startsWith('"') && absolutePath.endsWith('"')) {
                            absolutePath = absolutePath.slice(1, -1);
                        }
                        // First field indicates whether the file is relative or absolute
                        if (firstField === '.') {
                            // The file is relative to the library file so resolve it
                            if (baseDirPath === undefined) {
                                // first time we need it, compute the directory of the library file (next time it will be re-used)
                                baseDirPath = path.dirname(libraryPath)
                            }
                            absolutePath = path.resolve(baseDirPath, absolutePath);
                        } else if (firstField !== '/') {
                            // The file is not relative or absolute, so it must be invalid
                            const errorMessage = `Invalid library line format in line: ${line} of file: ${libraryPath}`;
                            console.error(errorMessage);
                            throw errorMessage;
                        }
                        // Get the list of files for the library
                        if (fileAry === undefined) {
                            // If it does not exists yet, create the library file list and store it in the library collection
                            if (libraryFileLists[libraryName] === undefined) {
                                // If the library collection does not exist yet, create it
                                libraryFileLists[libraryName] = [];
                            }
                            // Get the list of files for the library
                            fileAry = libraryFileLists[libraryName];
                        }
                        // Add the file to the list if it is not already there
                        if (! fileAry.includes(absolutePath)) {
                            fileAry.push(absolutePath);
                        }
                    }
                }  // Keep line starting with 'file'
            }  // Read line
        }
        catch (err) {
            const errorMessage = "Error reading library file " + libraryPath + " :\n" + err.toString();
            throw errorMessage;
        }
    }
    
    
    /**
     * Read the content of the working library used by GHDL to store analyzed files
     * Store the resulting list as an entry in libraryFileLists indexed by
     * the working library index (equal to library name except when default name).
     *
     * When working with the default library 'work' VHDL-LS expects it to be named 'defaultLibrary'
     *
     * When no file has been analyzed yet, the working library may not exist
     * In this case no list is created, libraryFileLists is left unchanged.
     *
     * Return the working library index (even when its entry has not been created)
     *
     * @param {{ }} libraryFileLists
     * @returns { Promise<string> }
     */
    async listWorkLibFiles (libraryFileLists) {
        const directory = this.workLibDirPath;
        let workLibName = this.workLibName;
        let workLibIndex = workLibName;
        if ((workLibName == '')) {
            workLibIndex = defaultWorkLibNameInVhdlLs;
            workLibName = this.defaultWorkLibraryName;
        }
        const vhdlVersion = this.getVhdlStandard();
        const workLibPath = path.join(directory, workLibName + '-obj' + vhdlVersion + '.cf');
    
        this.listLibraryFiles(libraryFileLists, workLibIndex, workLibPath);
        return workLibIndex;
    }
    
    
    /**
     * Read the list of directories to include by GHDL for finding libraries
     * Search libraries in these directories that are libraries matching VHDL version
     * Determine the library name from library filename
     * For each library, add its list of files as an entry in libraryFileLists indexed by library name
     *
     * @param {{}} libraryFileLists
     */
    listPDirList (libraryFileLists) {
        //-- Get the list of library directories
        const LibraryDirectories = this.libraryPaths;
        //-- Compute the pattern of the name of libraries
        //-- that correspond to the VHDL standard
        const vhdlVersion = this.getVhdlStandard();
        const libraryNamePattern = new RegExp(`^([a-zA-Z]\\w*)-obj${vhdlVersion}\\.cf$`)
    
        for (const libraryDirPath of LibraryDirectories) {
            const libraryFiles = fs.readdirSync(libraryDirPath);
    
            //-- For each library directory look for library files
            for (const file of libraryFiles) {
                const cfLibraryMatch = file.match(libraryNamePattern);
                if (cfLibraryMatch) {
                    const fullLibraryPath = path.join(libraryDirPath, file);
                    if (fs.statSync(fullLibraryPath).isFile()) {
                        //-- For each library look for vhdl source files
                        const libraryName = cfLibraryMatch[1];
                        this.listLibraryFiles(libraryFileLists, libraryName, fullLibraryPath);
                    }
                }
            }
        }
    }
}

module.exports = { Settings, CommandTag, TOOLCHAIN_ENVVAR };
