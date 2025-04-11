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

// miniglog.js : this utility will allow to get a list of files matching a pattern
//                 It aims to replacle glob.js for code reduced footprint
//
// pattern rules:
//   - Pattern characters are: * ? < > |
//     -- * means any number of characters
//     --   ** between 2 / means in any sub-directory including current directory
//     -- ? means one character
//     -- < means beginning of an alternative
//     -- > mark the end of an altenative and must be paired with a <
//     -- | separate the alternative values
//   - When no | is found between < and > this means that
//     each character between < and > is an alternative value
//      - examples: <ab|cd> => ab or cd, <a|> means a or nothing,
//                  <abcdefgh> means any character between a and h.
//   - no * may be found between < and >
//   - a pattern must be absolute and top directory MAY not include pattern characters

const fs     = require('fs');
const path   = require('path');
const os     = require('os');


//-- Possible pattern types
const SIMPLE_VALUE = 0;
const NORMAL_PATTERN = 1;
const ANY_DIR = 2;
const INVALID_PATTERN = -1;
const EMPTY_PATTERN = -2;


//-- Detects whether the pattern is actually a pattern rather than a simple string
const getPatternRE = /^([^*?<]*)([*?<])(.*)$/;
const specialRECharRE = /[\^\$\.\+\(\)\[\]\{\}]/;
const closeBracketRE = />/;

const isPlatformCaseSensitive = (os.platform() != 'win32');

class BasicPattern {
	/**
	 * @param {string} patText
	 */
	constructor(patText) {
		const patternMatch = patText.match(getPatternRE);
		if (! patternMatch) {
			this.patType = SIMPLE_VALUE;
			this.value = patText;
		}
		else if (patText == '*') {
			this.patType = ANY_DIR;
			this.minDepth = 1;
			this.maxDepth = 1;
		}
		else if (patText == '**') {
			this.minDepth = 0;
			this.patType = ANY_DIR;
		}
		else {
			this.patType = NORMAL_PATTERN
			this.patRegExp = '';
			if (!this.#makeRegExp(patternMatch)){
				this.patType = INVALID_PATTERN;
				this.value = patText;
				this.patRegExp = undefined;
			}
			else if (this.patRegExp != '') {
				this.patRegExp = new RegExp('^' + this.patRegExp + '$', (isPlatformCaseSensitive)?undefined:'i');
			}
			else {
				this.patType = EMPTY_PATTERN;
			}
		}
	}


	merge(other) {
		this.minDepth += other.minDepth;
		if (this.maxDepth != undefined) {
			if (other.maxDepth != undefined) {
				this.maxDepth += other.maxDepth;
			}
			else {
				this.maxDepth = undefined;
			}
		}
	}


	/**
	 * @param {string[]} patternMatch
	 * @returns {boolean} success
	 */
	#makeRegExp(patternMatch) {
		for(;;) {
			let last = 0;
			this.#concat(patternMatch[1]);
			switch (patternMatch[2]) {
				case '<': {
					last = patternMatch[3].search(closeBracketRE);
					if (last < 0) {
						return false;
					}
					const bracketString = patternMatch[3].substring(0, last);
					if (bracketString.match(getPatternRE)) {
						return false;
					}
					++last; // Skip closing bracket
					const bracketSlices = bracketString.split('|');
					if (bracketSlices.length > 1) {
						this.patRegExp += '(';
						let first = true;
						for (const slice of bracketSlices) {
							if (!first) {
								this.patRegExp += '|';
							}
							else {
								first = false;
							}
							this.#concat(slice);
						}
						this.patRegExp += ')';
					}
					else {
						this.patRegExp += '[';
						this.#concat(bracketString);
						this.patRegExp += ']';
					}
				}
				break;
				case '*': 
					this.patRegExp += '.*';
					break;
				case '?':
					this.patRegExp += '.';
					break;
			}
			const remain = patternMatch[3].substring(last);
			if (remain.length == 0) {
				return true;
			}
			patternMatch = remain.match(getPatternRE);
			if (! patternMatch) {
				this.#concat(remain);
				return true;
			}
		}
	}


	/**
	 * Concatenate the given string to the this.patRegExp
	 * The string should match exactly the string in the RegExp
	 * even if it contains some RegExp special char
	 * So the special chars in the strings must be protected
	 * @param {string} simpleValue
	 */
	#concat(simpleValue) {
		let start = 0;  // Concatenate string from its first char (at index 0)
		for (;;) {
			// Get remaining part of the string to concatenate
			const remain = simpleValue.substring(start);
			// Lookup for next special char in string
			let next = remain.search(specialRECharRE);
			if (next < 0) {
				// No special char in the (remaining) string: just concatenate
				this.patRegExp += remain;
				// And that all
				break;
			}
			// We have found at least one special char else we would have break above
			if (next > 0) {
				// This character is not the first one
				// so concatenate the non-special chars before it
				this.patRegExp += remain.substring(0, next);
				// Continue at the special char place
				start += next;
			}
			// We are at the exact special char place
			// insert a backslash protect before it
			this.patRegExp += '\\' + remain.charAt(next);
			// Continue at next char
			start++;
		}
	}
}


