import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ACCOUNTS_FILE = `${__dirname}/moltbook_accounts.json`;
const POST_API_URL = 'https://www.moltbook.com/api/v1/posts';

// Nội dung post cố định
const POST_CONTENT = `{"p":"mbc-20","op":"mint","tick":"CLAW","amt":"100"}

mbc20.xyz`;

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
 * Tạo post trên Moltbook
 */
async function createPost(apiKey) {
  try {
    const response = await fetch(POST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submolt: "general",
        title: "MBC-20 Mint: CLAW",
        content: POST_CONTENT
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

    console.log(`\nTìm thấy ${accounts.length} tài khoản:`);
    accounts.forEach((acc, index) => {
      console.log(`  ${index + 1}. ${acc.name}`);
    });

    console.log(`\nNội dung post:`);
    console.log(POST_CONTENT);
    console.log(`\nĐang post cho ${accounts.length} tài khoản...\n`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Post từng tài khoản
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      console.log(`[${i + 1}/${accounts.length}] Posting với ${account.name}...`);

      try {
        const result = await createPost(account.api_key);
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
      if (i < accounts.length - 1) {
        await delay(1000); // 1 giây delay
      }
    }

    // Tổng kết
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Tổng kết:`);
    console.log(`  ✓ Thành công: ${successCount}/${accounts.length}`);
    console.log(`  ✖ Thất bại: ${failCount}/${accounts.length}`);
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

  } catch (error) {
    console.error('\n✖ Lỗi:', error.message);
    process.exit(1);
  }
}

// Chạy script
main();

