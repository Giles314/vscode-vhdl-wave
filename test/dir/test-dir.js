

const { getWaveFilename } = require('../../src/dir');

const path         = require('path');
const { describe, it } = require("node:test");
const { strictEqual } = require("node:assert");


console.log('started');
const baseDirPath = path.dirname(process.argv[1]);


describe('test-default', () => {

	it('Empty setting: should return = buildPath + unitName + .ghw', () => {
		const result = getWaveFilename('', baseDirPath, "\\ignored", 'name1');
		strictEqual(result, path.join(baseDirPath, 'name1.ghw'));
	});

	it('Undefined setting: should return = buildPath + unitName + .ghw', () => {
		const result = getWaveFilename(undefined, baseDirPath, "\\ignored", 'name5');
		strictEqual(result, path.join(baseDirPath, 'name5.ghw'));
	});

	it('Valid absolute dir in setting: result = settingPath + unitName .ghw', () => {
		const result = getWaveFilename(baseDirPath, baseDirPath + '\\wrong', "\\ignored", 'name2');
		strictEqual(result, path.join(baseDirPath, 'name2.ghw'));
	});

	it('Valid relative dir in setting: result = Workspace + settingPath + unitName + .ghw', () => {
		const result = getWaveFilename('subDir', baseDirPath + '\\wrong', baseDirPath, 'name3');
		strictEqual(result, path.join(baseDirPath, 'subDir', 'name3.ghw'));
	});

	it('Invalid absolute dir in setting: exception', () => {
		try {
			const result = getWaveFilename('/invalid/directory/for Sure/', baseDirPath, baseDirPath, 'name4');
			strictEqual(0, 1);
		}
		catch (err) {
			strictEqual(err, "Wave file directory '/invalid/directory/for Sure/' is not a valid directory");
		}
	});


})
