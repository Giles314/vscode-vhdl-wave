// MIT License

// Copyright (c) 2024-2025 Philippe Chevrier

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


const fs           = require('fs');
const path         = require('path');


const ghdlToLsStandardAndYear = {
    "87" : [ "1993", 1987 ],
    "93" : [ "1993", 1993 ],
    "93c": [ "1993", 1993 ],
    "00" : [ "2008", 2000 ],
    "02" : [ "2008", 2002 ],
    "08" : [ "2008", 2008 ],
};

const VHDL_LS_STANDARD = 0;

const SUCCESS_ERROR   = -1;
const SUCCESS_WARNING =  0;
const SUCCESS_OK      =  1;

const vhdlFilter = /.vhdl?$/;


/**
 * Retrieves the first open VHDL file from the currently open text documents in VS Code.
 *
 * @param {{ workspace: { textDocuments: any[]; }; }} vscode - The VS Code API object.
 * @returns {string} The file name of the first open VHDL file, or undefined if no VHDL files are open.
 */
function getOpenVhdlFile(vscode) {
    const openFiles = vscode.workspace.textDocuments.map(doc => doc.fileName);
    const vhdlFiles = openFiles.filter((filename) => { return vhdlFilter.test(filename); });
    return vhdlFiles[0];
}


const separatorLine = "#--** Below additional files or comments may be added. Avoid editing this file while VHDL-Wave is enabled. **--\n";

/**
 * @param {string | number} workspaceDir
 * @param {any[]} standard
 * @param {string} workLibIndex
 * @param {{}} [libraryFileLists]
 */
