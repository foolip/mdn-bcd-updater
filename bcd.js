/* eslint-disable require-jsdoc */

'use strict';

function main(bcdPath) {
  const bcd = require(bcdPath);

  const {api} = bcd;

  for (const [name, members] of Object.entries(api)) {
    for (const memberName in members) {
      if (memberName.startsWith('__') || memberName.endsWith('_support')) {
        continue;
      }
      console.log(`${name}.${memberName}`);
    }
  }
}

main(process.argv[2]);
