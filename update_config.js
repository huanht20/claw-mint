import { readFile, writeFile } from 'fs/promises';

const CONFIG_FILE = './config.js';

/**
 * Đọc file config.js và trả về nội dung
 */
async function readConfigFile() {
  try {
    const content = await readFile(CONFIG_FILE, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Không thể đọc file config.js: ${error.message}`);
  }
}

/**
 * Ghi nội dung vào file config.js
 */
async function writeConfigFile(content) {
  try {
    await writeFile(CONFIG_FILE, content, 'utf-8');
  } catch (error) {
    throw new Error(`Không thể ghi file config.js: ${error.message}`);
  }
}

/**
 * Update PROXY_LIST trong config.js
 * @param {string[]} proxyList - Mảng các proxy URL
 */
export async function updateProxyList(proxyList) {
  if (!Array.isArray(proxyList)) {
    throw new Error('proxyList phải là một mảng');
  }

  let content = await readConfigFile();
  
  // Tìm và thay thế PROXY_LIST
  const proxyListString = proxyList.map(proxy => `    '${proxy}'`).join(',\n');
  const proxyListRegex = /export const PROXY_LIST = \[[\s\S]*?\];/;
  
  if (proxyListRegex.test(content)) {
    content = content.replace(
      proxyListRegex,
      `export const PROXY_LIST = [\n${proxyListString}\n];`
    );
  } else {
    throw new Error('Không tìm thấy PROXY_LIST trong config.js');
  }

  await writeConfigFile(content);
  console.log(`✅ Đã update PROXY_LIST với ${proxyList.length} proxy`);
}

/**
 * Update USE_PROXY_FROM_CONFIG trong config.js
 * @param {boolean} value - Giá trị true/false
 */
export async function updateUseProxyFromConfig(value) {
  if (typeof value !== 'boolean') {
    throw new Error('value phải là boolean');
  }

  let content = await readConfigFile();
  
  const regex = /export const USE_PROXY_FROM_CONFIG = (true|false);/;
  if (regex.test(content)) {
    content = content.replace(
      regex,
      `export const USE_PROXY_FROM_CONFIG = ${value};`
    );
  } else {
    throw new Error('Không tìm thấy USE_PROXY_FROM_CONFIG trong config.js');
  }

  await writeConfigFile(content);
  console.log(`✅ Đã update USE_PROXY_FROM_CONFIG = ${value}`);
}

/**
 * Update OPENAI_API_KEY trong config.js
 * @param {string} apiKey - OpenAI API key
 */
export async function updateOpenAIApiKey(apiKey) {
  if (typeof apiKey !== 'string') {
    throw new Error('apiKey phải là string');
  }

  let content = await readConfigFile();
  
  // Escape single quotes trong API key
  const escapedApiKey = apiKey.replace(/'/g, "\\'");
  
  const regex = /export const OPENAI_API_KEY = '[^']*';/;
  if (regex.test(content)) {
    content = content.replace(
      regex,
      `export const OPENAI_API_KEY = '${escapedApiKey}';`
    );
  } else {
    throw new Error('Không tìm thấy OPENAI_API_KEY trong config.js');
  }

  await writeConfigFile(content);
  console.log(`✅ Đã update OPENAI_API_KEY`);
}

/**
 * Update USE_AI trong config.js
 * @param {boolean} value - Giá trị true/false
 */
export async function updateUseAI(value) {
  if (typeof value !== 'boolean') {
    throw new Error('value phải là boolean');
  }

  let content = await readConfigFile();
  
  const regex = /export const USE_AI = (true|false);/;
  if (regex.test(content)) {
    content = content.replace(
      regex,
      `export const USE_AI = ${value};`
    );
  } else {
    throw new Error('Không tìm thấy USE_AI trong config.js');
  }

  await writeConfigFile(content);
  console.log(`✅ Đã update USE_AI = ${value}`);
}

/**
 * Update mint_data trong config.js
 * @param {string} mintData - Nội dung mint_data (có thể chứa nhiều dòng)
 */
export async function updateMintData(mintData) {
  if (typeof mintData !== 'string') {
    throw new Error('mintData phải là string');
  }

  let content = await readConfigFile();
  
  // Escape backticks và $ trong mint_data
  const escapedMintData = mintData.replace(/`/g, '\\`').replace(/\$/g, '\\$');
  
  // Tìm và thay thế mint_data (có thể nhiều dòng)
  const regex = /export const mint_data = `[\s\S]*?`;/;
  if (regex.test(content)) {
    content = content.replace(
      regex,
      `export const mint_data = \`${escapedMintData}\`;`
    );
  } else {
    throw new Error('Không tìm thấy mint_data trong config.js');
  }

  await writeConfigFile(content);
  console.log(`✅ Đã update mint_data`);
}

/**
 * Update DELAY_REGIS trong config.js
 * @param {number} minutes - Số phút delay
 */
export async function updateDelayRegis(minutes) {
  if (typeof minutes !== 'number' || minutes < 0) {
    throw new Error('minutes phải là số >= 0');
  }

  let content = await readConfigFile();
  
  const regex = /export const DELAY_REGIS = \d+;/;
  if (regex.test(content)) {
    content = content.replace(
      regex,
      `export const DELAY_REGIS = ${minutes};`
    );
  } else {
    throw new Error('Không tìm thấy DELAY_REGIS trong config.js');
  }

  await writeConfigFile(content);
  console.log(`✅ Đã update DELAY_REGIS = ${minutes}`);
}

/**
 * Update DELAY_AFTER_DAY trong config.js
 * @param {number} minutes - Số phút delay
 */
export async function updateDelayAfterDay(minutes) {
  if (typeof minutes !== 'number' || minutes < 0) {
    throw new Error('minutes phải là số >= 0');
  }

  let content = await readConfigFile();
  
  const regex = /export const DELAY_AFTER_DAY = \d+;/;
  if (regex.test(content)) {
    content = content.replace(
      regex,
      `export const DELAY_AFTER_DAY = ${minutes};`
    );
  } else {
    throw new Error('Không tìm thấy DELAY_AFTER_DAY trong config.js');
  }

  await writeConfigFile(content);
  console.log(`✅ Đã update DELAY_AFTER_DAY = ${minutes}`);
}

/**
 * Update MAX_ACCOUNTS_PER_IP trong config.js
 * @param {number} maxAccounts - Số account tối đa
 */
export async function updateMaxAccountsPerIP(maxAccounts) {
  if (typeof maxAccounts !== 'number' || maxAccounts < 1) {
    throw new Error('maxAccounts phải là số >= 1');
  }

  let content = await readConfigFile();
  
  const regex = /export const MAX_ACCOUNTS_PER_IP = \d+;/;
  if (regex.test(content)) {
    content = content.replace(
      regex,
      `export const MAX_ACCOUNTS_PER_IP = ${maxAccounts};`
    );
  } else {
    throw new Error('Không tìm thấy MAX_ACCOUNTS_PER_IP trong config.js');
  }

  await writeConfigFile(content);
  console.log(`✅ Đã update MAX_ACCOUNTS_PER_IP = ${maxAccounts}`);
}

/**
 * Update LIMIT_WAITING trong config.js
 * @param {number} minutes - Số phút đợi
 */
export async function updateLimitWaiting(minutes) {
  if (typeof minutes !== 'number' || minutes < 0) {
    throw new Error('minutes phải là số >= 0');
  }

  let content = await readConfigFile();
  
  const regex = /export const LIMIT_WAITING = \d+;/;
  if (regex.test(content)) {
    content = content.replace(
      regex,
      `export const LIMIT_WAITING = ${minutes};`
    );
  } else {
    throw new Error('Không tìm thấy LIMIT_WAITING trong config.js');
  }

  await writeConfigFile(content);
  console.log(`✅ Đã update LIMIT_WAITING = ${minutes}`);
}

/**
 * Thêm proxy vào PROXY_LIST (nếu chưa có)
 * @param {string} proxyUrl - URL của proxy
 */
export async function addProxy(proxyUrl) {
  if (typeof proxyUrl !== 'string') {
    throw new Error('proxyUrl phải là string');
  }

  let content = await readConfigFile();
  
  // Lấy danh sách proxy hiện tại
  const proxyListMatch = content.match(/export const PROXY_LIST = \[([\s\S]*?)\];/);
  if (!proxyListMatch) {
    throw new Error('Không tìm thấy PROXY_LIST trong config.js');
  }

  const currentProxies = proxyListMatch[1]
    .split(',')
    .map(p => p.trim().replace(/['"]/g, ''))
    .filter(p => p);

  // Kiểm tra xem proxy đã tồn tại chưa
  if (currentProxies.includes(proxyUrl)) {
    console.log(`⚠️  Proxy đã tồn tại: ${proxyUrl}`);
    return;
  }

  // Thêm proxy mới
  currentProxies.push(proxyUrl);
  await updateProxyList(currentProxies);
  console.log(`✅ Đã thêm proxy: ${proxyUrl}`);
}

/**
 * Xóa proxy khỏi PROXY_LIST
 * @param {string} proxyUrl - URL của proxy cần xóa
 */
export async function removeProxy(proxyUrl) {
  if (typeof proxyUrl !== 'string') {
    throw new Error('proxyUrl phải là string');
  }

  let content = await readConfigFile();
  
  // Lấy danh sách proxy hiện tại
  const proxyListMatch = content.match(/export const PROXY_LIST = \[([\s\S]*?)\];/);
  if (!proxyListMatch) {
    throw new Error('Không tìm thấy PROXY_LIST trong config.js');
  }

  const currentProxies = proxyListMatch[1]
    .split(',')
    .map(p => p.trim().replace(/['"]/g, ''))
    .filter(p => p);

  // Xóa proxy
  const filteredProxies = currentProxies.filter(p => p !== proxyUrl);
  
  if (filteredProxies.length === currentProxies.length) {
    console.log(`⚠️  Không tìm thấy proxy: ${proxyUrl}`);
    return;
  }

  await updateProxyList(filteredProxies);
  console.log(`✅ Đã xóa proxy: ${proxyUrl}`);
}

// Example usage (uncomment để test):
// async function test() {
//   try {
//     // Test update proxy list
//     const newProxies = [
//       'http://user:pass@proxy1.com:8080',
//       'http://user:pass@proxy2.com:8080'
//     ];
//     await updateProxyList(newProxies);
//     
//     // Test update boolean
//     await updateUseProxyFromConfig(true);
//     
//     // Test add/remove proxy
//     await addProxy('http://user:pass@proxy3.com:8080');
//     await removeProxy('http://user:pass@proxy3.com:8080');
//   } catch (error) {
//     console.error('Error:', error.message);
//   }
// }
// test();