class MiniGlob {

    /**
	 * @param {string} pattern
	 */
    constructor(pattern) {
		this.source = pattern;
		this.patternText = pattern;  // Keep the pattern source in case user would need it
		this.#parsePattern(pattern);
	}


	/**
	 * @param {string} pattern
	 */
	#parsePattern(pattern) {
		pattern = pattern.replace(/\\/g, '/');
		this.patternList = pattern.split('/').map((/** @type {string} */ item) => new BasicPattern(item));
		// Check that there is no invalid pattern
		for (const basicPattern of this.patternList) {
			if (basicPattern.patType == INVALID_PATTERN) {
				this.error = "Invalid pattern: /" + basicPattern.value + "/" ;
				this.patternList = undefined;
				return;
			}
		}
		// Merge all leading EMPTY_PATTERN and replace each of them by a '/' at head of first SIMPLE_VALUE
		let emptyCount
		for (emptyCount = 0; (this.patternList.length > 0) && (this.patternList[0].patType == EMPTY_PATTERN); ++emptyCount) {
			this.patternList.shift();
		}
		// The first remaining pattern must be a SIMPLE_VALUE
		if (this.patternList.length == 0) {
			this.error = "Empty path pattern";
			return;
		}
		if (this.patternList[0].patType != SIMPLE_VALUE) {
			this.error = "Pattern must not include wildchar in partition name:" + this.source;
			return;
		}
		//-- Add the leading separators to the first initial value
		this.patternList[0].value = '/'.repeat(emptyCount) + this.patternList[0].value;

		//-- Remove empty patterns and merge consecutive ANY_DIR basic patterns or consecutive SIMPLE_VALUE
		let simpleValueFound = true;  //-- The first pattern is a simple value
		let anyDirFound = false;

		let mustDrop;

