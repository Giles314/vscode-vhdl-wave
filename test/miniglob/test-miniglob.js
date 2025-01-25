const { MiniGlob, isPlatformCaseSensitive } = require('../../src/util/miniglob');
const path         = require('path');
const os           = require('os');
const { describe, it } = require("node:test");
const { strictEqual } = require("node:assert");


console.log('started');
const baseDirPath = path.dirname(process.argv[1]);

function pathOf(relativePath) {
	let result = path.join(baseDirPath, relativePath);
	if (! isPlatformCaseSensitive) {
		result = result.toUpperCase();
	}
	return result;
}


if (isPlatformCaseSensitive) {
	describe('miniglob-CaseSensitive', () => {

		it('Includes dirL1-1/fileL1-1-1.xxx without wildcard.', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, 'dirL1-1/fileL1-1-1.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 1);
			strictEqual(fileList[0], pathOf('dirL1-1/fileL1-1-1.xxx'));
		});

		it('Includes dirL1-1/fileL1-1-?.xxx with ? wildcard in filename.', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, 'dirL1-1/fileL1-1-?.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 2);
			strictEqual(fileList[0], pathOf('dirL1-1/fileL1-1-1.xxx'));
			strictEqual(fileList[1], pathOf('dirL1-1/fileL1-1-2.xxx'));
		});

		it('Includes dirL1-?/fileL1-1-1.xxx with ? wildcard in dir name.', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, 'dirL1-?/fileL1-1-1.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 2);
			strictEqual(fileList[0], pathOf('dirL1-1/fileL1-1-1.xxx'));
			strictEqual(fileList[1], pathOf('dirL1-2/fileL1-1-1.xxx'));
		});

		it('Includes dirL1-?/fileL1-1-2.xxx with ? wildcard in dir name, with maching directory without matching file.', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, 'dirL1-?/fileL1-1-2.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 1);
			strictEqual(fileList[0], pathOf('dirL1-1/fileL1-1-2.xxx'));
		});

		it('Includes dirL*/fileL1-1-1.xxx with * wildcard in dir name.', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, 'dirL*/fileL1-1-1.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 2);
			strictEqual(fileList[0], pathOf('dirL1-1/fileL1-1-1.xxx'));
			strictEqual(fileList[1], pathOf('dirL1-2/fileL1-1-1.xxx'));
		});

		it('Includes dirL1-1/fil*.xxx with * wildcard in file name.', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, 'dirL1-1/fil*.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 3);
			strictEqual(fileList[0], pathOf('dirL1-1/fileL1-1-1.xxx'));
			strictEqual(fileList[1], pathOf('dirL1-1/fileL1-1-2.xxx'));
			strictEqual(fileList[2], pathOf('dirL1-1/fileL1-1-2a.xxx'));
		});

		it('Includes dirL1-2/*/*.xxx with * wildcard (and * wildcard inside file name).', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, 'dirL1-2/*/*.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 3);
			strictEqual(fileList[0], pathOf('dirL1-2/dirL2-1/fileL2-1-1.xxx'));
			strictEqual(fileList[1], pathOf('dirL1-2/dirL2-1+/fileL2-1-1.xxx'));
			strictEqual(fileList[2], pathOf('dirL1-2/dirL2-2/fileL2-2-1.xxx'));
		});

		it('Includes ./**/*1.xxx with ** wildcard (and * wildcard inside file name)', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, './**/*1.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 6);
			strictEqual(fileList[0], pathOf('./x1.xxx'));
			strictEqual(fileList[1], pathOf('dirL1-1/fileL1-1-1.xxx'));
			strictEqual(fileList[2], pathOf('dirL1-2/fileL1-1-1.xxx'));
			strictEqual(fileList[3], pathOf('dirL1-2/dirL2-1/fileL2-1-1.xxx'));
			strictEqual(fileList[4], pathOf('dirL1-2/dirL2-1+/fileL2-1-1.xxx'));
			strictEqual(fileList[5], pathOf('dirL1-2/dirL2-2/fileL2-2-1.xxx'));
		});

		it('Includes ./*/**/*1.xxx with */** wildcard (and * wildcard inside file name)', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, './*/**/*1.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 5);
			strictEqual(fileList[0], pathOf('dirL1-1/fileL1-1-1.xxx'));
			strictEqual(fileList[1], pathOf('dirL1-2/fileL1-1-1.xxx'));
			strictEqual(fileList[2], pathOf('dirL1-2/dirL2-1/fileL2-1-1.xxx'));
			strictEqual(fileList[3], pathOf('dirL1-2/dirL2-1+/fileL2-1-1.xxx'));
			strictEqual(fileList[4], pathOf('dirL1-2/dirL2-2/fileL2-2-1.xxx'));
		});

		it('Includes ./**/*/*1.xxx with **/* wildcard (and * wildcard inside file name)', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, './**/*/*1.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 5);
			strictEqual(fileList[0], pathOf('dirL1-1/fileL1-1-1.xxx'));
			strictEqual(fileList[1], pathOf('dirL1-2/fileL1-1-1.xxx'));
			strictEqual(fileList[2], pathOf('dirL1-2/dirL2-1/fileL2-1-1.xxx'));
			strictEqual(fileList[3], pathOf('dirL1-2/dirL2-1+/fileL2-1-1.xxx'));
			strictEqual(fileList[4], pathOf('dirL1-2/dirL2-2/fileL2-2-1.xxx'));
		});

		it('Includes ./**/dirL<1-2|2-1>/*.xxx with <> wildcard in directory', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, './**/dirL<1-2|2-1>/*.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 2);
			strictEqual(fileList[0], pathOf('dirL1-2/fileL1-1-1.xxx'));
			strictEqual(fileList[1], pathOf('dirL1-2/dirL2-1/fileL2-1-1.xxx'));
		});

		it('Includes ./dirL1-<23>/fileL1-1-1.xxx with <> no | wildcard in directory', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, './dirL1-<23>/fileL1-1-1.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 2);
			strictEqual(fileList[0], pathOf('dirL1-2/fileL1-1-1.xxx'));
			strictEqual(fileList[1], pathOf('dirL1-3/fileL1-1-1.xxx'));
		});

		it('Includes ./**/fileL*<1-2.|2-1>*xxx with <> wildcard in file including dot', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, './**/fileL*<1-2.|2-1>*xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 4);
			strictEqual(fileList[0], pathOf('dirL1-1/fileL1-1-2.xxx'));
			strictEqual(fileList[1], pathOf('dirL1-2/dirL2-1/fileL2-1-1.xxx'));
			strictEqual(fileList[2], pathOf('dirL1-2/dirL2-1+/fileL2-1-1.xxx'));
			strictEqual(fileList[3], pathOf('dirL1-2/dirL2-2/fileL2-2-1.xxx'));
		});

	})
}


