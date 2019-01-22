'use strict';

const util = require('util');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);

const WebIDL2 = require("webidl2");

function verify(idl) {
    try {
        WebIDL2.parse(idl);
    } catch (e) {
        console.error(e);
        return false;
    }
    return true;
}

function verify(idl) {
    try {
        WebIDL2.parse(idl);
    } catch (e) {
        console.error(e);
        return false;
    }
    return true;
}

async function main(path) {
    const idl = await readFile(path, 'utf8');
    let ast = WebIDL2.parse(idl);
    //console.log(tree);
    //console.log(WebIDL2.write(tree));

    // merge partials (O^2 but still fast)
    ast = ast.filter(dfn => {
        if (!dfn.partial) {
            return true;
        }

        const target = ast.find(it => !it.partial && it.type === dfn.type && it.name === dfn.name);
        if (!target) {
            throw new Error(`Original definition not found for partial ${dfn.type} ${dfn.name}`);
        }

        // move members to target interface/dictionary/etc. and drop partial
        target.members.push(...dfn.members);
        return false;
    });

    // mix in the mixins
    for (const dfn of ast) {
        if (dfn.type === 'includes') {
            const mixin = ast.find(it => !it.partial && it.type === 'interface mixin' && it.name === dfn.includes);
            if (!mixin) {
                throw new Error(`Interface mixin ${dfn.includes} not found for target ${dfn.target}`);
            }
            const target = ast.find(it => !it.partial && it.type === 'interface' && it.name === dfn.target);
            if (!target) {
                throw new Error(`Target ${dfn.target} not found for interface mixin ${dfn.includes}`);
            }

            // move members to target interface
            target.members.push(...mixin.members);
        }
    }

    // drop includes and mixins
    ast = ast.filter(dfn => dfn.type !== 'includes' && dfn.type !== 'interface mixin');
    //console.log(WebIDL2.write(ast));

    for (const dfn of ast) {
        if (dfn.members) {
            // dictionaries don't have interface objects or similar
            if (dfn.type === 'dictionary') {
                continue;
            }

            for (const member of dfn.members) {
                let name = member.name;
                if (member.type === 'operation') {
                    if (member.body && member.body.name) {
                        name = member.body.name.value;
                    }
                }
                if (!name) {
                    //console.log(member);
                    // TODO: iterable<>, maplike<>, setlike<> declarations
                    continue;
                }

                let onPrototype = false;
                if (dfn.type === 'interface' || dfn.type === 'callback interface') {
                    onPrototype = true;
                    if (member.type === 'operation') {
                        if (member.special && member.special.value === 'static') {
                            onPrototype = false;
                        }
                    } else if (member.type === 'const') {
                        onPrototype = false;
                    }
                }
                console.log(`${dfn.name}.${name}`);
            }
        }
    }
}

main(process.argv[2]);
