// MIT License

// Copyright (c) 2025 Philippe Chevrier

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

const whichSync  = require('./util/which.js');


const WAVE_EXT = '.ghw';


/**
 * @param {string} dirPath
 * @returns {boolean}
 */
function isValidDir (dirPath) {
    let result = false;
    try {
        const dir = fs.opendirSync(dirPath);
        result = !! dir;
        dir.close();
    }
    catch(err) {
        result = false;
    }
    return result;
}


/**
 * @param {string|undefined} settingPath
 * @param {string} buildPath
 * @param {string} workspacePath
 * @param {string} unitName
 * @returns {string}
 */
function getWaveFilename (settingPath, buildPath, workspacePath, unitName) {
	/**
	 * @type {string} waveFilePath
	 */
	let waveFilePath = settingPath;
	if (waveFilePath) {
		if (! path.isAbsolute(waveFilePath)) {
			waveFilePath = path.join(workspacePath, waveFilePath);
		}
		if (! isValidDir(waveFilePath)) {
			throw `Wave file directory '${waveFilePath}' is not a valid directory`;
        }
	}
	else {
		waveFilePath = buildPath;
	}
	return path.join(waveFilePath, unitName + WAVE_EXT);
}



/**
 * @param {string | undefined} settingPath
 * @param {string} workspacePath
 * @returns {[string, boolean]}
 */
function getBuildDir (settingPath, workspacePath) {
    let buildPath = settingPath;
    if (! buildPath) {
        buildPath = path.join(workspacePath, 'build');
    }
    else {
        if (! path.isAbsolute(buildPath)) {
            buildPath = path.join(workspacePath, buildPath);
        }
    }
    let isExisting = isValidDir(buildPath);
    return [buildPath, isExisting];
}



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


/**
 * @param {string} exe
 * @param {object} vscode
 * @returns {string}
 */
function whichPath (exe, vscode) {
    const found = whichSync(exe, { nothrow: true });
    if (found) {
        if (Array.isArray(found)) {
            vscode.window.showErrorMessage(`Found several ${exe} in PATH environment variable. Will use first.`);
            return found[0];
        }
        else {
            return found;
        }
    }
    else {
        vscode.window.showErrorMessage(`Cannot find ${exe}. Add path of the ${exe} directory to your PATH environment variable.`);
        return exe;
    }
}


/**
 * @param {string[]} dirList
 * @param {string} workspaceDir
 * @param {object} vscode
 * @returns {string[]}
 */
function absoluteList (dirList, workspaceDir, vscode) {
    const result = [];
    for (const aDir of dirList) {
        const absDir = (path.isAbsolute(aDir)) ? aDir : path.join(workspaceDir, aDir);
        if (isValidDir(absDir)) {
            result.push(absDir);
        }
        else {
            vscode.window.showErrorMessage(`Cannot find ${aDir}. Fix Library Directories.`);
        }
    }
    return result;
}


module.exports = { 
	getWaveFilename : getWaveFilename,
    getBuildDir     : getBuildDir,
	createDir       : createDir,
	whichPath       : whichPath,
    absoluteList    : absoluteList,
};
