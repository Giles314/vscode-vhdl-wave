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

const vscode    = require('vscode');
const { spawn } = require('child_process');
const LsTomlWriter = require('./LsTomlWriter.js')
const path   = require('path');
const { TextDecoder } = require('util');



// The channel that will be used to output errors
let outputChannel;
// The UTF-8 text decoder
let textDecoder;

const GHDL    = 'ghdl';
const GTKWAVE = 'gtkwave';
const YOSYS   = 'yosys';
const P_R     = 'p_r';
const FPGA_LOADER = 'openFPGALoader';


const { Settings, CommandTag, TOOLCHAIN_ENVVAR } = require('./Settings.js');
  
const settings = new Settings(vscode)

/*Function: getSelectedFilePath
**usage: when called from editor, file is given just return it,
**when call from explorer, nothing is passed, get file selected in explorer
**Parameter : the parameter given by vscode (nothing or the file)
**Return value(s): the selected file path
*/
/**
 * @param {any} givenUri
 */
function getSelectedFilePath(givenUri) {
    let selectedFileUri;
    if (givenUri == undefined) {
        selectedFileUri = vscode.window.activeTextEditor.document.uri;
    } else {
        selectedFileUri = givenUri;
    }
    return selectedFileUri.fsPath;
}


/**
 * @param {string} tool
 * @returns {string} The path to the tool
 */
function getToolPath(tool) {
    const toolPath = settings.getToolPath(tool);
    if (toolPath === undefined) {
        vscode.window.showErrorMessage(`'${tool}' path not found. Define ${TOOLCHAIN_ENVVAR} environment variable. Check README.md for more information.`);
    }
    return toolPath;
}


