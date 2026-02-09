import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ACCOUNTS_FILE = `${__dirname}/moltbook_accounts.json`;
const POST_API_URL = 'https://www.moltbook.com/api/v1/posts';

// Wallet address - biến được khai báo
let WALLET_ADDRESS = '';

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
 * Tạo nội dung post link wallet
 */
function createLinkContent(wallet) {
  const linkData = {
    p: "mbc-20",
    op: "link",
    wallet: wallet
  };
  
  return `${JSON.stringify(linkData)}\n\nmbc20.xyz`;
}

/**
 * Tạo post link wallet trên Moltbook
 */
async function createLinkPost(apiKey, wallet) {
  try {
    const content = createLinkContent(wallet);
    const title = `Post this exact message on Moltbook to link yourself to wallet ${wallet}:`;

    const response = await fetch(POST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submolt: "general",
        title: title,
        content: content
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}: ${data.message || 'Unknown error'}`);
    }

    return data;
  } catch (error) {
    throw new Error(`Post failed: ${error.message}`);
  }
}

/**
 * Delay function
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function
 */
async function main() {
  try {
    // Đọc danh sách tài khoản
    const accounts = await loadAccounts();
    
    if (accounts.length === 0) {
      console.error('✖ Không có tài khoản nào trong file!');
      console.error(`  Hãy chạy: node register_moltbook.js để đăng ký tài khoản trước.`);
      process.exit(1);
    }

    // Hiển thị danh sách tài khoản
    console.log(`\nDanh sách tài khoản:`);
    accounts.forEach((acc, index) => {
      console.log(`  ${index + 1}. ${acc.name}`);
    });

    // Hỏi user chọn account
    const accountInput = await askQuestion(`\nChọn account để link (nhập số 1-${accounts.length}, hoặc 'all' để chọn tất cả): `);
    
    let selectedAccounts = [];
    
    if (accountInput.trim().toLowerCase() === 'all') {
      selectedAccounts = accounts;
      console.log(`\nĐã chọn tất cả ${accounts.length} account(s)`);
    } else {
      const accountIndex = parseInt(accountInput.trim()) - 1;
      if (isNaN(accountIndex) || accountIndex < 0 || accountIndex >= accounts.length) {
        console.error('✖ Lựa chọn không hợp lệ!');
        process.exit(1);
      }
      selectedAccounts = [accounts[accountIndex]];
      console.log(`\nĐã chọn account: ${accounts[accountIndex].name}`);
    }

    // Hỏi wallet address
    const walletInput = await askQuestion('\nNhập wallet address để link với agent: ');
    const wallet = walletInput.trim();
    
    if (!wallet || wallet === '') {
      console.error('✖ Wallet address không được để trống!');
      process.exit(1);
    }

    // Validate wallet format (basic check - starts with 0x and has 42 chars)
    if (!wallet.startsWith('0x') || wallet.length !== 42) {
      console.error('✖ Wallet address không đúng format! (phải bắt đầu với 0x và có 42 ký tự)');
      process.exit(1);
    }

    WALLET_ADDRESS = wallet;

    console.log(`\nWallet address: ${WALLET_ADDRESS}`);
    console.log(`\nNội dung sẽ được post:`);
    console.log(createLinkContent(WALLET_ADDRESS));
    console.log(`\nĐang post cho ${selectedAccounts.length} account(s)...\n`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Post từng tài khoản
    for (let i = 0; i < selectedAccounts.length; i++) {
      const account = selectedAccounts[i];
      console.log(`[${i + 1}/${selectedAccounts.length}] Posting với ${account.name}...`);

      try {
        const result = await createLinkPost(account.api_key, WALLET_ADDRESS);
        results.push({
          account: account.name,
          success: true,
          post_id: result.post?.id,
          post_url: result.post?.url,
          verification_required: result.verification_required
        });
        successCount++;
        console.log(`  ✓ Thành công! Post ID: ${result.post?.id}`);
        if (result.verification_required) {
          console.log(`  ⚠ Cần verification để publish`);
        }
      } catch (error) {
        results.push({
          account: account.name,
          success: false,
          error: error.message
        });
        failCount++;
        console.log(`  ✖ Lỗi: ${error.message}`);
      }

      // Delay giữa các request để tránh rate limit
      if (i < selectedAccounts.length - 1) {
        await delay(1000); // 1 giây delay
      }
    }

    // Tổng kết
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Tổng kết:`);
    console.log(`  ✓ Thành công: ${successCount}/${selectedAccounts.length}`);
    console.log(`  ✖ Thất bại: ${failCount}/${selectedAccounts.length}`);
    console.log(`${'='.repeat(50)}\n`);

    // Hiển thị chi tiết kết quả
    if (results.length > 0) {
      console.log('Chi tiết kết quả:');
      results.forEach(result => {
        if (result.success) {
          console.log(`  ✓ ${result.account}: ${result.post_id || 'N/A'}`);
        } else {
          console.log(`  ✖ ${result.account}: ${result.error}`);
        }
      });
    }

    console.log(`\nLưu ý: Post này sẽ cho phép wallet owner claim mbc-20 token balances as ERC-20 tokens on Base.`);

  } catch (error) {
    console.error('\n✖ Lỗi:', error.message);
    process.exit(1);
  }
}

// Chạy script
main();

