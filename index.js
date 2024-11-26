require('colors');
const inquirer = require('inquirer');
const Bot = require('./src/Bot');
const Config = require('./src/Config');
const {
  fetchProxies,
  readLines,
  selectProxySource,
} = require('./src/ProxyManager');
const { delay, displayHeader } = require('./src/utils');

async function main() {
  displayHeader();
  console.log(`Please wait...\n`.yellow);
  await delay(1000);

  const config = new Config();
  const bot = new Bot(config);
  const proxySource = await selectProxySource(inquirer);
  let proxies = [];

  if (proxySource.type === 'file') {
    proxies = await readLines(proxySource.source);
  } else if (proxySource.type === 'url') {
    proxies = await fetchProxies(proxySource.source);
  } else if (proxySource.type === 'none') {
    console.log('No proxy selected. Connecting directly.'.cyan);
  }

  if (proxySource.type !== 'none' && proxies.length === 0) {
    console.error('No proxies found. Exiting...'.red);
    return;
  }

  console.log(
    proxySource.type !== 'none'
      ? `Loaded ${proxies.length} proxies`.green
      : 'Direct connection mode enabled.'.green
  );

  const userIDs = await readLines('uid.txt');
  if (userIDs.length === 0) {
    console.error('No user IDs found in uid.txt. Exiting...'.red);
    return;
  }

  console.log(`Loaded ${userIDs.length} user IDs\n`.green);

  // Create an array of promises for each userID
  const connectionPromises = userIDs.map((userID) => {
    // Determine the number of proxies to use for this userID
    const numProxiesToUse = Math.min(20, proxies.length);
    // Take the first numProxiesToUse proxies from the array
    const proxiesToUse = proxies.slice(0, numProxiesToUse);
    // Update the proxies array to remove the used proxies
    proxies = proxies.slice(numProxiesToUse);

    // Create an array of promises for connecting to each proxy
    const promisesForUserID = proxiesToUse.map((proxy) => bot.connectToProxy(proxy, userID));

    // If no proxies were used (direct connection mode), add a promise for direct connection
    if (numProxiesToUse === 0) {
      promisesForUserID.push(bot.connectDirectly(userID));
    }

    // Return the array of promises for this userID
    return Promise.all(promisesForUserID);
  });

  // Wait for all promises to resolve
  await Promise.all(connectionPromises);
}

main().catch(console.error);