// this method is called when vs code is activated
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

    if (!outputChannel)
        outputChannel = vscode.window.createOutputChannel('GHDL Output');
    if (!textDecoder)
        textDecoder = new TextDecoder;

    //-- Asynchronous functions to process commands
    const analyzeAsyncCmd = async (/** @type {any} */ selectedFile) => {
        await vscode.window.activeTextEditor.document.save(); //save open file before analyzing it
        analyzeFile(getSelectedFilePath(selectedFile)); 
    }
    const elabAsyncCmd   = async (/** @type {any} */ selectedFile) => { elaborateFiles(getSelectedFilePath(selectedFile)); }
    const runAsyncCmd    = async (/** @type {any} */ selectedFile) => { runUnit(getSelectedFilePath(selectedFile)); }

    const makeAsyncCmd = async (/** @type {any} */ selectedFile) => {
        await vscode.window.activeTextEditor.document.save(); //save open file before analyzing it
        makeUnit(getSelectedFilePath(selectedFile)); 
    }
    const removeAsynCmd  = async (/** @type {any} */ selectedFile) => { removeGeneratedFiles(getSelectedFilePath(selectedFile)); }
    const waveAsynCmd    = async (/** @type {{ fsPath: string; }} */ selectedFile) => { invokeGtkwave(selectedFile.fsPath); }
    
    const synthesizeAsynCmd  = async (/** @type {any} */ selectedFile) => { synthesizeProject(getSelectedFilePath(selectedFile)); }
    const implementAsynCmd   = async (/** @type {any} */ selectedFile) => { implementProject(getSelectedFilePath(selectedFile)); }
    const loadFpgaAsynCmd    = async (/** @type {any} */ selectedFile) => { loadFpgaBitStream(getSelectedFilePath(selectedFile)); }

    let disposableEditorAnalyze = vscode.commands.registerCommand('extension.editor_ghdl-analyze_file', analyzeAsyncCmd);
    let disposableExplorerAnalyze = vscode.commands.registerCommand('extension.explorer_ghdl-analyze_file', analyzeAsyncCmd);

    context.subscriptions.push(disposableEditorAnalyze);
    context.subscriptions.push(disposableExplorerAnalyze); 

    let disposableEditorElaborate = vscode.commands.registerCommand('extension.editor_ghdl-elaborate_file', elabAsyncCmd);
    let disposableExplorerElaborate = vscode.commands.registerCommand('extension.explorer_ghdl-elaborate_file', elabAsyncCmd);

    context.subscriptions.push(disposableEditorElaborate);
    context.subscriptions.push(disposableExplorerElaborate); 

    let disposableEditorRunUnit = vscode.commands.registerCommand('extension.editor_ghdl-run_unit', runAsyncCmd);
    let disposableExplorerRunUnit = vscode.commands.registerCommand('extension.explorer_ghdl-run_unit', runAsyncCmd);

    context.subscriptions.push(disposableEditorRunUnit);
    context.subscriptions.push(disposableExplorerRunUnit); 
    
    let disposableEditorMakeUnit = vscode.commands.registerCommand('extension.editor_ghdl-make_unit', makeAsyncCmd);
    let disposableExplorerMakeUnit = vscode.commands.registerCommand('extension.explorer_ghdl-make_unit', makeAsyncCmd);

    context.subscriptions.push(disposableEditorMakeUnit);
    context.subscriptions.push(disposableExplorerMakeUnit); 
    
    let disposableEditorRemove = vscode.commands.registerCommand('extension.editor_ghdl-remove', removeAsynCmd);
    let disposableExplorerRemove = vscode.commands.registerCommand('extension.explorer_ghdl-remove', removeAsynCmd);

    context.subscriptions.push(disposableEditorRemove); 
    context.subscriptions.push(disposableExplorerRemove);

    let disposableExplorerGtkwave = vscode.commands.registerCommand('extension.explorer_gtkwave', waveAsynCmd);

    context.subscriptions.push(disposableExplorerGtkwave);

    let disposableEditorSynthesize = vscode.commands.registerCommand('extension.editor_yosys-synth', synthesizeAsynCmd);
    let disposableExplorerSynthesize = vscode.commands.registerCommand('extension.explorer_yosys-synth', synthesizeAsynCmd);

    context.subscriptions.push(disposableEditorSynthesize); 
    context.subscriptions.push(disposableExplorerSynthesize);

    let disposableEditorImplement = vscode.commands.registerCommand('extension.editor_place&route', implementAsynCmd);
    let disposableExplorerImplement = vscode.commands.registerCommand('extension.explorer_place&route', implementAsynCmd);

    context.subscriptions.push(disposableEditorImplement); 
    context.subscriptions.push(disposableExplorerImplement);

    let disposableEditorLoadFpga = vscode.commands.registerCommand('extension.editor_load-FPGA', loadFpgaAsynCmd);
    let disposableExplorerLoadFpga = vscode.commands.registerCommand('extension.explorer_load-FPGA', loadFpgaAsynCmd);

    context.subscriptions.push(disposableEditorLoadFpga); 
    context.subscriptions.push(disposableExplorerLoadFpga);


    // Register an event listener for when a VHDL document is opened
    vscode.workspace.onDidOpenTextDocument((document) => {
        // Check the file type
        if (document.languageId === 'vhdl') {
            // Check whether this file is listed in vhdl source files
            LsTomlWriter.createUpdateTomlFile(vscode, settings, GHDL, document.uri.fsPath);
        }
    });

    vscode.workspace.onDidChangeWorkspaceFolders((event) => {
        event.added.forEach(folder => {
          console.log(`Folder open: ${folder.uri.fsPath}`);
          // Check whether it is possible to list VHDL files in this folder
          LsTomlWriter.createUpdateTomlFile(vscode, settings, GHDL);
        });
    });

    settings.refresh().then(() => {
        LsTomlWriter.createUpdateTomlFile(vscode, settings, GHDL);
        console.log('VHDL-Wave now active!'); // log extension start
    });
}

function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
        outputChannel = null;
    }
    if (textDecoder) {
        textDecoder = null;
    }
}

module.exports = {
    activate,
    deactivate
}


/**
 * @param {{ buffer: NodeJS.ArrayBufferView | ArrayBuffer; }} data
 */
function decodeDataToOutputChannel(data) {
    outputChannel.append(textDecoder.decode(data.buffer));
}

/*
**Function: executeCommand
**usage: invoke the given command in given dirPath unless dirPath is null
**parameters: 
** - Command to execute; 
** - Directory where to execute the command; 
** - Message to display in case of success.
**return value: none
*/
/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} successMessage
 * @param {boolean} continueLog
 */
