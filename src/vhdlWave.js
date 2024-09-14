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

const vscode = require('vscode');
const path = require('path'); 
const { exec } = require('child_process');

// The channel that will be used to output errors
let outputChannel;

  const ghwDialogOptions = {
	canSelectMany: false,
	openLabel: 'Open',
	filters: {
	   'ghw files': ['ghw']
   }
};

const { Settings, TaskEnum } = require('./settings/Settings');
  

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

/*
**Function: getWorkspaceDirPath
**usage: Provides the directory path of the project environment.
**Usually this corresponds to the first working folder.
**When user has not defined any, use the directory of compiled file
**Parameter : the compile file path
**return value(s): the path of the workspace directory
*/
/**
 * @param {string} filePath
 */
function getWorkspaceDirPath(filePath) {
	let dirPath;
	const Folders = vscode.workspace.workspaceFolders;
	if (Folders == undefined) {
		dirPath = path.dirname(filePath); // When no workspace folder is defined use the file folder
	} else {
		dirPath = Folders[0].uri.fsPath;  // Get path of workspace root directory where the ghdl command must be run by default
	}
	return dirPath;
}



// this method is called when vs code is activated
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	if (!outputChannel)
	outputChannel = vscode.window.createOutputChannel('GHLD Output');

	//-- Asynchronous functions to process commands
	const analyzeAsyncCmd = async (/** @type {any} */ selectedFile) => {
		await vscode.window.activeTextEditor.document.save(); //save open file before analyzing it
		analyzeFile(getSelectedFilePath(selectedFile)); 
	}
	const elabAsyncCmd   = async (/** @type {any} */ selectedFile) => { elaborateFiles(getSelectedFilePath(selectedFile)); }
	const runAsyncCmd    = async (/** @type {any} */ selectedFile) => { runUnit(getSelectedFilePath(selectedFile)); }
	const cleanAsynCmd   = async (/** @type {any} */ selectedFile) => { cleanGeneratedFiles(getSelectedFilePath(selectedFile)); }
	const removeAsynCmd  = async (/** @type {any} */ selectedFile) => { removeGeneratedFiles(); /*unused*/ selectedFile; }
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
    }
}

module.exports = {
	activate,
	deactivate
}


/*
**Function: displayCommandResult
**usage: after invoking a GHDL command, displays the result in asynchronous way
**parameters: 
**  - Error code or null when OK
**  - Command error output
**  - Success message to display when no error
**  - Asynchronous highlight errors function to call when not undefined and an error occured
*/
/**
 * @param {import("child_process").ExecException} error
 * @param {any} errorOutput
 * @param {string} successMessage
 */
async function displayCommandResult(error, errorOutput, successMessage) {
	outputChannel.clear();
	outputChannel.show();

	if (error) {
		outputChannel.appendLine(error.message);
		return;
	  } else {
		outputChannel.appendLine(`\nSuccess: ${successMessage}`);
	}
}

/*
**Function: analyzeFile
**usage: invokes ghdl to analyze file from filePath parameter
**parameter: path of the file to analyze
**return value(s): none
*/
/**
 * @param {string} filePath
 */
function analyzeFile(filePath) {
	const settings = new Settings(vscode)
	const userOptions = settings.getSettingsString(TaskEnum.analyze) //get user specific settings
	const dirPath = getWorkspaceDirPath(filePath);
	const fileName = path.basename(filePath);
	const command = 'ghdl -a ' + userOptions + ' ' + '"' + filePath + '"'; //command to execute
	console.log(command);

	const cmdOutputProcessing = async (/** @type {import("child_process").ExecException} */ err, /** @type {any} */ stdout, /** @type {any} */ stderr) => 
		{ 
			await displayCommandResult(err, stderr, fileName + ' analyzed without errors');
			/*unused*/ stdout; 
		};
		
	exec(command, {cwd: dirPath}, cmdOutputProcessing);
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
function elaborateFiles(filePath) {
	const settings = new Settings(vscode)
	const userOptions = settings.getSettingsString(TaskEnum.elaborate) //get user specific settings
	const dirPath = getWorkspaceDirPath(filePath);
	const fileName = path.basename(filePath);
	const unitName = fileName.substring(0, fileName.lastIndexOf("."));
	const command = 'ghdl -e ' + userOptions + ' ' + unitName; //command to execute (elaborate vhdl file)
	console.log(command);

	const cmdOutputProcessing = async (/** @type {any} */ err, /** @type {any} */ stdout, /** @type {any} */ stderr) => { 
		await displayCommandResult(err, stderr, fileName + ' elaborated without errors');
		/*unused*/ stdout; 
	};

	exec(command, {cwd: dirPath}, cmdOutputProcessing);
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
function runUnit(filePath) {
	const settings = new Settings(vscode)
	const userOptions = settings.getSettingsString(TaskEnum.run) //get user specific settings
	const dirPath = getWorkspaceDirPath(filePath); 
	const fileName = path.basename(filePath);
	const unitName = fileName.substring(0, fileName.lastIndexOf("."));
	vscode.window.showSaveDialog(ghwDialogOptions).then(fileInfos => {
		const simFilePath = fileInfos.path + '.ghw';
		const command = 'ghdl -r ' + userOptions + ' ' + unitName + ' ' + '--wave=' + '"' + simFilePath + '"'; //command to execute (run unit)
		console.log(command);

		const cmdOutputProcessing = async (/** @type {any} */ err, /** @type {any} */ stdout, /** @type {any} */ stderr) => { 
			await displayCommandResult(err, stderr, fileName + ' elaborated without errors');
			/*unused*/ stdout; 
		};
		
		exec(command, {cwd: dirPath}, cmdOutputProcessing);
	});
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
function cleanGeneratedFiles(filePath) {
	const dirPath = getWorkspaceDirPath(filePath); 
	const command = 'ghdl --clean'; //command to execute (clean generated files)
	console.log(command);

	const cmdOutputProcessing = async (/** @type {any} */ err, /** @type {any} */ stdout, /** @type {any} */ stderr) => { 
		await displayCommandResult(err, stderr, 'cleaned generated files');
		/*unused*/ stdout; 
	};
	
	exec(command, {cwd: dirPath}, cmdOutputProcessing);
}

/*
**Function: removeGeneratedFiles
**usage: removes generated object files and library file
**parameter: none
**return value(s): none
 */
function removeGeneratedFiles() {
	const dirPath = vscode.workspace.rootPath; 
	const command = 'ghdl --remove'; //command to execute (remove generated files)
	console.log(command);

	const cmdOutputProcessing = async (/** @type {any} */ err, /** @type {any} */ stdout, /** @type {any} */ stderr) => { 
		await displayCommandResult(err, stderr, 'removed generated files');
		/*unused*/ stdout; 
	};
	
	exec(command, {cwd: dirPath}, cmdOutputProcessing);
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
	const command = 'gtkwave ' + '"' + filePath + '"'; //command to execute (gtkwave)
	console.log(command);
	exec(command, async (err, stdout, stderr) => { 
  		if (err) {
			vscode.window.showErrorMessage(stderr);
    		return;
  		}
	});
}