async function updateTomlFile(workspaceDir, standard, workLibIndex, libraryFileLists) {

    const readFileLists = {}; //-- The object to collect library source files listed in previous Toml File
    const vhdlLsTomlName = workspaceDir + path.sep + 'vhdl_ls.toml';

    let success = SUCCESS_OK;  // Last status of the operation
    let warningText;           // Explain the success status above (when SUCCESS_OK may be empty because no explaination is required)
    let keepText = '';         // Text found in the file that is not part of the recognized part of the file (to be written back as is)
    let isRefresh = false;     // Indicates that the operation is an update (Toml file already exists)
    let listMatch = false;     // Indicates that the file to be written is identical to existing one (no need to update)
    let ErrorIfTerminated = '';  // No error in case of missing file

    try {
        const data = fs.readFileSync(vhdlLsTomlName, { encoding: 'utf8' });
        isRefresh = true;
        const tomlLines = data.toString().split('\n');
        let line = 0;
        let copyFrom = 0;  //-- First line to copy from read file

        function skipCommentLines() {
            const commentLineFormat = /^\s*(#.*)?$/;
            while ((line < tomlLines.length) && tomlLines[line].match(commentLineFormat)) {
                line++;
            }
        }

        ErrorIfTerminated = 'No data in file'
        //-- Check that the file starts with the standard version
        skipCommentLines();
        const standardLineFormat = /^\s*standard\s*=\s*'(\d\d\d\d)'\s*(#.*)?$/;
        const standardMatch = tomlLines[line].match(standardLineFormat);
        if (!standardMatch) {
            warningText = "VHDL Standard not defined in: " + vhdlLsTomlName;
            success = SUCCESS_WARNING;
        }
        else {
            const readStandard = standardMatch[1];
            if (readStandard != standard[0]) {
                warningText = `Switching to language standard ${standard}`;
                success = SUCCESS_WARNING;
            }
            line++;
            copyFrom = line; //-- All read lines up to now will be covered by written data
            ErrorIfTerminated = '';  //-- file may end at this point
        }

        //-- Try to find [Libraries] header
        skipCommentLines();
        const libraryHeaderFormat = /^\s*\[libraries]\s*(#.*)?/;
        if (! tomlLines[line].match(libraryHeaderFormat)) {
            //-- Header not found. Warn and stop reading
            warningText = `Unrecognized text in '${vhdlLsTomlName}'. Was expecting '[libraries]'. New content prepended.`;
            success = SUCCESS_WARNING;
        }
        else {
            line++;
            copyFrom = line; //-- All read lines up to now will be covered by autogenerated data

            //-- Header found, now loop on the different libraries
            let isReadTerminated = false;
            while (! isReadTerminated) {

                //-- The library must start with the library name
                skipCommentLines();
                const libraryNameFormat = /^\s*([a-zA-Z_]+)\.files\s*=\s*\[\s*(#.*)?/;  //-- match:  library-name.files = [    (+ optional comment)
                const libraryNameMatch = tomlLines[line].match(libraryNameFormat);
                if (! libraryNameMatch) {
                    //-- This is not a library declaration. Nothing we are interested in. Stop reading there.
                    success = SUCCESS_WARNING;
                    warningText = `Unrecognized text in '${vhdlLsTomlName}' while expecting 'some-library-name.files = ['. Stop parsing.`;
                    break;
                }

                //-- The library name has been found so continue reading
                line++;
                let foundLibraryName = libraryNameMatch[1]
                ErrorIfTerminated = `Unterminated library '${foundLibraryName}' definition`;
                let foundList = readFileLists[foundLibraryName];
                if (foundList === undefined) {
                    foundList = [];
                    readFileLists[foundLibraryName] = foundList;
                }

                // Read all file paths in this library
                while(true) {
                    //-- Search for the next path of the library
                    skipCommentLines();
                    const pathNameFormat = /^\s*'([^']+)('\s*,)?\s*(#.*)?/;  //-- match: 'file-path' ,   (+ optional comment)
                    const endLibraryFormat = /^\s*]/                         //-- match: ]

                    //-- Is this a library source file path ?
                    const pathNameMatch  = tomlLines[line].match(pathNameFormat);
                    if (pathNameMatch) {
                        //-- The path has been found, add it to the library if it is not already included
                        const libSourceFile = pathNameMatch[1];
                        if (! foundList.includes(libSourceFile)) {
                            foundList.push(libSourceFile);
                        }
                        //-- Go to next line
                        line++;
                        copyFrom = line; //-- All read lines up to now has been understood and will be rewritten or replaced if obsolete
                    }

                    //-- else this was not a path. May be it's the end of the library
                    else {

                        if (tomlLines[line].match(endLibraryFormat)) {
                            //-- Yes! Library reading is completed. Continue with next.
                            line++;
                            copyFrom = line; //-- All read lines up to now will be covered by written data
                            ErrorIfTerminated = '';  //-- file may end at this point
                            //-- The last standard library is the last written library
                            isReadTerminated = (foundLibraryName == workLibIndex);
                        }
                        else {
                            success = SUCCESS_WARNING;
                            warningText = `Unrecognized text in '${vhdlLsTomlName}' in list of files of library '${foundLibraryName}'`;
                            isReadTerminated = true;
                        }
                        //-- we have reached the end of the library file list
                        break;
                    }
                    // else hopefully a new library follows. Do loop to continue reading (if not isReadTerminated)
                }
            }
        }

        const libraryNames = Object.keys(libraryFileLists);
        listMatch = (success == SUCCESS_OK) && (Object.keys(readFileLists).length == libraryNames.length);
        if (listMatch) {
            //-- Compare the list of files read in toml file and
            //-- the list of files and directories collected in the environment

            //-- For the moment we just know that the numbers of libraries read and to write match
            //-- Check that all library to write have been read
            for (const libraryName of libraryNames) {
                const fileList = libraryFileLists[libraryName];
                const readFileList = readFileLists[libraryName];
                if ((readFileList == undefined) || (readFileList.length != fileList.length)) {
                    //-- If the library names don't match stop now
                    listMatch = false;
                    break;
                }
                for (const libraryFilename of fileList) {
                    if (! readFileList.includes(libraryFilename)) {
                        listMatch = false;
                        break;
                    }
                }
                if (! listMatch) {
                    break;
                }
            }
        }
        //-- Get the remaining part of the read file to be copied after rebuilt data
        keepText = tomlLines.slice(copyFrom).join("\n");
    }
    catch (err) {
        //-- Error depends on text in ErrorIfTerminated (if empty no error)
        if (ErrorIfTerminated != '') {
            success = SUCCESS_WARNING;
            warningText = ErrorIfTerminated + ' while reading ' + vhdlLsTomlName;
        }
    }

    if (! listMatch) {
        //-- The list of files has changed. The file needs to be updated
        //-- Rewrite it completely starting by dumping the file list
        //-- and terminating by copying back the custom user part

        let fileContent = "# This file is written by VHDL-Wave vscode extension for use by VHDL-LS extension \n"
                        + "# Avoid to update it manually except after the separation line below\n\n"
                        + "# VHDL language standard.  ** Do NOT edit **\n"
                        + `standard = '${standard[VHDL_LS_STANDARD]}'\n\n`
                        + "[libraries]\n";


        //-- function to write a library section
        function dumpLibrary(libraryName, comment) {
            fileContent += "\n\n# " + comment + "  ** Do NOT edit **\n"
                        +  libraryName + ".files = [\n";
            const libFilePaths = libraryFileLists[libraryName];
            for (const filePath of libFilePaths) {
                fileContent += `    '${filePath}',\n`;
            }
            fileContent += ']\n';
        }

        const libraryNames = Object.keys(libraryFileLists).filter(libName => (libName != workLibIndex));
        for (const libName of libraryNames) {
            dumpLibrary(libName, `Additional library "${libName}"`);
        }
        dumpLibrary(workLibIndex, 'Working library');

        if (keepText.slice(0,separatorLine.length) != separatorLine) {
            fileContent += separatorLine;
        }
        if (keepText) {
            fileContent += keepText;
        }
        else {
            fileContent += "\notherLibraryName.files = [\n]\n";
        }


        try {
            fs.writeFileSync(vhdlLsTomlName, fileContent);
            if (success == SUCCESS_OK) {
                warningText = vhdlLsTomlName + " successfully " + ((isRefresh) ? "updated" : "created");
            }
        }
        catch (err) {
            console.log(err);
            warningText = `Failed to write '${vhdlLsTomlName}': ${err}`;
            success = SUCCESS_ERROR;
        }
    }
    return { message: warningText, severity: success };
}


/**
 * Determine the used libraries and their path and use
 * this information to create or update the vhdl-ls.toml file
 *
 * @param {any} vscode
 * @param {{ refresh: (arg0: string) => Promise<void>;
 *           getParameters: (arg0: string) => Promise<string[][]>;
 *           folderPath: string;
 *           unitName : string;
 *           isWorkLibDirExists: boolean;
 *           workLibDirPath: string;
 *           workLibName: string;
 *           defaultWorkLibraryName: string;
 *           libraryPaths: string[];
 *           getVhdlStandard: () => string;
 *           isEnableLsToml: () => boolean;
 *           listWorkLibFiles: ({}) => Promise<string>;
 *           listPDirList: ({}) => void }} settings
 * @param {any} ghdl
 * @param {any} openFile
 */
async function createUpdateTomlFile(vscode, settings, ghdl, openFile) {
    let status = { message: '', severity: SUCCESS_OK };
    const workspaceDir = settings.folderPath;
    if ((workspaceDir != '') && settings.isEnableLsToml()) {
        const standard          = ghdlToLsStandardAndYear[settings.getVhdlStandard()];
        const libraryFileLists  = {};
        const workLibIndex = await settings.listWorkLibFiles(libraryFileLists);
        if (! openFile) {
            //-- If no file is provided check whether the edited file is a GHDL file
            openFile = getOpenVhdlFile(vscode);
        }
        //-- If a file has been given or found, it may already be
        //-- included in the work library we have listed above
        if (openFile) {
            //-- Though if the work library does not exist yet
            //-- we will need to create it (empty) first
            if (libraryFileLists[workLibIndex] === undefined) {
                libraryFileLists[workLibIndex] = [];
            }
            const workLibFiles = libraryFileLists[workLibIndex];
            if (! workLibFiles.includes(openFile)) {
                workLibFiles.push(openFile);
            }
        }
        settings.listPDirList(libraryFileLists);

        try {
            status = await updateTomlFile(workspaceDir, standard, workLibIndex, libraryFileLists);
        }
        catch(error) {
            status =  { message: error, severity: SUCCESS_ERROR };
        }
    }

    if (status.message != '') {
        let displayMessage;
        switch (status.severity) {
            case SUCCESS_ERROR :
                console.log(status.message);
                displayMessage = vscode.window.showErrorMessage;
                break;
            case SUCCESS_WARNING :
                displayMessage = vscode.window.showWarningMessage;
                break;
            case SUCCESS_OK :
                displayMessage = vscode.window.showInformationMessage;
                break;
        }
        displayMessage(status.message);
    }
    else {
        console.log('Toml file still up-to-date');
    }
}


module.exports = { createUpdateTomlFile };