async function executeCommand(command, args, successMessage, continueLog = false) {
    let result = false;
    
    const executionPromise = new Promise (function(resolve, reject) {
        console.log(command + ' ' + args.join(' ') );
        
        if (! continueLog) {
            outputChannel.clear();
            outputChannel.show();
        }
        
        let endOfError = false;
        let endOfOutput = false;
        let endOfCommand = false;
        let returnCode;

        const spawnProcess = spawn(command, args, {cwd: settings.buildPath});
        
        spawnProcess.stderr.on('data', (receivedData) => {
            decodeDataToOutputChannel(receivedData);
        } );

        spawnProcess.stdout.on('data', (receivedData) => {
            decodeDataToOutputChannel(receivedData);
        } );

    
        function checkTermination() {
            if (endOfError && endOfOutput && endOfCommand) {
                if (returnCode == 0) {
                    resolve();
                }
                else {
                    reject();
                }
            }
        }

        spawnProcess.stderr.on('end', () => { endOfError = true; checkTermination(); } );
        spawnProcess.stdout.on('end', () => { endOfOutput = true; checkTermination(); } );
        spawnProcess.on('close', (rc) => { endOfCommand = true; returnCode = rc; checkTermination(); } );
        spawnProcess.on('error', (err) => { outputChannel.appendLine(`\nFailed running ${command} in ${settings.buildPath} with error:\n${err}`); });
    });

    await executionPromise.then(
        () => { outputChannel.appendLine(`\nSuccess: ${successMessage}`); result = true; },
        () => { }
    );

    return result;
}


/*
**Function: ghdlOptions
**usage: invokes ghdl to analyze file from filePath parameter
**parameter:
** - The executable command
** - The command options list
** - The target filename
** - The list of run options
**return value: none
*/
/**
 * @param {string} command
 * @param {string} filePath
 * @returns {Promise<{paramList:string[], unit:string}>}
 */
async function ghdlOptions(command, filePath) {
    const [ userOptions, runOptions ] = await settings.getParameters(command);
    let targetUnit = '';
    switch (command) {
        case CommandTag.analyze:
        case CommandTag.wave:
            targetUnit = filePath;
            break;
        case CommandTag.elaborate:
        case CommandTag.run:          
        case CommandTag.make:
        case CommandTag.synth:
        case CommandTag.implement:
            targetUnit = settings.unitName;
            break;
    }
    const options = [ command ].concat(userOptions);
    switch (command) { 
        case CommandTag.synth :
            options.push(settings.get_project_source());
            options.push('-e');
            break;
        case CommandTag.implement :
            options.push(settings.getSynthNetlistFilename(targetUnit))
            options.push('-o');
            break;
        default:
    }
    if (targetUnit != '') {
        options.push(targetUnit);
    }
    return { paramList: options.concat(runOptions), unit: targetUnit } ;
}


/**
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function prepareCommand(filePath) {
    await settings.refresh(filePath);
    const isValidContext = settings.isWorkLibDirExists;
    if (!isValidContext) {
        vscode.window.showErrorMessage(`Path of library 'WORK' not found. Create '${settings.workLibDirPath}' or check value in extension settings or in .vscode/.vhdl-ware.js`);
    }
    return isValidContext;
}


/**
 * @param {string} filePath
 * @param {string} tool
 * @returns {Promise<string>}
 */
async function prepareToolChain(filePath, tool) {
    await settings.refresh(filePath, /*mustCreateBuildDir*/true);
    const ToolPath = getToolPath(tool);
    if (ToolPath !== undefined) {
        settings.makeSubDirs();
    }
    return ToolPath;
}

//=========================================== Command functions ===========================================

/*
**Function: analyzeFile
**usage: invokes ghdl to analyze file from filePath parameter
**parameter: path of the file to analyze
**return value: none
*/
/**
 * @param {string} filePath
 */
async function analyzeFile(filePath) {
    if (await prepareCommand(filePath)) {
        LsTomlWriter.createUpdateTomlFile(vscode, settings, GHDL, filePath);
        const command = await ghdlOptions(CommandTag.analyze, filePath);
        await executeCommand(settings.ghdlPath, command.paramList, path.basename(filePath) + ' analyzed without errors');
    }
}


/*
**Function: elaborateFiles
**usage: elaborates the unit of the analyzed vhdl source file
**parameter: path of the file that was analyzed
**return value(s): none
*/
/**
 * @param {string} filePath
 */
async function elaborateFiles(filePath) {
    if (await prepareCommand(filePath)) {
        const command = await ghdlOptions(CommandTag.elaborate, filePath);
        await executeCommand(settings.ghdlPath, command.paramList, command.unit + ' elaborated without errors');
    }
}


/*
**Function: runUnit
**usage: runs the testbench unit and exports to ghw file 
**parameter: path of the file that was analyzed
**return value(s): none
*/
/**
 * @param {string} filePath
 */
async function runUnit(filePath) {
    if (await prepareCommand(filePath)) {
        try {
            const command = await ghdlOptions(CommandTag.run, filePath);
            await executeCommand(settings.ghdlPath, command.paramList, command.unit + ': Simulation completed');
        }
        catch (err) {
            vscode.window.showWarningMessage("Run: " + err);		
        }
    }
}


