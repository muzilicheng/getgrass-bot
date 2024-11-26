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
  try {
    displayHeader();
    console.log(`Please wait...\n`.yellow);
    await delay(1000);

    const config = new Config();
    const bot = new Bot(config);

    // 选择代理源
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

    // 读取用户ID
    const userIDs = await readLines('uid.txt');
    if (userIDs.length === 0) {
      console.error('No user IDs found in uid.txt. Exiting...'.red);
      return;
    }
    console.log(`Loaded ${userIDs.length} user IDs\n`.green);

    // 为每个用户ID处理连接
    for (const userID of userIDs) {
      const numProxiesToUse = Math.min(20, proxies.length);
      const proxiesToUse = proxies.splice(0, numProxiesToUse); // 使用splice确保代理被移除

      const promisesForUserID = proxiesToUse.map((proxy) => bot.connectToProxy(proxy, userID));

      // 如果没有使用代理（直接连接模式），则添加直接连接的promise
      if (numProxiesToUse === 0) {
        promisesForUserID.push(bot.connectDirectly(userID));
      }

      // 等待所有promise解决
      await Promise.all(promisesForUserID);
    }

    console.log('All user IDs have been processed.'.green);
  } catch (error) {
    console.error(error.message || error);
  }
}

main();
