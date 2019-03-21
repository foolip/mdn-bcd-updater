/* eslint-disable require-jsdoc */

'use strict';

const fs = require('fs-extra');
const stringify = require('json-stable-stringify');
const WebIDL2 = require('webidl2');

async function main(paths) {
  if (!paths.length) {
    // Default to reading all IDL files from reffy-reports
    const IDL_DIR = `${__dirname}/node_modules/reffy-reports/whatwg/idl`;
    const idlFiles = await fs.readdir(IDL_DIR);
    idlFiles.sort();
    paths = idlFiles
        .filter(file => file.endsWith('.idl'))
        .map(file => `${IDL_DIR}/${file}`);
  }

  let ast = [];

  for (const path of paths) {
    const idl = await fs.readFile(path, 'utf8');
    ast.push(...WebIDL2.parse(idl));
  }
  // console.log(WebIDL2.write(ast));

  // merge partials (O^2 but still fast)
  ast = ast.filter((dfn) => {
    if (!dfn.partial) {
      return true;
    }

    const target = ast.find((it) => !it.partial &&
                                    it.type === dfn.type &&
                                    it.name === dfn.name);
    if (!target) {
      // eslint-disable-next-line max-len
      throw new Error(`Original definition not found for partial ${dfn.type} ${dfn.name}`);
    }

    // move members to target interface/dictionary/etc. and drop partial
    target.members.push(...dfn.members);
    return false;
  });

  // https://github.com/mdn/browser-compat-data/issues/472#issuecomment-473335570
  const interfaceData = {};
  for (const dfn of ast) {
    if (dfn.type !== 'interface') {
      continue;
    }
    if (dfn.name in interfaceData) {
      throw new Error(`Duplicate definition of interface ${dfn.name}`);
    }
    const data = {};
    if (dfn.inheritance) {
      data.inherits = dfn.inheritance.name;
    }
    interfaceData[dfn.name] = data;
  }

  // mix in the mixins
  for (const dfn of ast) {
    if (dfn.type === 'includes') {
      const mixin = ast.find((it) => !it.partial &&
                                     it.type === 'interface mixin' &&
                                     it.name === dfn.includes);
      if (!mixin) {
        // eslint-disable-next-line max-len
        throw new Error(`Interface mixin ${dfn.includes} not found for target ${dfn.target}`);
      }
      const target = ast.find((it) => !it.partial &&
                                      it.type === 'interface' &&
                                      it.name === dfn.target);
      if (!target) {
        // eslint-disable-next-line max-len
        throw new Error(`Target ${dfn.target} not found for interface mixin ${dfn.includes}`);
      }

      if (interfaceData[target.name].includes) {
        interfaceData[target.name].includes.push(mixin.name);
        interfaceData[target.name].includes.sort();
      } else {
        interfaceData[target.name].includes = [mixin.name];
      }

      // move members to target interface
      target.members.push(...mixin.members);
    }
  }

  // drop includes and mixins
  ast = ast.filter((dfn) => dfn.type !== 'includes' &&
                            dfn.type !== 'interface mixin');
  // console.log(WebIDL2.write(ast));

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
          // console.log(member);
          // TODO: iterable<>, maplike<>, setlike<> declarations
          continue;
        }

        //console.log(`${dfn.name}.${name}`);
      }
    }
  }

  console.log(stringify(interfaceData, {space: '  '}));
}

main(process.argv.slice(2));