/*
**Function: makeUnit
**usage: make the testbench unit and exports to ghw file 
**parameter: path of the file that was analyzed
**return value(s): none
*/
/**
 * @param {string} filePath
 */
async function makeUnit(filePath) {
    if (await prepareCommand(filePath)) {
        try {
                let command = await ghdlOptions(CommandTag.make, filePath);
                const success = await executeCommand(settings.ghdlPath, command.paramList, `Make ${command.unit} completed. Running simulation...`);
                if (success) {
                    command = await ghdlOptions(CommandTag.run, filePath);
                    await executeCommand(settings.ghdlPath, command.paramList, 'Simulation completed', /*continueLog*/true);
                }
        }
        catch (err) {
            vscode.window.showWarningMessage("Run: " + err);		
        }
    }
}


/*
**Function: removeGeneratedFiles
**usage: removes generated object files and library file
**parameter: none
**return value(s): none
 */
/**
 * @param {string} filePath
 */
async function removeGeneratedFiles(filePath) {
    if (await prepareCommand(filePath)) {
        const buttonText = 'Yes, remove';

        const answer = await vscode.window.showWarningMessage(
            'Are you sure you want to remove completely your library?',
            { modal: true },
            buttonText,
        );
        
        if (answer == buttonText) {
            const command = await ghdlOptions(CommandTag.remove, filePath);
            executeCommand(settings.ghdlPath, command.paramList, 'Library and generated files removed');
        }
        else {
            vscode.window.showInformationMessage('Command cancelled.');
        }
    }
}


/*
**Function: invokeGtkwave
**usage: opens selected file in Gtkwave 
**parameter: filePath
**return value(s): none
 */
/**
 * @param {string} filePath
 */
async function invokeGtkwave(filePath) {
    if (await prepareCommand(filePath)) {
        const command = await ghdlOptions(CommandTag.wave, filePath);
        executeCommand(settings.wavePath, command.paramList, 'GTKWave completed');
    }
}


/*
**Function: synthesizeProject
**usage: Synthesize the project using Yosys to produce a net list from VHDL source files 
**parameter: path of the file that is the top module
**return value(s): none
*/
/**
 * @param {string} filePath
 */
async function synthesizeProject(filePath) {
    const yosysToolPath = await prepareToolChain(filePath, YOSYS);
    if (yosysToolPath !== undefined) {
        const command = await ghdlOptions(CommandTag.synth, filePath);
        const quotedList = [ GHDL, 
                            command.paramList.join(' ') + ';',
                            'synth_gatemate',
                            '-top', 
                            command.unit, 
                            '-nomx8',
                            '-vlog',
                            settings.getSynthNetlistFilename(command.unit) ];
        const quotedParam = quotedList.join(' ');
        let paramList = ['-l', settings.getLogFilePath('synth.log'), '-p', quotedParam];
        await executeCommand(yosysToolPath, paramList, `Synthesize ${command.unit} completed`);
    }
}


/*
**Function: implementProject
**usage: Implement the GateMate net list to produce FPGA configuration bit stream
**parameter: path of the file that is the top module
**return value(s): none
*/
/**
 * @param {string} filePath
 */
async function implementProject(filePath) {
    const p_rToolPath = await prepareToolChain(filePath, P_R);
    if (p_rToolPath !== undefined) {
        const command = await ghdlOptions(CommandTag.implement, filePath);
        command.paramList.push( '-ccf');
        const ccfFilename = filePath.replace(/\.[^/.]+$/, ".ccf");
        command.paramList.push(ccfFilename);
        await executeCommand(p_rToolPath, command.paramList, `Implementation of ${command.unit} completed`);
    }
}


/*
**Function: loadFpgaBitStream
**usage: Load the configuration bit stream into the GateMate FPGA
**parameter: path of the file that is the top module
**return value(s): none
*/
/**
 * @param {string} filePath
 */
async function loadFpgaBitStream(filePath) {
    const fpgaLoaderToolPath = await prepareToolChain(filePath, FPGA_LOADER);
    if (fpgaLoaderToolPath !== undefined) {
        const fpgaConfigBitStream = settings.unitName + '_00.cfg'; //-- File that contains the FPGA configuration bit stream
        const loadInterfaceOptions = settings.getUploadInterfaceOptions().concat([fpgaConfigBitStream]);
        await executeCommand(fpgaLoaderToolPath, loadInterfaceOptions, `Loading of ${settings.unitName} design configuration completed`);
    }
}

