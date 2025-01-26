//--
// Copyright (c) 2025 Philippe Chevrier
// 
// Adapted from node.js source code
// Copyright Node.js contributors
//
// Released under MIT licence
// see https://opensource.org/license/mit

"use strict";
/**
 * This is the Windows implementation of isexe, which uses the file
 * extension and PATHEXT setting.
 *
 * @module
 */
const fs_1 = require("fs");

const isexeSync = (path, options = {}) => {
    const { ignoreErrors = false } = options;
    try {
        return checkStat((0, fs_1.statSync)(path), path, options);
    }
    catch (e) {
        const er = e;
        if (ignoreErrors || er.code === 'EACCES')
            return false;
        throw er;
    }
};


const checkPathExt = (path, options) => {
    const { pathExt = process.env.PATHEXT || '' } = options;
    const peSplit = pathExt.split(';');
    if (peSplit.indexOf('') !== -1) {
        return true;
    }
    for (let i = 0; i < peSplit.length; i++) {
        const p = peSplit[i].toLowerCase();
        const ext = path.substring(path.length - p.length).toLowerCase();
        if (p && ext === p) {
            return true;
        }
    }
    return false;
};
const checkStat = (stat, path, options) => stat.isFile() && checkPathExt(path, options);

module.exports = isexeSync;
