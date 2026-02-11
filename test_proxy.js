import { checkIP, buildRequestOptions } from './helper.js';
import { USE_PROXY_FROM_CONFIG, PROXY_LIST } from './config.js';

/**
 * Test script để kiểm tra proxy có hoạt động đúng không
 */
async function testProxy() {
  console.log('🔍 Bắt đầu test proxy...\n');
  
  // Check IP không dùng proxy
  try {
    console.log('1. Check IP không dùng proxy:');
    const ipWithoutProxy = await checkIP();
    console.log(`   ✓ IP: ${ipWithoutProxy}\n`);
  } catch (error) {
    console.log(`   ✖ Lỗi: ${error.message}\n`);
  }
  
  // Test với proxy từ config nếu có
  if (USE_PROXY_FROM_CONFIG && PROXY_LIST && PROXY_LIST.length > 0) {
    console.log(`2. Test với proxy từ config (${PROXY_LIST.length} proxy):`);
    
    for (let i = 0; i < Math.min(3, PROXY_LIST.length); i++) {
      const proxy = PROXY_LIST[i];
      try {
        console.log(`\n   Proxy ${i + 1}: ${proxy}`);
        const ipWithProxy = await checkIP(proxy);
        console.log(`   ✓ IP qua proxy: ${ipWithProxy}`);
        
        // Extract IP từ proxy URL để so sánh
        const url = new URL(proxy);
        const proxyHost = url.hostname;
        if (ipWithProxy === proxyHost) {
          console.log(`   ✓ IP khớp với proxy hostname`);
        } else {
          console.log(`   ⚠ IP (${ipWithProxy}) khác với proxy hostname (${proxyHost})`);
        }
      } catch (error) {
        console.log(`   ✖ Lỗi: ${error.message}`);
        if (error.cause) {
          console.log(`   ✖ Chi tiết: ${error.cause.message || JSON.stringify(error.cause)}`);
        }
      }
    }
  } else {
    console.log('2. Không có proxy từ config để test');
  }
  
  // Test với account có proxy riêng (nếu có)
  console.log('\n3. Test với account có proxy riêng:');
  const testAccount = {
    name: 'test',
    using_proxy: 1,
    proxy: 'http://gmvjgsol:482ax6w3fy31@216.173.123.7:6382'
  };
  
  try {
    const requestOptions = await buildRequestOptions(testAccount);
    if (requestOptions.agent) {
      console.log('   ✓ ProxyAgent đã được tạo');
      const ipWithAccountProxy = await checkIP(testAccount.proxy);
      console.log(`   ✓ IP qua account proxy: ${ipWithAccountProxy}`);
    } else {
      console.log('   ✖ ProxyAgent không được tạo');
    }
  } catch (error) {
    console.log(`   ✖ Lỗi: ${error.message}`);
  }
  
  console.log('\n✅ Test hoàn tất!');
}

// Chạy test
testProxy().catch(console.error);

