// MIT License

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
const path      = require('path');
const { spawn } = require('child_process');


// The channel that will be used to output errors
let outputChannel;
// The UTF-8 text decoder
let textDecoder;

const GHDL    = 'ghdl';
const GTKWAVE = 'gtkwave';

const { Settings, TaskEnum } = require('./settings/Settings');
const { TextDecoder } = require('util');
  
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


// this method is called when vs code is activated
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	if (!outputChannel)
		outputChannel = vscode.window.createOutputChannel('GHLD Output');
	if (!textDecoder)
		textDecoder = new TextDecoder;

	//-- Asynchronous functions to process commands
	const analyzeAsyncCmd = async (/** @type {any} */ selectedFile) => {
		await vscode.window.activeTextEditor.document.save(); //save open file before analyzing it
		analyzeFile(getSelectedFilePath(selectedFile)); 
	}
	const elabAsyncCmd   = async (/** @type {any} */ selectedFile) => { elaborateFiles(getSelectedFilePath(selectedFile)); }
	const runAsyncCmd    = async (/** @type {any} */ selectedFile) => { runUnit(getSelectedFilePath(selectedFile)); }
	const cleanAsynCmd   = async (/** @type {any} */ selectedFile) => { cleanGeneratedFiles(getSelectedFilePath(selectedFile)); }
	const removeAsynCmd  = async (/** @type {any} */ selectedFile) => { removeGeneratedFiles(getSelectedFilePath(selectedFile)); }
	const waveAsynCmd    = async (/** @type {{ fsPath: string; }} */ selectedFile) => { invokeGtkwave(selectedFile.fsPath); }
	
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
	
	let disposableEditorClean = vscode.commands.registerCommand('extension.editor_ghdl-clean', cleanAsynCmd);
	let disposableExplorerClean = vscode.commands.registerCommand('extension.explorer_ghdl-clean', cleanAsynCmd);

	context.subscriptions.push(disposableEditorClean); 
	context.subscriptions.push(disposableExplorerClean);

	let disposableEditorRemove = vscode.commands.registerCommand('extension.editor_ghdl-remove', removeAsynCmd);
	let disposableExplorerRemove = vscode.commands.registerCommand('extension.explorer_ghdl-remove', removeAsynCmd);

	context.subscriptions.push(disposableEditorRemove); 
	context.subscriptions.push(disposableExplorerRemove);

	let disposableExplorerGtkwave = vscode.commands.registerCommand('extension.explorer_gtkwave', waveAsynCmd);

	context.subscriptions.push(disposableExplorerGtkwave);

	console.log('VHDL-Wave now active!'); // log extension start
}

function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
		outputChannel = null;
    }
	if (textDecoder) {
		textDecoder.dispose();
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
 * @param {string} dirPath
 * @param {string} successMessage
 */
function executeCommand(command, args, dirPath, successMessage) {
	if (Array.isArray(dirPath)) {
		vscode.window.showErrorMessage(`Path of library 'WORK' not found. Create '${dirPath[0]}' or check value in extension settings`);
	} 
	else {
		const executionPromise = new Promise (function(resolve, reject) {
			console.log(command + ' ' + args.join(' ') );

			outputChannel.clear();
			outputChannel.show();
			
			let endOfError = false;
			let endOfOutput = false;
			let endOfCommand = false;
			let returnCode;

			const spawnProcess = spawn(command, args, {cwd: dirPath});
			
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

		});

		executionPromise.then(
			() => { outputChannel.appendLine(`\nSuccess: ${successMessage}`); },
			() => { }
		);
	}
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
 * @param {any[]} userOptions
 * @param {string} filePath
 * @param {any[]} runOptions
 */
function ghdlOptions(command, userOptions, filePath, runOptions = []) {
	const options = [ command ].concat(userOptions);
	options.push(filePath);
	return options.concat(runOptions);
}


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
	const [ dirPath, userOptions, fileName, , ] = await settings.get(filePath, TaskEnum.analyze); //get user specific settings
	executeCommand(GHDL, ghdlOptions('-a', userOptions, fileName), dirPath, fileName + ' analyzed without errors');
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
	const [ dirPath, userOptions, fileName, unitName, ] = await settings.get(filePath, TaskEnum.elaborate); //get user specific settings
	executeCommand(GHDL, ghdlOptions('-e', userOptions, unitName), dirPath, fileName + ' elaborated without errors');
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
	try {
		const [ dirPath, userOptions, , unitName, runOptions ] = await settings.get(filePath, TaskEnum.run); //get user specific settings
		if (dirPath === null) {
			// Use execute command to print the error about directory
			executeCommand('', '', dirPath, '');
		}
		else {
			executeCommand(GHDL, ghdlOptions('-r', userOptions, unitName, runOptions), dirPath, 'Simulation completed');
		}
	}
	catch (err) {
		vscode.window.showWarningMessage("Run: " + err);		
	}
}

/*
**Function: cleanGeneratedFiles
**usage: removes generated object files 
**parameter: filePath
**return value(s): none
 */
/**
 * @param {string} filePath
 */
async function cleanGeneratedFiles(filePath) {
	const [ dirPath,  ,  ,  , ] = await settings.get(filePath); 
	executeCommand(GHDL, [ '--clean' ], dirPath, 'cleaned generated files');
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
	const [ dirPath,  ,  ,  ] = await settings.get(filePath); 
	executeCommand(GHDL, [ '--remove' ], dirPath, 'removed generated files');
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
function invokeGtkwave(filePath) {
	executeCommand(GTKWAVE, [ filePath ], '.', 'GTKWave completed');
}

