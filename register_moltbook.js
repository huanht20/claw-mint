import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';
import { DELAY_REGIS, USE_PROXY_FROM_CONFIG, PROXY_LIST } from './config.js';
import { getRandomUserAgent, extractProxyIP, buildRequestOptions, fetchWithProxy } from './helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ACCOUNTS_FILE = `${__dirname}/moltbook_accounts.json`;
const API_URL = 'https://www.moltbook.com/api/v1/agents/register';


/**
 * Shuffle array (Fisher-Yates algorithm)
 */
function shuffleArray(array) {
  const shuffled = [...array]; // Tạo bản sao để không thay đổi array gốc
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Extract IP từ proxy URL
 * Format: http://username:password@host:port hoặc http://host:port
 */
function extractProxyIP(proxyUrl) {
  if (!proxyUrl || typeof proxyUrl !== 'string') {
    return null;
  }
  
  try {
    // Parse URL để lấy host
    const url = new URL(proxyUrl);
    return url.hostname; // Trả về IP hoặc hostname
  } catch (error) {
    // Nếu không parse được, thử extract bằng regex
    const match = proxyUrl.match(/@([^:]+):/);
    if (match) {
      return match[1]; // IP/hostname sau @
    }
    // Nếu không có @, thử extract từ http://
    const match2 = proxyUrl.match(/:\/\/([^:]+):/);
    if (match2) {
      return match2[1];
    }
    return null;
  }
}

/**
 * Lấy random proxy từ PROXY_LIST (nếu có)
 */
function getRandomProxy() {
  if (!USE_PROXY_FROM_CONFIG || !PROXY_LIST || PROXY_LIST.length === 0) {
    return null;
  }
  
  // Shuffle proxy list mỗi lần chạy
  const shuffledProxies = shuffleArray(PROXY_LIST);
  const randomProxy = shuffledProxies[Math.floor(Math.random() * shuffledProxies.length)];
  
  return randomProxy;
}

/**
 * Đọc danh sách tài khoản từ file JSON
 */
async function loadAccounts() {
  try {
    if (existsSync(ACCOUNTS_FILE)) {
      const data = await readFile(ACCOUNTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading accounts:', error.message);
    return [];
  }
}

/**
 * Lưu danh sách tài khoản vào file JSON
 */
async function saveAccounts(accounts) {
  try {
    await writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
    console.log(`✓ Saved ${accounts.length} account(s) to ${ACCOUNTS_FILE}`);
  } catch (error) {
    console.error('Error saving accounts:', error.message);
    throw error;
  }
}

/**
 * Đăng ký tài khoản Moltbook mới
 */
async function registerMoltbookAccount(name, description = null) {
  try {
    // Sử dụng proxy nếu có khai báo
    const proxy = getRandomProxy();
    if (proxy) {
      const proxyIP = extractProxyIP(proxy);
      console.log(`  🔄 Đang sử dụng Proxy: ${proxy}`);
      if (proxyIP) {
        console.log(`  📍 Proxy IP: ${proxyIP}`);
      }
    }
    
    const requestOptions = await buildRequestOptions(null, proxy, {
      'Content-Type': 'application/json'
    });
    
    const response = await fetchWithProxy(API_URL, {
      method: 'POST',
      ...requestOptions,
      body: JSON.stringify({
        name: name,
        description: description || `${name}'s AI agent on Moltbook`
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}: ${data.message || 'Unknown error'}`);
    }

    const registeredAt = Math.floor(Date.now() / 1000); // Unix timestamp (giây)

    return {
      name: data.agent.name,
      api_key: data.agent.api_key,
      link_claim: data.agent.claim_url,
      status: 1,
      last_post: 0,
      wallet_link: null,
      delay: DELAY_REGIS,
      registered_at: registeredAt
    };
  } catch (error) {
    throw new Error(`Registration failed: ${error.message}`);
  }
}

/**
 * Hỏi input từ console
 */
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

/**
 * Main function
 */
async function main() {
  try {
    // Hỏi tên agent từ console
    const agentName = await askQuestion('Nhập tên agent Moltbook: ');
    
    if (!agentName || agentName.trim() === '') {
      console.error('✖ Tên agent không được để trống!');
      process.exit(1);
    }

    console.log(`\nĐang đăng ký agent: ${agentName}...`);
    
    // Đăng ký tài khoản mới (không có mô tả)
    const newAccount = await registerMoltbookAccount(agentName.trim(), null);
    
    console.log('\n✓ Đăng ký thành công!');
    console.log(`  Tên: ${newAccount.name}`);
    console.log(`  API Key: ${newAccount.api_key}`);
    console.log(`  Link Claim: ${newAccount.link_claim}`);
    
    // Đọc danh sách tài khoản hiện có
    const accounts = await loadAccounts();
    
    // Kiểm tra xem tài khoản đã tồn tại chưa (theo tên)
    const existingIndex = accounts.findIndex(acc => acc.name === newAccount.name);
    
    if (existingIndex >= 0) {
      // Cập nhật tài khoản đã tồn tại (giữ nguyên status, last_post, wallet_link, delay và registered_at nếu đã có)
      const existingAccount = accounts[existingIndex];
      accounts[existingIndex] = {
        ...newAccount,
        status: existingAccount.status !== undefined ? existingAccount.status : 1,
        last_post: existingAccount.last_post !== undefined ? existingAccount.last_post : 0,
        wallet_link: existingAccount.wallet_link !== undefined ? existingAccount.wallet_link : null,
        delay: existingAccount.delay !== undefined ? existingAccount.delay : DELAY_REGIS,
        registered_at: existingAccount.registered_at !== undefined ? existingAccount.registered_at : newAccount.registered_at
      };
      console.log(`  Đã cập nhật tài khoản: ${newAccount.name}`);
    } else {
      // Thêm tài khoản mới
      accounts.push(newAccount);
      console.log(`  Đã thêm tài khoản mới: ${newAccount.name}`);
    }
    
    // Lưu vào file JSON
    await saveAccounts(accounts);
    
    console.log('\n✓ Hoàn tất!');
    
  } catch (error) {
    console.error('\n✖ Lỗi:', error.message);
    process.exit(1);
  }
}

// Chạy script
main();

