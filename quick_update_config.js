#!/usr/bin/env node

/**
 * Script nhanh để update config.js
 * 
 * Cách sử dụng:
 * node quick_update_config.js
 * 
 * Hoặc chỉnh sửa các giá trị bên dưới và chạy
 */

import {
  updateProxyList,
  updateUseProxyFromConfig,
  updateOpenAIApiKey,
  updateUseAI,
  updateDelayRegis,
  updateDelayAfterDay,
  updateMaxAccountsPerIP,
  updateLimitWaiting
} from './update_config.js';

async function main() {
  try {
    console.log('🔧 Bắt đầu update config.js...\n');

    // ============================================
    // CHỈNH SỬA CÁC GIÁ TRỊ DƯỚI ĐÂY THEO NHU CẦU
    // ============================================

    // 1. Update PROXY_LIST (uncomment và chỉnh sửa)
    // const newProxies = [
    //   'http://gmvjgsol:482ax6w3fy31@45.43.184.205:5879',
    //   'http://gmvjgsol:482ax6w3fy31@64.137.103.144:6732',
    // ];
    // await updateProxyList(newProxies);

    // 2. Bật/tắt proxy
    // await updateUseProxyFromConfig(true);

    // 3. Update OpenAI API Key
    // await updateOpenAIApiKey('sk-proj-your-api-key-here');

    // 4. Bật/tắt AI
    // await updateUseAI(true);

    // 5. Update delay khi đăng ký (phút)
    // await updateDelayRegis(120);

    // 6. Update delay sau 1 ngày (phút)
    // await updateDelayAfterDay(30);

    // 7. Update số account tối đa mỗi IP
    // await updateMaxAccountsPerIP(5);

    // 8. Update thời gian đợi (phút)
    // await updateLimitWaiting(5);

    // ============================================
    // KẾT THÚC CHỈNH SỬA
    // ============================================

    console.log('\n✅ Hoàn tất! (Không có thay đổi nào vì tất cả đều đã comment)');
    console.log('💡 Uncomment các dòng code trên để thực sự update config.js');

  } catch (error) {
    console.error('\n❌ Lỗi:', error.message);
    process.exit(1);
  }
}

main();

