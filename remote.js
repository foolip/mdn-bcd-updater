/* eslint-disable require-jsdoc */

'use strict';

const webdriver = require('selenium-webdriver');

const {argv} = require('yargs')
    .option('service', {
      choices: ['browserstack', 'sauce'],
      describe: 'Where to run the tests',
    })
    .demandOption('service')
    .help();

async function getBrowserStackDriver(capabilities, auth) {
  const driver = await new webdriver.Builder()
      .withCapabilities(capabilities)
      .usingServer(`https://${auth.user}:${auth.key}@hub-cloud.browserstack.com:443/wd/hub`)
      .build();
  return driver;
}

async function getSauceDriver(capabilities, auth) {
  const driver = await new webdriver.Builder()
      .withCapabilities(capabilities)
      .usingServer(`https://${auth.user}:${auth.key}@ondemand.saucelabs.com:443/wd/hub`)
      .build();
  return driver;
}

async function main() {
  let secrets;
  try {
    secrets = require('./secrets.json');
  } catch (e) {
    // eslint-disable-next-line max-len
    console.error('secrets.json not found, please copy and edit secrets.sample.json');
    process.exit(1);
  }

  let driver;
  if (argv.service === 'browserstack') {
    // TODO: consult https://api.browserstack.com/automate/browsers.json
    const capabilities = {
      browserName: 'internet explorer',
      version: '8',
    };
    driver = await getBrowserStackDriver(capabilities, secrets.browserstack);
  } else if (argv.service = 'sauce') {
    // TODO: consult https://saucelabs.com/rest/v1/info/platforms/webdriver
    const capabilities = {
      browserName: 'internet explorer',
      version: '9',
    };
    driver = await getSauceDriver(capabilities, secrets.sauce);
  }

  try {
    await driver.get('https://example.com/');
    const title = await driver.getTitle();
    console.log(title);
    const userAgent = await driver.executeScript('return navigator.userAgent');
    console.log(userAgent);
  } finally {
    await driver.quit();
  }
}

main();
