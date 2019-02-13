/* eslint-disable require-jsdoc */

'use strict';

const BrowserStack = require('browserstack');
const SauceLabs = require('saucelabs');
const {promisify} = require('util');
const yargs = require('yargs');
const webdriver = require('selenium-webdriver');

const {argv} = yargs
    .option('service', {
      choices: ['browserstack', 'sauce'],
      describe: 'Where to run the tests',
    })
    .demandOption('service')
    .option('browser', {
      describe: 'Which browser to test',
    })
    .option('list-browsers', {
      describe: 'List available browsers',
    })
    .help();

function warnForUnknownKeys(browser, knownKeys) {
  const keySet = new Set(knownKeys);
  for (const key of Object.keys(browser)) {
    if (!keySet.has(key)) {
      // eslint-disable-next-line max-len
      console.warn(`Unknown key '${key}' in browser description: ${JSON.stringify(browser, null, '  ')}`);
      break;
    }
  }
}

function getBrowserStackCapabilities(browser) {
  warnForUnknownKeys(browser, [
    'browser',
    'browser_version',
    'os',
    'os_version',
    'device',
    'real_mobile',
  ]);

  const caps = new webdriver.Capabilities();
  caps.setBrowserName(browser.browser);
  caps.setBrowserVersion(browser.browser_version);
  // https://www.browserstack.com/automate/capabilities#capabilities-browserstack
  caps.set('os', browser.os);
  caps.set('os_version', browser.os_version);
  // https://www.browserstack.com/automate/capabilities#mobile-capabilities
  caps.set('device', browser.device);
  caps.set('realMobile', browser.real_mobile);
  return new webdriver.Capabilities(caps);
}

async function getBrowserStackDriver(browser, auth) {
  const capabilities = getBrowserStackCapabilities(browser);
  console.log('Requested capabilities:');
  console.log(capabilities);
  const driver = await new webdriver.Builder()
      .withCapabilities(capabilities)
      .usingServer(`https://${auth.user}:${auth.key}@hub-cloud.browserstack.com:443/wd/hub`)
      .build();
  return driver;
}

function getSauceCapabilities(browser) {
  warnForUnknownKeys(browser, [
    'api_name',
    'long_name', // ignored
    'short_version', // ignored
    'long_version',
    'latest_stable_version', // ignored
    'device',
    'os',
    'automation_backend',
  ]);

  const caps = new webdriver.Capabilities();
  // https://wiki.saucelabs.com/display/DOCS/Selenium+W3C+Capabilities+Support+-+Beta
  caps.setBrowserName(browser.api_name);
  caps.setBrowserVersion(browser.long_version);
  caps.set('version', browser.long_version);
  caps.setPlatform(browser.os);
  caps.set('platform', browser.os);
  caps.set('device', browser.device);
  return caps;
}

async function getSauceDriver(browser, auth) {
  const capabilities = getSauceCapabilities(browser);
  console.log('Requested capabilities:');
  console.log(capabilities);
  const driver = await new webdriver.Builder()
      .withCapabilities(capabilities)
      .usingServer(`https://${auth.user}:${auth.key}@ondemand.saucelabs.com:443/wd/hub`)
      .build();
  return driver;
}

function getUniquePropertyValues(objects, key) {
  const values = Array.from(new Set(objects.map((o) => o[key])));
  values.sort();
  return values;
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
    const auth = secrets.browserstack;
    const client = BrowserStack.createAutomateClient({
      username: auth.user,
      password: auth.key,
    });

    const browsers = await promisify(client.getBrowsers).call(client);

    if (argv.listBrowsers) {
      const names = new Set(browsers.map((b) => b.browser));
      for (const name of names) {
        console.log(name);
      }
      return;
    }

    if (!argv.browser) {
      console.error(`No browser chosen, see --list-browsers and --browser`);
      process.exit(1);
    }

    // TODO: https://github.com/scottgonzalez/node-browserstack/issues/58
    const browser = browsers.find((b) => b.browser === argv.browser);
    if (browser) {
      console.log('Selected browser:');
      console.log(browser);
    } else {
      console.error(`No browser found, try --list-browsers`);
      process.exit(1);
    }

    driver = await getBrowserStackDriver(browser, auth);
  } else if (argv.service = 'sauce') {
    const auth = secrets.sauce;
    const client = new SauceLabs({
      username: auth.user,
      password: auth.key,
    });

    const browsers = await promisify(client.getAllBrowsers).call(client);

    if (argv.listBrowsers) {
      const names = getUniquePropertyValues(browsers, 'api_name');
      for (const name of names) {
        console.log(name);
      }
      return;
    }

    if (!argv.browser) {
      console.error(`No browser chosen, see --list-browsers and --browser`);
      process.exit(1);
    }

    // TODO: pick the latest browser
    const browser = browsers.find((b) => b.api_name === argv.browser);
    if (browser) {
      console.log('Selected browser:');
      console.log(browser);
    } else {
      console.error(`No browser found, try --list-browsers`);
      process.exit(1);
    }

    driver = await getSauceDriver(browser, auth);
  }

  try {
    const capabilities = await driver.getCapabilities();
    console.log('Actual capabilities:');
    console.log(capabilities);
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
