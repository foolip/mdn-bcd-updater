/* eslint-disable require-jsdoc */

'use strict';

const fs = require('fs-extra');

const CSS_DIR = `${__dirname}/reffy-reports/whatwg/css`;
const OUT_DIR = `${__dirname}/out`;

async function buildCSS() {
  // Map of property names to their source or sources.
  const properties = new Map;

  const cssFiles = await fs.readdir(CSS_DIR);
  cssFiles.sort();
  for (const file of cssFiles) {
    if (!file.endsWith('.json')) {
      continue;
    }

    const data = await fs.readJson(`${CSS_DIR}/${file}`);

    if (!data.properties) {
      // TODO: at-rules, selectors, types
      continue;
    }

    for (const name of Object.keys(data.properties)) {
      if (!properties.has(name)) {
        properties.set(name, [data.spec]);
      } else {
        properties.get(name).push(data.spec);
      }
    }
  }

  const PROPERTIES_DIR = `${OUT_DIR}/css/properties`;
  await fs.ensureDir(PROPERTIES_DIR);

  for (const property of properties.keys()) {
    const filename = `${PROPERTIES_DIR}/${property}.html`;
    const content = `<!doctype html>
<style>
@supports(${property}: initial) {
  body { background: green; }
}
@supports not (${property}: initial) {
  body { background: red; }
}
</style>
`;
    await fs.writeFile(filename, content);
    console.log(`Wrote ${filename}`);
  }
}

async function build() {
  await buildCSS();
}

build();
