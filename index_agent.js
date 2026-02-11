import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';
import { DELAY_AFTER_DAY } from './config.js';
import { getRandomUserAgent, buildRequestOptions, fetchWithProxy } from './helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ACCOUNTS_FILE = `${__dirname}/moltbook_accounts.json`;
const INDEX_AGENT_API_URL = 'https://mbc20.xyz/api/index-agent';


/**
 * Lưu danh sách tài khoản vào file JSON
 */
async function saveAccounts(accounts) {
  try {
    await writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving accounts:', error.message);
    throw error;
  }
}

/**
 * Cập nhật delay dựa trên thời gian đăng ký
 * Nếu registered_at > 24 giờ thì update delay = DELAY_AFTER_DAY
 */
async function updateDelayBasedOnRegistration(accounts) {
  const currentTimestamp = Math.floor(Date.now() / 1000); // Unix timestamp (giây)
  const oneDayInSeconds = 24 * 60 * 60; // 24 giờ = 86400 giây
  let updated = false;
  
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    
    // Chỉ xử lý nếu có registered_at
    if (account.registered_at && typeof account.registered_at === 'number') {
      const timeSinceRegistration = currentTimestamp - account.registered_at;
      
      // Nếu đã qua 24 giờ và delay chưa được update
      if (timeSinceRegistration > oneDayInSeconds) {
        // Chỉ update nếu delay hiện tại khác DELAY_AFTER_DAY
        if (account.delay !== DELAY_AFTER_DAY) {
          account.delay = DELAY_AFTER_DAY;
          updated = true;
        }
      }
    }
  }
  
  // Lưu lại nếu có thay đổi
  if (updated) {
    await saveAccounts(accounts);
  }
  
  return accounts;
}

/**
 * Đọc danh sách tài khoản từ file JSON
 */
async function loadAccounts() {
  try {
    if (existsSync(ACCOUNTS_FILE)) {
      const data = await readFile(ACCOUNTS_FILE, 'utf-8');
      const accounts = JSON.parse(data);
      
      // Cập nhật delay dựa trên thời gian đăng ký
      return await updateDelayBasedOnRegistration(accounts);
    }
    return [];
  } catch (error) {
    console.error('Error loading accounts:', error.message);
    return [];
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
 * Delay function
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Index agent theo tên
 */
async function indexAgent(agentName, account = null) {
  try {
    const requestOptions = await buildRequestOptions(account);
    
    const response = await fetchWithProxy(`${INDEX_AGENT_API_URL}?name=${encodeURIComponent(agentName)}`, {
      method: 'GET',
      ...requestOptions
    });
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}: ${data.message || 'Unknown error'}`);
    }
    
    return data;
  } catch (error) {
    throw new Error(`Index agent failed: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Đọc danh sách tài khoản
    const allAccounts = await loadAccounts();
    
    if (allAccounts.length === 0) {
      console.error('✖ Không có tài khoản nào trong file!');
      console.error(`  Hãy chạy: node register_moltbook.js để đăng ký tài khoản trước.`);
      process.exit(1);
    }

    // Hiển thị danh sách tài khoản
    console.log(`\nDanh sách tài khoản (${allAccounts.length}):`);
    allAccounts.forEach((acc, index) => {
      const statusText = acc.status === 0 ? '✖ Tắt' : '✓ Bật';
      console.log(`  ${index + 1}. ${acc.name} (${statusText})`);
    });

    // Hỏi user chọn account
    const accountInput = await askQuestion(`\nChọn account để index (nhập số 1-${allAccounts.length}, hoặc 'all' để chọn tất cả): `);
    
    let selectedAccounts = [];
    
    if (accountInput.trim().toLowerCase() === 'all') {
      selectedAccounts = allAccounts;
      console.log(`\nĐã chọn tất cả ${allAccounts.length} account(s)`);
    } else {
      const accountIndex = parseInt(accountInput.trim()) - 1;
      if (isNaN(accountIndex) || accountIndex < 0 || accountIndex >= allAccounts.length) {
        console.error('✖ Lựa chọn không hợp lệ!');
        process.exit(1);
      }
      selectedAccounts = [allAccounts[accountIndex]];
      console.log(`\nĐã chọn account: ${allAccounts[accountIndex].name}`);
    }

    console.log(`\nĐang index ${selectedAccounts.length} account(s)...\n`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Index từng tài khoản
    for (let i = 0; i < selectedAccounts.length; i++) {
      const account = selectedAccounts[i];
      const agentName = account.name;
      
      console.log(`[${i + 1}/${selectedAccounts.length}] Indexing agent: ${agentName}...`);

      try {
        const indexResult = await indexAgent(agentName, account);
        console.log(`  \x1b[32m✓ Đã index agent thành công! Processed: ${indexResult.processed || 'N/A'}\x1b[0m`);
        
        results.push({
          account: agentName,
          success: true,
          processed: indexResult.processed || 'N/A',
          result: indexResult
        });
        successCount++;
      } catch (error) {
        console.log(`  ✖ Lỗi: ${error.message}`);
        
        results.push({
          account: agentName,
          success: false,
          error: error.message
        });
        failCount++;
      }

      // Delay giữa các request để tránh rate limit
      if (i < selectedAccounts.length - 1) {
        await delay(1000); // 1 giây delay
      }
    }

    // Tổng kết
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Tổng kết:`);
    console.log(`  \x1b[32m✓ Thành công: ${successCount}/${selectedAccounts.length}\x1b[0m`);
    console.log(`  ✖ Thất bại: ${failCount}/${selectedAccounts.length}`);
    console.log(`${'='.repeat(50)}\n`);

    // Hiển thị chi tiết kết quả
    if (results.length > 0) {
      console.log('Chi tiết kết quả:');
      results.forEach(result => {
        if (result.success) {
          console.log(`  \x1b[32m✓ ${result.account}: Processed: ${result.processed}\x1b[0m`);
        } else {
          console.log(`  ✖ ${result.account}: ${result.error}`);
        }
      });
    }

  } catch (error) {
    console.error('\n✖ Lỗi:', error.message);
    process.exit(1);
  }
}

// Chạy script
main();

