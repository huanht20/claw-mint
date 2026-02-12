import readline from 'readline';
import { updateMintData, addProxy, updateOpenAIApiKey } from './update_config.js';
import { PROXY_LIST, OPENAI_API_KEY } from './config.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Hàm hỏi câu hỏi và trả về promise với câu trả lời
 */
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

/**
 * Hàm update mint_data
 */
async function updateMintDataMenu() {
  console.log('\n📝 === UPDATE MINT_DATA ===');
  console.log('Nhập nội dung mint_data mới (có thể nhiều dòng).');
  console.log('📌 Hướng dẫn:');
  console.log('   - Nhập "END" trên một dòng riêng để kết thúc và lưu');
  console.log('   - Nhập "CANCEL" để hủy bỏ\n');
  
  let mintDataLines = [];
  let line;
  
  do {
    line = await question('> ');
    const trimmedLine = line.trim().toUpperCase();
    
    if (trimmedLine === 'CANCEL') {
      console.log('⚠️  Đã hủy bỏ cập nhật mint_data.');
      return;
    }
    
    if (trimmedLine !== 'END') {
      mintDataLines.push(line);
    }
  } while (line.trim().toUpperCase() !== 'END');
  
  if (mintDataLines.length === 0) {
    console.log('⚠️  Không có nội dung, hủy bỏ.');
    return;
  }
  
  const mintData = mintDataLines.join('\n');
  
  // Hiển thị preview trước khi xác nhận
  console.log('\n📋 Preview nội dung mới:');
  console.log('─'.repeat(50));
  console.log(mintData);
  console.log('─'.repeat(50));
  
  const confirm = await question('\nBạn có chắc chắn muốn cập nhật? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('⚠️  Đã hủy bỏ cập nhật.');
    return;
  }
  
  try {
    await updateMintData(mintData);
    console.log('\n✅ Đã cập nhật mint_data thành công!');
  } catch (error) {
    console.error(`\n❌ Lỗi: ${error.message}`);
  }
}

/**
 * Hàm insert thêm records vào PROXY_LIST
 */
async function addProxyMenu() {
  console.log('\n🌐 === THÊM PROXY VÀO PROXY_LIST ===');
  console.log(`Hiện tại có ${PROXY_LIST.length} proxy trong danh sách.\n`);
  
  const proxyUrl = await question('Nhập proxy URL (ví dụ: http://user:pass@host:port): ');
  
  if (!proxyUrl.trim()) {
    console.log('⚠️  Proxy URL không được để trống, hủy bỏ.');
    return;
  }
  
  // Validate proxy URL format (basic check)
  if (!proxyUrl.startsWith('http://') && !proxyUrl.startsWith('https://')) {
    console.log('⚠️  Proxy URL phải bắt đầu bằng http:// hoặc https://');
    const confirm = await question('Bạn có muốn tiếp tục không? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      return;
    }
  }
  
  try {
    await addProxy(proxyUrl.trim());
    console.log('\n✅ Đã thêm proxy thành công!');
    console.log(`Proxy mới: ${proxyUrl.trim()}`);
    console.log(`Tổng số proxy hiện tại: ${PROXY_LIST.length + 1}`);
  } catch (error) {
    console.error(`\n❌ Lỗi: ${error.message}`);
  }
}

/**
 * Hàm update OpenAI API Key
 */
async function updateApiKeyMenu() {
  console.log('\n🔑 === UPDATE OPENAI API KEY ===');
  
  // Hiển thị API key hiện tại (ẩn một phần để bảo mật)
  const currentKey = OPENAI_API_KEY || '';
  const maskedKey = currentKey 
    ? `${currentKey.substring(0, 10)}...${currentKey.substring(currentKey.length - 4)}`
    : '(chưa có)';
  console.log(`API Key hiện tại: ${maskedKey}\n`);
  
  const apiKey = await question('Nhập OpenAI API Key mới (hoặc Enter để bỏ qua): ');
  
  if (!apiKey.trim()) {
    console.log('⚠️  API Key không được để trống, hủy bỏ.');
    return;
  }
  
  // Validate basic format (OpenAI API key thường bắt đầu bằng "sk-")
  if (!apiKey.startsWith('sk-') && !apiKey.startsWith('sk-proj-')) {
    console.log('⚠️  OpenAI API Key thường bắt đầu bằng "sk-" hoặc "sk-proj-"');
    const confirm = await question('Bạn có muốn tiếp tục không? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      return;
    }
  }
  
  // Hiển thị preview
  const maskedNewKey = `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`;
  console.log('\n📋 Preview:');
  console.log(`API Key mới: ${maskedNewKey}`);
  
  const confirm = await question('\nBạn có chắc chắn muốn cập nhật? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('⚠️  Đã hủy bỏ cập nhật.');
    return;
  }
  
  try {
    await updateOpenAIApiKey(apiKey.trim());
    console.log('\n✅ Đã cập nhật OpenAI API Key thành công!');
  } catch (error) {
    console.error(`\n❌ Lỗi: ${error.message}`);
  }
}

/**
 * Hàm main với menu
 */
async function main() {
  console.log('\n🔧 === QUẢN LÝ CONFIG ===\n');
  
  while (true) {
    console.log('Chọn chức năng:');
    console.log('1. Update mint_data');
    console.log('2. Thêm proxy vào PROXY_LIST');
    console.log('3. Update OpenAI API Key');
    console.log('0. Thoát\n');
    
    const choice = await question('Nhập lựa chọn (0-3): ');
    
    switch (choice.trim()) {
      case '1':
        await updateMintDataMenu();
        break;
      case '2':
        await addProxyMenu();
        break;
      case '3':
        await updateApiKeyMenu();
        break;
      case '0':
        console.log('\n👋 Tạm biệt!');
        rl.close();
        process.exit(0);
      default:
        console.log('\n⚠️  Lựa chọn không hợp lệ. Vui lòng chọn lại.\n');
    }
    
    // Hỏi có muốn tiếp tục không
    if (choice.trim() !== '0') {
      const continueChoice = await question('\nBạn có muốn tiếp tục? (y/n): ');
      if (continueChoice.toLowerCase() !== 'y') {
        console.log('\n👋 Tạm biệt!');
        rl.close();
        process.exit(0);
      }
      console.log('');
    }
  }
}

// Chạy main
main().catch((error) => {
  console.error('❌ Lỗi không mong đợi:', error);
  rl.close();
  process.exit(1);
});

