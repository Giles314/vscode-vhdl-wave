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
 * This is the Posix implementation of isexe, which uses the file
 * mode and uid/gid values.
 *
 * @module
 */
const fs_1 = require("fs");

const isexeSync = (path, options = {}) => {
    const { ignoreErrors = false } = options;
    try {
        return checkStat((0, fs_1.statSync)(path), options);
    }
    catch (e) {
        const er = e;
        if (ignoreErrors || er.code === 'EACCES')
            return false;
        throw er;
    }
};


const checkStat = (stat, options) => stat.isFile() && checkMode(stat, options);
const checkMode = (stat, options) => {
    const myUid = options.uid ?? process.getuid?.();
    const myGroups = options.groups ?? process.getgroups?.() ?? [];
    const myGid = options.gid ?? process.getgid?.() ?? myGroups[0];
    if (myUid === undefined || myGid === undefined) {
        throw new Error('cannot get uid or gid');
    }
    const groups = new Set([myGid, ...myGroups]);
    const mod = stat.mode;
    const uid = stat.uid;
    const gid = stat.gid;
    const u = parseInt('100', 8);
    const g = parseInt('010', 8);
    const o = parseInt('001', 8);
    const ug = u | g;
    return !!(mod & o ||
        (mod & g && groups.has(gid)) ||
        (mod & u && uid === myUid) ||
        (mod & ug && myUid === 0));
};

module.exports = isexeSync;