else {
	describe('miniglob-CaseInsensitive', () => {

		it('Includes dirl1-1/fileL1-1-1.xxx without wildcard. Wrong upcase in dir name', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, 'dirl1-1/fileL1-1-1.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 1);
			strictEqual(fileList[0].toUpperCase(), pathOf('dirL1-1/fileL1-1-1.xxx'));
		});

		it('Includes DirL1-1/fileL1-1-?.xxx with ? wildcard in filename. Wrong upcase in filename', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, 'Dirl1-1/Filel1-1-?.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 2);
			strictEqual(fileList[0].toUpperCase(), pathOf('dirL1-1/fileL1-1-1.xxx'));
			strictEqual(fileList[1].toUpperCase(), pathOf('dirL1-1/fileL1-1-2.xxx'));
		});

		it('Includes DIRl1-?/FILEl1-1-1.xxx with ? wildcard in dir name. Inverted case in dir and filename', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, 'DIRl1-?/FILEl1-1-1.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 2);
			strictEqual(fileList[0].toUpperCase(), pathOf('dirL1-1/fileL1-1-1.xxx'));
			strictEqual(fileList[1].toUpperCase(), pathOf('dirL1-2/fileL1-1-1.xxx'));
		});

		it('Includes dirL1-?/fileL1-1-2.XXX with ? wildcard in dir name, with maching directory without matching file. wrong upcase on extension', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, 'dirL1-?/fileL1-1-2.XXX'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 1);
			strictEqual(fileList[0].toUpperCase(), pathOf('dirL1-1/fileL1-1-2.xxx'));
		});

		it('Includes DIRl*/fileL1-1-1.xxx with * wildcard in dir name. Inverted case in dir name', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, 'DIRl*/fileL1-1-1.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 2);
			strictEqual(fileList[0].toUpperCase(), pathOf('dirL1-1/fileL1-1-1.xxx'));
			strictEqual(fileList[1].toUpperCase(), pathOf('dirL1-2/fileL1-1-1.xxx'));
		});

		it('Includes dirL1-1/fil*.xxx with * wildcard in file name. Wrong upcase extension', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, 'dirL1-1/fil*.XXX'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 3);
			strictEqual(fileList[0].toUpperCase(), pathOf('dirL1-1/fileL1-1-1.xxx'));
			strictEqual(fileList[1].toUpperCase(), pathOf('dirL1-1/fileL1-1-2.xxx'));
			strictEqual(fileList[2].toUpperCase(), pathOf('dirL1-1/fileL1-1-2a.xxx'));
		});

		it('Includes dirL1-2/*/*.Xxx with * wildcard (and * wildcard inside file name). Wrong case after *', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, 'dirL1-2/*/*.Xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 3);
			strictEqual(fileList[0].toUpperCase(), pathOf('dirL1-2/dirL2-1/fileL2-1-1.xxx'));
			strictEqual(fileList[1].toUpperCase(), pathOf('dirL1-2/dirL2-1+/fileL2-1-1.xxx'));
			strictEqual(fileList[2].toUpperCase(), pathOf('dirL1-2/dirL2-2/fileL2-2-1.xxx'));
		});

		it('Includes ./**/*1.xxx with ** wildcard (and * wildcard inside file name) wrong case in filename', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, './**/*1.xXX'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 6);
			strictEqual(fileList[0].toUpperCase(), pathOf('./x1.xxx'));
			strictEqual(fileList[1].toUpperCase(), pathOf('dirL1-1/fileL1-1-1.xxx'));
			strictEqual(fileList[2].toUpperCase(), pathOf('dirL1-2/fileL1-1-1.xxx'));
			strictEqual(fileList[3].toUpperCase(), pathOf('dirL1-2/dirL2-1/fileL2-1-1.xxx'));
			strictEqual(fileList[4].toUpperCase(), pathOf('dirL1-2/dirL2-1+/fileL2-1-1.xxx'));
			strictEqual(fileList[5].toUpperCase(), pathOf('dirL1-2/dirL2-2/fileL2-2-1.xxx'));
		});

		it('Includes ./*/**/*1.xxx with */** wildcard (and * wildcard inside file name)', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, './*/**/*1.XXX'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 5);
			strictEqual(fileList[0].toUpperCase(), pathOf('dirL1-1/fileL1-1-1.xxx'));
			strictEqual(fileList[1].toUpperCase(), pathOf('dirL1-2/fileL1-1-1.xxx'));
			strictEqual(fileList[2].toUpperCase(), pathOf('dirL1-2/dirL2-1/fileL2-1-1.xxx'));
			strictEqual(fileList[3].toUpperCase(), pathOf('dirL1-2/dirL2-1+/fileL2-1-1.xxx'));
			strictEqual(fileList[4].toUpperCase(), pathOf('dirL1-2/dirL2-2/fileL2-2-1.xxx'));
		});

		it('Includes ./**/*/F*1.xxx with **/* wildcard (and * wildcard inside file name)', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, './**/*/F*1.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 5);
			strictEqual(fileList[0].toUpperCase(), pathOf('dirL1-1/fileL1-1-1.xxx'));
			strictEqual(fileList[1].toUpperCase(), pathOf('dirL1-2/fileL1-1-1.xxx'));
			strictEqual(fileList[2].toUpperCase(), pathOf('dirL1-2/dirL2-1/fileL2-1-1.xxx'));
			strictEqual(fileList[3].toUpperCase(), pathOf('dirL1-2/dirL2-1+/fileL2-1-1.xxx'));
			strictEqual(fileList[4].toUpperCase(), pathOf('dirL1-2/dirL2-2/fileL2-2-1.xxx'));
		});

		it('Includes ./**/dirL<1-2|2-1>/*.xxx with <> wildcard in directory. with wrong case in and out alternative', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, './**/Dir<l1-2|l2-1>/*.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 2);
			strictEqual(fileList[0].toUpperCase(), pathOf('dirL1-2/fileL1-1-1.xxx'));
			strictEqual(fileList[1].toUpperCase(), pathOf('dirL1-2/dirL2-1/fileL2-1-1.xxx'));
		});

		it('Includes ./dirL1-<23>/fileL1-1-1.xxx with <> no | wildcard in directory with wrong case in dir', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, './DIRL1-<23>/fileL1-1-1.xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 2);
			strictEqual(fileList[0].toUpperCase(), pathOf('dirL1-2/fileL1-1-1.xxx'));
			strictEqual(fileList[1].toUpperCase(), pathOf('dirL1-3/fileL1-1-1.xxx'));
		});

		it('Includes ./**/fileL*<1-2.|2-1>*xxx with <> wildcard in file including dot. with wrong case in and out alternative', () => {
			const myGlob = new MiniGlob(path.join(baseDirPath, './**/FIle*<1-2.|l2-1>*xxx'));
			const fileList = myGlob.getMatchingPaths();
			strictEqual(fileList.length, 3);
			strictEqual(fileList[0].toUpperCase(), pathOf('dirL1-1/fileL1-1-2.xxx'));
			strictEqual(fileList[1].toUpperCase(), pathOf('dirL1-2/dirL2-1/fileL2-1-1.xxx'));
			strictEqual(fileList[2].toUpperCase(), pathOf('dirL1-2/dirL2-1+/fileL2-1-1.xxx'));
		});

	})
}

describe('miniglob-unmatches', () => {

	it('Includes ./**/unmatched* with wildcard matching no file', () => {
		const myGlob = new MiniGlob(path.join(baseDirPath, './**/fileL*<1-2.|2-1>*xxx'));
		const fileList = myGlob.getMatchingPaths();
		strictEqual(fileList.length, 0);
	});

});
