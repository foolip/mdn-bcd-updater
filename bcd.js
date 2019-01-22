'use strict';

const util = require('util');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);

async function main(paths) {
    const apis = {};
    for (const path of paths) {
        const json = await readFile(path, 'utf8');
        const api = JSON.parse(json).api;
        Object.assign(apis, api)
    };

    for (const name in apis) {
        const members = apis[name];
        for (const memberName in members) {
            if (memberName.startsWith('__') || memberName.endsWith('_support')) {
                continue;
            }
            console.log(`${name}.${memberName}`);
        }
    }
}

main(process.argv.slice(2));