		for (let i = 1; i < this.patternList.length; /*++i not at each loop*/) {
			mustDrop = false;
			if (this.patternList[i].patType == EMPTY_PATTERN) {
				// Ignore empty pattern so remove it from list
				mustDrop = true;
			}
			else if (this.patternList[i].patType == ANY_DIR) {
				simpleValueFound = false;
				if (!anyDirFound) {
					anyDirFound = true;
				}
				else {
					// New ANY_DIR, merge it with previous and drop it
					this.patternList[i-1].merge(this.patternList[i]);
					mustDrop = true;
				}
			}
			else if (this.patternList[i].patType == SIMPLE_VALUE) {
				anyDirFound = false;
				if (!simpleValueFound) {
					simpleValueFound = true;
				}
				else {
					// New simple value: merge it with previous and drop it
					this.patternList[i-1].value = path.join(this.patternList[i-1].value, this.patternList[i].value)
					mustDrop = true;
				}
			}
			else /* NORMAL_PATTERN */ {
				// Normal patterns cannot be optimized
				// Moreover it interrupts optimization
				// of the other types of patterns
				anyDirFound = false;
				simpleValueFound = false;
			}
			if (mustDrop) {
					//  Drop current pattern
				this.patternList.splice(i, 1);
				/* no ++i to take into account drop */
			}
			else {
				++i; //  keep current pattern
			}
		}
	}


	/**
	 * @return {boolean}
	 */
	isValid() {
		return (this.patternList !== undefined)
	}


	/**
	 * @returns {string[]} list of file paths that match pattern
	 */
	getMatchingPaths() {
		const result = []; // List of matching file paths

		// Define the depth in the pattern list to be part of the crawlDownDir closure
		let depth = 0;

		// Add the pattern list to the crawlDownDir closure
		// to avoid passing it at each recursive call
		const patternList = this.patternList;


		/**
		 * @param {number} levelBase
		 * @param {string} dirPath
		 * @param {fs.Dir} [dirBrowser]
		 */
		function crawlDownDir(levelBase, dirPath, dirBrowser) {

			let isOwningDirBrowser = false;
			const nextPathItem = patternList[depth];
			const level = (nextPathItem.patType == ANY_DIR) ? levelBase + 1 : 0;
			if ((level == 0)   // Any non ANY_DIR pattern match only one dir level, therefore next level will use next pattern
				|| ((nextPathItem.maxDepth !== undefined) && (nextPathItem.maxDepth <= level))) {
				// when we have reached the maxDepth level, next level will always be next pattern
				++depth;
			}
			else if ((level > nextPathItem.minDepth) 
				&& (nextPathItem.maxDepth === undefined) /* || (level < nextPathItem.maxDepth)*/) {
				// We have an ANY_DIR (level > 0 >= minDepth) token
				// we have reached the minimum level of the ANY_DIR (level > minDepth)
				// we have not reached the maximum level of the ANY_DIR (maxDepth === undefined) or (maxDepth > level)
				// In fact it is not usefull to check (maxDepth > level)
				// because by construction when maxDepth !== undefined we have maxDepth == minDepth
				// 
				// So we can try to stop recursing the ANY_DIR to check immediately
				// whether remaining wildcards match at this level.
				// So skip immediately at next pattern
				++depth;   //-- next pattern
				crawlDownDir(/*levelBase*/0, dirPath, ); // Test next pattern so restarting at level -1 for this new pattern
									// (which is not important as next pattern cannot be ANY_DIR type)
				//-- Stopping ANY_DIR at this level has now been tested
				//-- Now we will continue back with the ANY_DIR wildcard
				//-- with the next (first) directory level
				--depth
			}

			if (nextPathItem.patType == SIMPLE_VALUE) {
				// The current pattern is just a given path
				// it is not necessary to browse into parent directory
				// to search whether the directory name matches one of the entry
				// We just need to open the directory or the file
				// if this succeeds we get a directory browser that will help
				// to browse it to search for next pattern
				// or we have found a matching file
				const nextPath = path.join(dirPath, nextPathItem.value);
				try {
					if (depth == patternList.length) {
						//-- we are at last step so check for a file instead of a directory
						fs.accessSync(nextPath, fs.constants.R_OK);
						// The file is OK so we have found a new match to add to the result
						result.push(nextPath);
					}
					else {
						const nextDirBrowser = fs.opendirSync(nextPath);
						// The directory matches just process next pattern
						// using the browser we have just got
						crawlDownDir(/*levelBase*/0, nextPath, nextDirBrowser);
						nextDirBrowser.close();
					}
				}
				catch(err) {
					// Silently catch the error. This is just pattern not matching.
				}
				// Return back at upper pattern level to search another branch
				--depth;
			}
			else {
				// We are working on a pattern we need to browse the entries
				// of the current directory to check whether they match the pattern
				// So we need a directory browser
				if (dirBrowser === undefined) {
					// The browser has not been provided by caller (it was not a SIMPLE_VALUE)
					// Open our own directory browser
					try {
						dirBrowser = fs.opendirSync(dirPath);
						isOwningDirBrowser = true;
					}
					catch(err) {
						// This was not supposed to fail
						// Upper level had checked that the directory path
						// were existing. May be a privilege issue...
						console.log(dirPath);
						console.log(err);
						// Return back to upper level as we cannot find
						// any match in a directory we cannot open
						//===========================================
						return;   // <<<<<<<<<<<   ABORTING
						//===========================================
					}
				}
				// Browse directory for pattern match
				for(;;) {
					// Read next directory entry
					const dirEnt = dirBrowser.readSync();

					/**
					 * @return {boolean} true when dirEnt.name matches wildcard in nextPathItem
					 */
					function nameMatch() {
						return (nextPathItem.patType == ANY_DIR) || !! dirEnt.name.match(nextPathItem.patRegExp);
					}

					if (dirEnt == null) {
						// We have scanned all entries in this directory
						// Return at caller to continue searching other match
						if (level == 0) {
							--depth;
						}
						break;
					}
					if (depth == patternList.length) {
						if (dirEnt.isFile() && nameMatch()) {
							// We have found a match for the last part of the pattern.
							// The complete path matches. Add it to the result.
							result.push(path.join(dirPath, dirEnt.name));
							// Continue with next entry, it may match too
						}
					}
					else {
						if (dirEnt.isDirectory() && nameMatch()) {
							// Continue deeper below this directory to search for full pattern matches
							crawlDownDir(/*levelBase*/level, path.join(dirPath, dirEnt.name), /*no dirBrowser*/);
							// Then try next directory that matches at this level
						} 
					}
				}
				if (isOwningDirBrowser) {
					dirBrowser.close();
				}
			}
		}

		// cralDownDir will recursively fill the result
		crawlDownDir(/*levelBase*/0, /*dirPath*/'', /*no dirBrowser*/);
		return result;
	}
}

module.exports = { MiniGlob, isPlatformCaseSensitive };