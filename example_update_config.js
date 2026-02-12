/**
 * Ví dụ sử dụng các hàm update config.js
 * 
 * Cách chạy:
 * node example_update_config.js
 */

import {
  updateProxyList,
  updateUseProxyFromConfig,
  updateOpenAIApiKey,
  updateUseAI,
  updateMintData,
  updateDelayRegis,
  updateDelayAfterDay,
  updateMaxAccountsPerIP,
  updateLimitWaiting,
  addProxy,
  removeProxy
} from './update_config.js';

async function main() {
  try {
    console.log('🚀 Bắt đầu demo các hàm update config...\n');

    // 1. Update danh sách proxy
    console.log('1️⃣  Update PROXY_LIST:');
    const newProxies = [
      'http://gmvjgsol:482ax6w3fy31@45.43.184.205:5879',
      'http://gmvjgsol:482ax6w3fy31@64.137.103.144:6732',
      'http://gmvjgsol:482ax6w3fy31@216.74.118.136:6291'
    ];
    // Uncomment để chạy:
    // await updateProxyList(newProxies);
    console.log('   (Đã comment để tránh thay đổi config thực tế)\n');

    // 2. Bật/tắt sử dụng proxy từ config
    console.log('2️⃣  Update USE_PROXY_FROM_CONFIG:');
    // await updateUseProxyFromConfig(true);
    console.log('   (Đã comment để tránh thay đổi config thực tế)\n');

    // 3. Update OpenAI API Key
    console.log('3️⃣  Update OPENAI_API_KEY:');
    // await updateOpenAIApiKey('sk-proj-your-new-api-key-here');
    console.log('   (Đã comment để tránh thay đổi config thực tế)\n');

    // 4. Bật/tắt AI
    console.log('4️⃣  Update USE_AI:');
    // await updateUseAI(true);
    console.log('   (Đã comment để tránh thay đổi config thực tế)\n');

    // 5. Update mint_data
    console.log('5️⃣  Update mint_data:');
    const newMintData = `{"p":"mbc-20","op":"mint","tick":"GPT","amt":"100"}

mbc20.xyz`;
    // await updateMintData(newMintData);
    console.log('   (Đã comment để tránh thay đổi config thực tế)\n');

    // 6. Update delay khi đăng ký
    console.log('6️⃣  Update DELAY_REGIS:');
    // await updateDelayRegis(120);
    console.log('   (Đã comment để tránh thay đổi config thực tế)\n');

    // 7. Update delay sau 1 ngày
    console.log('7️⃣  Update DELAY_AFTER_DAY:');
    // await updateDelayAfterDay(30);
    console.log('   (Đã comment để tránh thay đổi config thực tế)\n');

    // 8. Update số account tối đa mỗi IP
    console.log('8️⃣  Update MAX_ACCOUNTS_PER_IP:');
    // await updateMaxAccountsPerIP(5);
    console.log('   (Đã comment để tránh thay đổi config thực tế)\n');

    // 9. Update thời gian đợi
    console.log('9️⃣  Update LIMIT_WAITING:');
    // await updateLimitWaiting(5);
    console.log('   (Đã comment để tránh thay đổi config thực tế)\n');

    // 10. Thêm proxy mới
    console.log('🔟 Thêm proxy mới:');
    // await addProxy('http://user:pass@newproxy.com:8080');
    console.log('   (Đã comment để tránh thay đổi config thực tế)\n');

    // 11. Xóa proxy
    console.log('1️⃣1️⃣  Xóa proxy:');
    // await removeProxy('http://user:pass@newproxy.com:8080');
    console.log('   (Đã comment để tránh thay đổi config thực tế)\n');

    console.log('✅ Demo hoàn tất! Uncomment các dòng code để thực sự update config.');

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  }
}

// Chạy demo
main();

