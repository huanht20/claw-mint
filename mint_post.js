import { readFile, writeFile, appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';
import { mint_data, USE_AI, OPENAI_API_KEY, DELAY_AFTER_DAY, USE_PROXY_FROM_CONFIG, PROXY_LIST, MAX_ACCOUNTS_PER_IP, LIMIT_WAITING } from './config.js';
import { getRandomUserAgent, extractProxyIP, isProxyError, buildRequestOptions, checkIP, fetchWithProxy } from './helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ACCOUNTS_FILE = `${__dirname}/moltbook_accounts.json`;
const POST_API_URL = 'https://www.moltbook.com/api/v1/posts';
const INDEX_POST_API_URL = 'https://mbc20.xyz/api/index-post';
const VERIFY_API_URL = 'https://www.moltbook.com/api/v1/verify';

// Proxy rotation state
let proxyRotationState = {
  currentProxyIndex: 0,
  accountsUsedWithCurrentProxy: 0,
  currentProxy: null
};

// Shuffled proxy list (được shuffle khi bắt đầu mỗi round)
let shuffledProxyList = [];

// State để track số accounts đã chạy khi không dùng proxy
let noProxyState = {
  accountsUsed: 0
};


/**
 * Tạo 10 ký tự ngẫu nhiên gồm số và chữ
 */
function generateRandomCharacters() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 10; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

/**
 * Tạo nội dung post với ký tự random mới mỗi lần
 */
function getPostContent() {
  return `${mint_data}
${generateRandomCharacters()}`;
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
      
      // Kiểm tra và tự động update status = 1 nếu suspension_ends_at đã hết hạn
      const now = new Date();
      let hasUpdates = false;
      
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        if (account.suspension_ends_at && account.status === 0) {
          // Parse suspension_ends_at (có thể là ISO string hoặc Unix timestamp)
          let suspensionEndDate = null;
          if (typeof account.suspension_ends_at === 'string') {
            suspensionEndDate = new Date(account.suspension_ends_at);
          } else if (typeof account.suspension_ends_at === 'number') {
            // Nếu là Unix timestamp (seconds hoặc milliseconds)
            suspensionEndDate = new Date(account.suspension_ends_at * (account.suspension_ends_at < 1e12 ? 1000 : 1));
          }
          
          if (suspensionEndDate && !isNaN(suspensionEndDate.getTime()) && suspensionEndDate <= now) {
            // Suspension đã hết hạn, tự động kích hoạt lại account
            accounts[i].status = 1;
            accounts[i].suspension_ends_at = null; // Xóa thời gian suspension
            accounts[i].status_hint = null; // Xóa hint
            hasUpdates = true;
            console.log(`  ✓ Tự động kích hoạt lại account ${account.name} (suspension đã hết hạn)`);
          }
        }
      }
      
      // Lưu lại nếu có updates
      if (hasUpdates) {
        await saveAccounts(accounts);
      }
      
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
 * Sử dụng AI (ChatGPT) để giải challenge
 */
async function solveChallengeWithAI(challenge, instructions, accountName = '') {
  const model = 'gpt-5.2'; // Model name để track stats
  
  try {
    if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
      throw new Error('OpenAI API key chưa được cấu hình');
    }

    const prompt = `Challenge: ${challenge}
Instructions: ${instructions}`;

    const requestBody = {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a math problem solver. Answer ONLY with the number (with 2 decimal places, e.g., 525.00), no other text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_completion_tokens: 200
    };

    // Log câu hỏi (prompt) gửi cho AI
    await logToFile(accountName || 'AI', 'AI_REQUEST', {
      prompt: prompt,
      challenge: challenge,
      instructions: instructions,
      request_body: requestBody
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = `OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`;
      
      // Log lỗi
      await logToFile(accountName || 'AI', 'AI_ERROR', {
        prompt: prompt,
        error: errorMessage,
        error_data: errorData
      });
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const rawAnswer = data.choices[0]?.message?.content?.trim() || '';

    // Log câu trả lời từ AI
    await logToFile(accountName || 'AI', 'AI_RESPONSE', {
      prompt: prompt,
      raw_response: data,
      raw_answer: rawAnswer
    });

    // Extract number from answer (remove any non-numeric characters except decimal point)
    const numberMatch = rawAnswer.match(/[\d.]+/);
    if (!numberMatch) {
      throw new Error(`Không thể parse số từ câu trả lời AI: ${rawAnswer}`);
    }

    // Format to 2 decimal places
    const number = parseFloat(numberMatch[0]);
    const formattedAnswer = number.toFixed(2);

    // Log kết quả đã format
    await logToFile(accountName || 'AI', 'AI_RESULT', {
      prompt: prompt,
      raw_answer: rawAnswer,
      formatted_answer: formattedAnswer
    });

    // Không update AI stats ở đây, sẽ update sau khi verify xong
    // (thành công hoặc thất bại)

    return formattedAnswer;
  } catch (error) {
    // Log lỗi nếu có
    await logToFile(accountName || 'AI', 'AI_ERROR', {
      challenge: challenge,
      instructions: instructions,
      error: error.message
    });
    
    // Update AI stats - thất bại (chỉ update nếu đã gọi API, không phải lỗi trước khi gọi)
    if (error.message && !error.message.includes('OpenAI API key chưa được cấu hình')) {
      await updateAIStats(false, model);
    }
    
    throw new Error(`AI solve failed: ${error.message}`);
  }
}

/**
 * Format local time string
 * @param {Date} date - Date object (optional, defaults to now)
 */
function getLocalTimeString(date = null) {
  const now = date || new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  const timezoneOffset = -now.getTimezoneOffset();
  const timezoneHours = String(Math.floor(Math.abs(timezoneOffset) / 60)).padStart(2, '0');
  const timezoneMinutes = String(Math.abs(timezoneOffset) % 60).padStart(2, '0');
  const timezoneSign = timezoneOffset >= 0 ? '+' : '-';
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${timezoneSign}${timezoneHours}:${timezoneMinutes}`;
}

/**
 * Load AI stats từ file
 */
async function loadAIStats() {
  try {
    const logDir = `${__dirname}/log`;
    if (!existsSync(logDir)) {
      await mkdir(logDir, { recursive: true });
    }
    
    const statsFile = `${logDir}/ai_stats.json`;
    if (existsSync(statsFile)) {
      const data = await readFile(statsFile, 'utf-8');
      return JSON.parse(data);
    }
    
    // Tạo stats mặc định
    return {
      model: 'gpt-5.2',
      total_attempts: 0,
      successful_attempts: 0,
      failed_attempts: 0,
      success_rate: 0,
      last_updated: null
    };
  } catch (error) {
    console.error(`  ⚠ Lỗi khi load AI stats: ${error.message}`);
    return {
      model: 'gpt-5.2',
      total_attempts: 0,
      successful_attempts: 0,
      failed_attempts: 0,
      success_rate: 0,
      last_updated: null
    };
  }
}

/**
 * Save AI stats vào file
 */
async function saveAIStats(stats) {
  try {
    const logDir = `${__dirname}/log`;
    if (!existsSync(logDir)) {
      await mkdir(logDir, { recursive: true });
    }
    
    const statsFile = `${logDir}/ai_stats.json`;
    stats.last_updated = getLocalTimeString();
    stats.success_rate = stats.total_attempts > 0 
      ? ((stats.successful_attempts / stats.total_attempts) * 100).toFixed(2) 
      : 0;
    
    await writeFile(statsFile, JSON.stringify(stats, null, 2), 'utf-8');
  } catch (error) {
    console.error(`  ⚠ Lỗi khi save AI stats: ${error.message}`);
  }
}

/**
 * Update AI stats (thành công hoặc thất bại)
 */
async function updateAIStats(success = true, model = 'gpt-5.2') {
  try {
    const stats = await loadAIStats();
    
    // Nếu model thay đổi, reset stats
    if (stats.model !== model) {
      stats.model = model;
      stats.total_attempts = 0;
      stats.successful_attempts = 0;
      stats.failed_attempts = 0;
    }
    
    stats.total_attempts += 1;
    
    if (success) {
      stats.successful_attempts += 1;
    } else {
      stats.failed_attempts += 1;
    }
    
    await saveAIStats(stats);
    
    // Log update stats để debug
    await logToFile('SYSTEM', 'AI_STATS_UPDATE', {
      model: model,
      success: success,
      total_attempts: stats.total_attempts,
      successful_attempts: stats.successful_attempts,
      failed_attempts: stats.failed_attempts,
      success_rate: stats.success_rate
    });
  } catch (error) {
    console.error(`  ⚠ Lỗi khi update AI stats: ${error.message}`);
    await logToFile('SYSTEM', 'AI_STATS_UPDATE_ERROR', { error: error.message, stack: error.stack });
  }
}

/**
 * Parse hint để lấy thời gian kết thúc suspension
 * Trả về Unix timestamp (seconds) hoặc null nếu không parse được
 */
function parseSuspensionEndTime(hint) {
  if (!hint || typeof hint !== 'string') {
    return null;
  }
  
  // Pattern: "ends in X hours" hoặc "ends in X days"
  // Case insensitive
  const hourPattern = /ends?\s+in\s+(\d+)\s+hours?/i;
  const dayPattern = /ends?\s+in\s+(\d+)\s+days?/i;
  
  let match = hint.match(hourPattern);
  if (match) {
    const hours = parseInt(match[1], 10);
    const endTime = new Date(Date.now() + (hours * 60 * 60 * 1000)); // Thêm số giờ vào thời gian hiện tại
    // Trả về định dạng local time với timezone offset +07:00
    return getLocalTimeString(endTime);
  }
  
  match = hint.match(dayPattern);
  if (match) {
    const days = parseInt(match[1], 10);
    const endTime = new Date(Date.now() + (days * 24 * 60 * 60 * 1000)); // Thêm số ngày vào thời gian hiện tại
    // Trả về định dạng local time với timezone offset +07:00
    return getLocalTimeString(endTime);
  }
  
  return null;
}

/**
 * Log vào file để debug
 */
async function logToFile(accountName, action, data) {
  try {
    // Tạo thư mục log nếu chưa có
    const logDir = `${__dirname}/log`;
    if (!existsSync(logDir)) {
      await mkdir(logDir, { recursive: true });
    }
    
    // Tạo tên file log theo format: mint_mbc20_YYYY-MM-DD.log
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const logFileName = `mint_mbc20_${year}-${month}-${day}.log`;
    const logFile = `${logDir}/${logFileName}`;
    
    const timestamp = getLocalTimeString();
    const logEntry = `\n[${timestamp}] [${accountName}] [${action}]\n${JSON.stringify(data, null, 2)}\n${'='.repeat(80)}\n`;
    
    // Append vào file log
    await appendFile(logFile, logEntry, 'utf-8');
  } catch (error) {
    console.error(`  ⚠ Lỗi khi ghi log: ${error.message}`);
  }
}


/**
 * Lấy proxy cho account (với rotation logic)
 */
function getProxyForAccount(account) {
  // Nếu account có cấu hình proxy riêng và using_proxy = 1, ưu tiên dùng proxy của account
  if (account && account.using_proxy === 1 && account.proxy) {
    return account.proxy;
  }
  
  // Nếu không dùng proxy từ config, return null
  if (!USE_PROXY_FROM_CONFIG || !shuffledProxyList || shuffledProxyList.length === 0) {
    return null;
  }
  
  // Khởi tạo proxy đầu tiên nếu chưa có
  if (proxyRotationState.currentProxy === null) {
    proxyRotationState.currentProxy = shuffledProxyList[proxyRotationState.currentProxyIndex];
    const proxyIP = extractProxyIP(proxyRotationState.currentProxy);
    console.log(`  🔄 Sử dụng proxy ${proxyRotationState.currentProxyIndex + 1}/${shuffledProxyList.length}: ${proxyRotationState.currentProxy}`);
    if (proxyIP) {
      console.log(`  📍 Proxy IP: ${proxyIP}`);
    }
  }
  
  return proxyRotationState.currentProxy;
}

/**
 * Tăng số account đã dùng với proxy hiện tại và rotate nếu cần
 */
function incrementProxyUsage() {
  if (!USE_PROXY_FROM_CONFIG || !shuffledProxyList || shuffledProxyList.length === 0) {
    return;
  }
  
  proxyRotationState.accountsUsedWithCurrentProxy++;
  
  // Nếu đã dùng hết số account cho phép với proxy hiện tại, rotate sang proxy tiếp theo
  if (proxyRotationState.accountsUsedWithCurrentProxy >= MAX_ACCOUNTS_PER_IP) {
    proxyRotationState.currentProxyIndex = (proxyRotationState.currentProxyIndex + 1) % shuffledProxyList.length;
    proxyRotationState.accountsUsedWithCurrentProxy = 0;
    proxyRotationState.currentProxy = shuffledProxyList[proxyRotationState.currentProxyIndex];
    const proxyIP = extractProxyIP(proxyRotationState.currentProxy);
    console.log(`  🔄 Rotate sang proxy ${proxyRotationState.currentProxyIndex + 1}/${shuffledProxyList.length}: ${proxyRotationState.currentProxy}`);
    if (proxyIP) {
      console.log(`  📍 Proxy IP: ${proxyIP}`);
    }
  }
}

/**
 * Force rotate proxy (khi gặp rate limit)
 */
function forceRotateProxy() {
  if (!USE_PROXY_FROM_CONFIG || !shuffledProxyList || shuffledProxyList.length === 0) {
    return false; // Không có proxy để rotate
  }
  
  proxyRotationState.currentProxyIndex = (proxyRotationState.currentProxyIndex + 1) % shuffledProxyList.length;
  proxyRotationState.accountsUsedWithCurrentProxy = 0;
  proxyRotationState.currentProxy = shuffledProxyList[proxyRotationState.currentProxyIndex];
  const proxyIP = extractProxyIP(proxyRotationState.currentProxy);
  console.log(`  🔄 Rate limit exceeded - Rotate sang proxy ${proxyRotationState.currentProxyIndex + 1}/${shuffledProxyList.length}: ${proxyRotationState.currentProxy}`);
  if (proxyIP) {
    console.log(`  📍 Proxy IP: ${proxyIP}`);
  }
  return true; // Đã rotate thành công
}

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
 * Reset proxy rotation state (khi bắt đầu một round mới)
 * Shuffle PROXY_LIST trước khi bắt đầu
 */
function resetProxyRotation() {
  // Shuffle PROXY_LIST nếu có
  if (USE_PROXY_FROM_CONFIG && PROXY_LIST && PROXY_LIST.length > 0) {
    shuffledProxyList = shuffleArray(PROXY_LIST);
    console.log(`  🔀 Đã shuffle ${shuffledProxyList.length} proxy trước khi bắt đầu`);
  } else {
    shuffledProxyList = [];
  }
  
  proxyRotationState = {
    currentProxyIndex: 0,
    accountsUsedWithCurrentProxy: 0,
    currentProxy: null
  };
}

/**
 * Reset no proxy state (khi bắt đầu một round mới hoặc sau khi đợi)
 */
function resetNoProxyState() {
  noProxyState = {
    accountsUsed: 0
  };
}

/**
 * Kiểm tra và đợi nếu cần (khi không dùng proxy và đã đạt MAX_ACCOUNTS_PER_IP)
 */
async function checkAndWaitIfNeeded() {
  // Chỉ áp dụng khi không dùng proxy từ config (USE_PROXY_FROM_CONFIG = false)
  if (USE_PROXY_FROM_CONFIG) {
    return; // Đang dùng proxy từ config, không cần đợi
  }
  
  // Nếu đã đạt MAX_ACCOUNTS_PER_IP, đợi LIMIT_WAITING phút
  if (noProxyState.accountsUsed >= MAX_ACCOUNTS_PER_IP) {
    const waitMinutes = LIMIT_WAITING;
    const waitMs = waitMinutes * 60 * 1000; // Chuyển phút sang milliseconds
    
    console.log(`\n  ⏳ Đã đạt ${MAX_ACCOUNTS_PER_IP} accounts, đợi ${waitMinutes} phút trước khi tiếp tục...`);
    console.log(`  ⏰ Bắt đầu đợi lúc: ${new Date().toLocaleTimeString()}`);
    
    await delay(waitMs);
    
    console.log(`  ✓ Đã đợi xong, tiếp tục mint...`);
    
    // Reset counter sau khi đợi
    resetNoProxyState();
  }
}

/**
 * Tăng số account đã dùng khi không dùng proxy
 */
function incrementNoProxyUsage() {
  // Chỉ tăng khi không dùng proxy từ config (USE_PROXY_FROM_CONFIG = false)
  if (!USE_PROXY_FROM_CONFIG) {
    noProxyState.accountsUsed++;
  }
}


/**
 * Tạo fetch options với proxy nếu có
 */
async function getFetchOptions(account) {
  const proxy = getProxyForAccount(account);
  const requestOptions = await buildRequestOptions(account, proxy);
  return requestOptions;
}

/**
 * Retry fetch với proxy mới nếu gặp lỗi proxy
 */
async function fetchWithProxyRetry(url, options, account, maxRetries = shuffledProxyList.length || 1) {
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const proxy = getProxyForAccount(account);
      const fetchOptions = await buildRequestOptions(account, proxy, options.headers || {});
      
      // Check IP để verify proxy (chỉ khi có proxy)
      // if (proxy && attempt === 0) {
      //   try {
      //     const currentIP = await checkIP(proxy);
      //     const proxyIP = extractProxyIP(proxy);
      //     console.log(`  🌐 IP hiện tại qua proxy: ${currentIP}`);
      //     if (proxyIP && currentIP === proxyIP) {
      //       console.log(`  ✓ Proxy IP khớp với IP thực tế`);
      //     } else if (proxyIP) {
      //       console.log(`  ⚠ Proxy IP (${proxyIP}) khác với IP thực tế (${currentIP})`);
      //     }
      //   } catch (ipError) {
      //     console.log(`  ⚠ Không thể check IP: ${ipError.message}`);
      //   }
      // }
      
      // Merge headers đúng cách (nếu options đã có headers)
      const mergedOptions = {
        ...options,
        ...fetchOptions
      };
      
      // Merge headers nếu cả hai đều có headers
      if (options.headers && fetchOptions.headers) {
        mergedOptions.headers = {
          ...options.headers,
          ...fetchOptions.headers
        };
      } else if (fetchOptions.headers) {
        mergedOptions.headers = fetchOptions.headers;
      }
      
      const response = await fetchWithProxy(url, mergedOptions);
      
      return response;
    } catch (error) {
      lastError = error;
      
      // Kiểm tra xem có phải lỗi proxy không
      if (isProxyError(error) && USE_PROXY_FROM_CONFIG && shuffledProxyList && shuffledProxyList.length > 0) {
        // Rotate sang proxy tiếp theo
        const hasMoreProxies = forceRotateProxy();
        if (hasMoreProxies && attempt < maxRetries - 1) {
          console.log(`  ⚠ Proxy error: ${error.message} - Đang thử lại với proxy tiếp theo...`);
          // Tiếp tục thử với proxy mới
          continue;
        }
      }
      
      // Nếu không phải lỗi proxy hoặc đã thử hết proxy, throw error
      throw error;
    }
  }
  
  // Nếu đã thử hết mà vẫn lỗi
  throw lastError;
}

/**
 * Tạo post trên Moltbook
 */
async function createPost(apiKey, account, originalBody = null) {
  try {
    let body;
    
    // Nếu có originalBody (gửi lại với verify), sử dụng nó
    if (originalBody) {
      body = originalBody;
    } else {
      // Tạo body mới
      const title = `MBC-20 Mint: CLAW ${generateRandomCharacters()}`;
      const content = getPostContent();
      
      body = {
        submolt: "general",
        title: title,
        content: content
      };
    }
    
    const response = await fetchWithProxyRetry(POST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }, account);

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMsg = (data.error || data.message || '').toLowerCase();
      const isSuspended = errorMsg.includes('suspended') || errorMsg.includes('account suspended');
      const isBlocked = errorMsg.includes('blocked') || errorMsg.includes('account blocked') || errorMsg.includes('block');
      
      // Lưu toàn bộ data vào error để catch block có thể sử dụng
      const error = new Error(data.error || `HTTP ${response.status}: ${data.message || 'Unknown error'}`);
      error.fullResponse = data; // Lưu toàn bộ response data
      throw error;
    }

    return { data, body };
  } catch (error) {
    // Giữ nguyên fullResponse nếu có, để catch block của postToAllAccounts có thể sử dụng
    const newError = new Error(`Post failed: ${error.message}`);
    if (error.fullResponse) {
      newError.fullResponse = error.fullResponse;
    }
    throw newError;
  }
}

/**
 * Delay function
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verify post với câu trả lời
 */
async function verifyPost(apiKey, verificationCode, answer, account = null) {
  try {
    const response = await fetchWithProxyRetry(VERIFY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        verification_code: verificationCode,
        answer: answer
      })
    }, account);
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}: ${data.message || 'Unknown error'}`);
    }
    
    return data;
  } catch (error) {
    throw new Error(`Verify failed: ${error.message}`);
  }
}

/**
 * Index post sau khi đã post thành công
 */
async function indexPost(postId, account = null) {
  try {
    const response = await fetchWithProxyRetry(`${INDEX_POST_API_URL}?id=${postId}`, {
      method: 'GET',
      headers: {}
    }, account);
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}: ${data.message || 'Unknown error'}`);
    }
    
    return data;
  } catch (error) {
    throw new Error(`Index post failed: ${error.message}`);
  }
}

/**
 * Post cho tất cả accounts
 */
async function postToAllAccounts(accounts, iteration = 1) {
  const results = [];
  let successCount = 0;
  let failCount = 0;
  let rateLimitExceeded = false; // Flag để track rate limit exceeded

  if (iteration > 1) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Lần mint thứ ${iteration}`);
    console.log(`${'='.repeat(50)}`);
  }

  // Đếm số account theo từng loại trước khi bắt đầu
  const currentTimestamp = Math.floor(Date.now() / 1000);
  let eligibleCount = 0; // Account đủ điều kiện mint
  let bannedCount = 0; // Account bị khoá (status = 0)
  let delayCount = 0; // Account chưa đủ thời gian mint
  
  for (const account of accounts) {
    if (account.status !== 1) {
      bannedCount++;
      continue;
    }
    
    // Kiểm tra delay
    const delayMinutes = account.delay !== undefined ? account.delay : 120;
    const delaySeconds = delayMinutes * 60;
    const lastPost = account.last_post || 0;
    
    if (lastPost > 0) {
      const timeSinceLastPost = currentTimestamp - lastPost;
      if (timeSinceLastPost < delaySeconds) {
        delayCount++;
        continue;
      }
    }
    
    eligibleCount++;
  }
  
  // Hiển thị tổng kết
  console.log(`\n📊 Tổng kết accounts:`);
  console.log(`   ✓ Đủ điều kiện mint: ${eligibleCount}/${accounts.length}`);
  console.log(`   🔒 Bị khoá (status = 0): ${bannedCount}`);
  console.log(`   ⏳ Chưa đủ thời gian mint: ${delayCount}`);
  console.log('');
  
  // Post từng tài khoản
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    
    // Chỉ xử lý account có status = 1
    if (account.status !== 1) {
      continue;
    }
    
    // Kiểm tra delay - nếu chưa đủ thời gian thì bỏ qua
    const delayMinutes = account.delay !== undefined ? account.delay : 120; // Mặc định 120 phút
    const delaySeconds = delayMinutes * 60; // Chuyển từ phút sang giây
    const lastPost = account.last_post || 0;
    
    if (lastPost > 0) {
      const timeSinceLastPost = currentTimestamp - lastPost;
      if (timeSinceLastPost < delaySeconds) {
        continue; // Bỏ qua không in ra console
      }
    }
    
    // Kiểm tra và đợi nếu cần (khi không dùng proxy và đã đạt MAX_ACCOUNTS_PER_IP)
    await checkAndWaitIfNeeded();
    
    console.log(`[${i + 1}/${accounts.length}]Bắt đầu mint ở tài khoản ${account.name}...`);
    
    // Hiển thị thông báo nếu đang sử dụng proxy
    const currentProxy = getProxyForAccount(account);
    if (currentProxy) {
      const proxyIP = extractProxyIP(currentProxy);
      console.log(`  🔄 Đang sử dụng Proxy: ${currentProxy}`);
      if (proxyIP) {
        console.log(`  📍 Proxy IP: ${proxyIP}`);
      }
    }
    
    // Hỏi user xác nhận trước khi post (chỉ khi không dùng AI)
    if (!USE_AI || !OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
      const confirm = await askQuestion(`  ➤ Nhấn Enter để post (hoặc nhập bất kỳ để bỏ qua): `);
      
      if (confirm.trim() !== '') {
        console.log(`  ⚠ Đã bỏ qua ${account.name}`);
        continue;
      }
    }

    // Vòng lặp để thử tất cả proxy nếu gặp rate limit
    let accountProcessed = false;
    let initialProxyIndex = proxyRotationState.currentProxyIndex;
    let proxiesTried = 0;
    const maxProxiesToTry = USE_PROXY_FROM_CONFIG && shuffledProxyList && shuffledProxyList.length > 0 ? shuffledProxyList.length : 1;
    
    while (!accountProcessed && proxiesTried < maxProxiesToTry) {
      try {
        const { data: result, body: originalBody } = await createPost(account.api_key, account);
      
      // Log response vào file log (không print ra console)
      await logToFile(account.name, 'POST_RESPONSE', result);
      
      // Kiểm tra nếu post không thành công
      if (!result.success) {
        // Kiểm tra nếu account bị suspend hoặc blocked
        const errorMsg = (result.error || result.message || '').toLowerCase();
        const isSuspended = errorMsg.includes('suspended') || errorMsg.includes('account suspended');
        const isBlocked = errorMsg.includes('blocked') || errorMsg.includes('account blocked') || errorMsg.includes('block');
        
        if (isSuspended || isBlocked) {
          // Nếu suspended/blocked, throw error với full_response để catch block xử lý (tránh log trùng lặp)
          const error = new Error(result.error || result.message || 'Account suspended');
          error.fullResponse = result; // Lưu full_response vào error để catch block sử dụng
          throw error;
        }
        
        console.log(`\n  ${'='.repeat(60)}`);
        console.log(`  POST FAILED - RESPONSE:`);
        console.log(`  ${'='.repeat(60)}`);
        console.log(JSON.stringify(result, null, 2));
        console.log(`  ${'='.repeat(60)}\n`);
        
        await logToFile(account.name, 'POST_FAILED', {
          reason: 'POST_RESPONSE_FAILED',
          error: result.error || result.message || 'Post failed',
          post_response: result
        });
      }
      
      // Cập nhật last_post ngay khi post được tạo thành công (có post ID)
      const postId = result.post?.id;
      if (postId && result.success !== false) {
        const timestamp = Math.floor(Date.now() / 1000);
        account.last_post = timestamp;
        const accountIndex = accounts.findIndex(acc => acc.name === account.name);
        if (accountIndex >= 0) {
          accounts[accountIndex].last_post = timestamp;
          await saveAccounts(accounts);
          console.log(`  \x1b[32m✓ Đã cập nhật last_post: ${timestamp}\x1b[0m`);
        }
      }
      
      // Kiểm tra nếu cần verification
      if (result.verification_required && result.verification) {
        const verification = result.verification;
        
        // Print challenge và instructions
        console.log(`\n  ${'='.repeat(60)}`);
        console.log(`  VERIFICATION CHALLENGE:`);
        console.log(`  ${'='.repeat(60)}`);
        console.log(`  Challenge: ${verification.challenge}`);
        console.log(`  Instructions: ${verification.instructions}`);
        console.log(`  ${'='.repeat(60)}\n`);
        
        // Tính thời gian còn lại
        const expiresAt = new Date(verification.expires_at);
        const now = new Date();
        const timeLeft = Math.max(0, Math.floor((expiresAt - now) / 1000)); // seconds
        
        console.log(`  ⏰ You have ${timeLeft} seconds to verify to publish!\n`);
        
        let answer = '';
        let isAIAnswer = false;
        
        // Sử dụng AI nếu được bật
        if (USE_AI && OPENAI_API_KEY && OPENAI_API_KEY.trim() !== '') {
          console.log(`  🤖 Đang sử dụng AI để giải challenge...`);
          try {
            answer = await solveChallengeWithAI(verification.challenge, verification.instructions, account.name);
            console.log(`  \x1b[32m✓ AI đã giải được: ${answer}\x1b[0m`);
            isAIAnswer = true;
          } catch (error) {
            console.log(`  ⚠ AI giải thất bại: ${error.message}`);
            console.log(`  ➤ Chuyển sang chế độ nhập tay...`);
            answer = await askQuestion(`  ➤ Nhập đáp án để verify: `);
          }
        } else {
          // Hỏi user nhập câu trả lời
          answer = await askQuestion(`  ➤ Nhập đáp án để verify: `);
        }
        
        if (answer && answer.trim()) {
          // Log user input hoặc AI answer
          await logToFile(account.name, isAIAnswer ? 'AI_INPUT' : 'USER_INPUT', { 
            challenge: verification.challenge,
            answer: answer.trim(),
            verification_code: verification.code,
            is_ai: isAIAnswer
          });
          
          // Gửi verify request
          console.log(`  Đang gửi câu trả lời để verify...`);
          const postId = result.post?.id;
          let verifyResult = null;
          let verifySuccess = false;
          
          try {
            verifyResult = await verifyPost(account.api_key, verification.code, answer.trim(), account);
            verifySuccess = true;
          } catch (verifyError) {
            // Verify thất bại (throw error)
            verifySuccess = false;
            const errorMsg = verifyError.message || 'Unknown error';
            console.log(`  ✖ Verification thất bại: ${errorMsg}`);
            
            // Nếu là AI answer và verify thất bại, update AI stats là failed
            if (isAIAnswer) {
              console.log(`  📊 Updating AI stats: failed (isAIAnswer=${isAIAnswer})`);
              await updateAIStats(false, 'gpt-5.2');
            }
            
            // Log verification thất bại
            await logToFile(account.name, 'POST_FAILED', {
              reason: 'VERIFICATION_FAILED',
              error: errorMsg,
              challenge: verification.challenge,
              answer: answer.trim(),
              verification_code: verification.code,
              is_ai: isAIAnswer
            });
            
            // Index post ngay cả khi verify thất bại (nếu có postId)
            if (postId) {
              console.log(`  ⏳ Đang index mint...`);
              await delay(5000); // Đợi 5 giây trước khi index
              
              try {
                const indexResult = await indexPost(postId, account);
                if (indexResult.success !== false && indexResult.processed) {
                  console.log(`  \x1b[32m✓ Đã index post thành công! Processed: ${indexResult.processed || 'N/A'}\x1b[0m`);
                } else {
                  console.log(`  \x1b[31m✖ Index post thất bại: ${indexResult.error || indexResult.message || 'Unknown error'}\x1b[0m`);
                }
              } catch (indexError) {
                console.log(`  \x1b[31m✖ Lỗi khi index post: ${indexError.message}\x1b[0m`);
              }
            }
            
            results.push({
              account: account.name,
              success: false,
              error: `Verification failed: ${errorMsg}`
            });
            failCount++;
          }
          
          // Nếu verify thành công
          if (verifySuccess && verifyResult) {
            // Log verify response vào file log (không print ra console)
            await logToFile(account.name, 'VERIFY_RESPONSE', verifyResult);
            
            console.log(`  \x1b[32m✓ Verification thành công! Post ID: ${postId}\x1b[0m`);
            
            // Nếu là AI answer và verify thành công, update AI stats là success
            if (isAIAnswer) {
              await updateAIStats(true, 'gpt-5.2');
            }
            
            results.push({
              account: account.name,
              success: true,
              post_id: postId,
              post_url: result.post?.url,
              verification_required: false,
              verified: true
            });
            successCount++;
            
            // last_post đã được cập nhật trước đó khi post được tạo thành công
            
            // Index post sau khi verification thành công
            if (postId) {
              console.log(`  ⏳ Đang index post...`);
              await delay(5000); // Đợi 5 giây trước khi index
              
              try {
                const indexResult = await indexPost(postId, account);
                if (indexResult.success !== false && indexResult.processed) {
                  console.log(`  \x1b[32m✓ Đã index post thành công! Processed: ${indexResult.processed || 'N/A'}\x1b[0m`);
                } else {
                  console.log(`  \x1b[31m✖ Index post thất bại: ${indexResult.error || indexResult.message || 'Unknown error'}\x1b[0m`);
                }
              } catch (indexError) {
                console.log(`  \x1b[31m✖ Lỗi khi index post: ${indexError.message}\x1b[0m`);
              }
            }
          }
        } else {
          console.log(`  ⚠ Bỏ qua verification (không có câu trả lời)`);
          const postId = result.post?.id;
          const isSuccess = result.success || false;
          
          // Log nếu post thất bại do bỏ qua verification
          if (!isSuccess) {
            console.log(`\n  ${'='.repeat(60)}`);
            console.log(`  POST FAILED (VERIFICATION SKIPPED) - RESPONSE:`);
            console.log(`  ${'='.repeat(60)}`);
            console.log(JSON.stringify(result, null, 2));
            console.log(`  ${'='.repeat(60)}\n`);
            
            await logToFile(account.name, 'POST_FAILED', {
              reason: 'VERIFICATION_SKIPPED',
              error: 'User skipped verification or no answer provided',
              post_response: result
            });
          }
          
          results.push({
            account: account.name,
            success: isSuccess,
            post_id: postId,
            post_url: result.post?.url,
            verification_required: true,
            verified: false
          });
          if (isSuccess) {
            successCount++;
          } else {
            failCount++;
          }
        }
      } else {
        // Không cần verification, xử lý bình thường
        const postId = result.post?.id;
        const isSuccess = result.success !== false && postId; // Kiểm tra cả success và postId
        
        if (isSuccess) {
          console.log(`  \x1b[32m✓ Thành công! Post ID: ${postId}\x1b[0m`);
          
          // Index post sau khi post thành công (không cần verification)
          if (postId) {
            console.log(`  ⏳ Đang index post...`);
            await delay(5000); // Đợi 5 giây trước khi index
            
            try {
              const indexResult = await indexPost(postId, account);
              if (indexResult.success !== false && indexResult.processed) {
                console.log(`  \x1b[32m✓ Đã index post thành công! Processed: ${indexResult.processed || 'N/A'}\x1b[0m`);
              } else {
                console.log(`  \x1b[31m✖ Index post thất bại: ${indexResult.error || indexResult.message || 'Unknown error'}\x1b[0m`);
              }
            } catch (indexError) {
              console.log(`  \x1b[31m✖ Lỗi khi index post: ${indexError.message}\x1b[0m`);
            }
          }
        } else {
          console.log(`  ✖ Post không thành công`);
          
          // Print toàn bộ response
          console.log(`\n  ${'='.repeat(60)}`);
          console.log(`  POST FAILED (NO VERIFICATION) - RESPONSE:`);
          console.log(`  ${'='.repeat(60)}`);
          console.log(JSON.stringify(result, null, 2));
          console.log(`  ${'='.repeat(60)}\n`);
          
          // Log post thất bại
          await logToFile(account.name, 'POST_FAILED', {
            reason: 'POST_NO_VERIFICATION_FAILED',
            error: result.error || result.message || 'Post failed without verification',
            post_response: result
          });
        }
        
        results.push({
          account: account.name,
          success: isSuccess,
          post_id: postId,
          post_url: result.post?.url,
          verification_required: result.verification_required || false
        });
        
        if (isSuccess) {
          successCount++;
        } else {
          failCount++;
        }
        
        // last_post đã được cập nhật trước đó khi post được tạo thành công
      }
      
        // Đánh dấu account đã được xử lý thành công
        accountProcessed = true;
        proxiesTried++;
        
        // Tăng số account đã dùng với proxy hiện tại (sau khi xử lý xong account)
        incrementProxyUsage();
        
        // Tăng số account đã dùng khi không dùng proxy (sau khi xử lý xong account)
        incrementNoProxyUsage();
      } catch (error) {
        // Kiểm tra nếu gặp lỗi Rate limit exceeded
        const errorMsg = error.message.toLowerCase();
        const isRateLimitExceeded = errorMsg.includes('rate limit exceeded');
        
        if (isRateLimitExceeded) {
          console.log(`\n  \x1b[31m✖ Lỗi: Rate limit exceeded (proxy ${proxyRotationState.currentProxyIndex + 1}/${shuffledProxyList.length})\x1b[0m`);
          await logToFile(account.name, 'RATE_LIMIT_EXCEEDED', {
            account_name: account.name,
            timestamp: getLocalTimeString(),
            error: error.message,
            iteration: iteration,
            proxy_index: proxyRotationState.currentProxyIndex,
            proxies_tried: proxiesTried
          });
          
          // Set flag để track
          rateLimitExceeded = true;
          proxiesTried++;
          
          // Nếu đang dùng proxy và còn proxy để thử, rotate sang proxy tiếp theo
          if (USE_PROXY_FROM_CONFIG && shuffledProxyList && shuffledProxyList.length > 0 && proxiesTried < maxProxiesToTry) {
            const hasMoreProxies = forceRotateProxy();
            if (hasMoreProxies) {
              // Kiểm tra proxy mới đã được set chưa
              // const newProxy = getProxyForAccount(account);
              // const newProxyIP = extractProxyIP(newProxy);
              console.log(`  ⏳ Đang thử lại với proxy tiếp theo (${proxiesTried}/${maxProxiesToTry})...`);
              // console.log(`  🔍 Debug: Proxy mới sẽ được sử dụng: ${newProxyIP || 'N/A'}`);
              // Tiếp tục vòng lặp while để thử lại với proxy mới
              continue;
            }
          }
          
          // Nếu đã thử hết proxy hoặc không dùng proxy, xử lý theo logic cũ
          if (USE_PROXY_FROM_CONFIG && shuffledProxyList && shuffledProxyList.length > 0) {
            // Đã thử hết proxy, bỏ qua account này
            console.log(`  ⚠ Đã thử hết tất cả ${maxProxiesToTry} proxy, bỏ qua account này`);
            results.push({
              account: account.name,
              success: false,
              error: `Rate limit exceeded on all proxies`
            });
            failCount++;
            accountProcessed = true; // Đánh dấu đã xử lý (thất bại)
          } else {
            // Không dùng proxy, đợi LIMIT_WAITING phút
            const waitMinutes = LIMIT_WAITING;
            const waitMs = waitMinutes * 60 * 1000; // Chuyển phút sang milliseconds
            
            console.log(`  ⏳ Không dùng proxy - Đợi ${waitMinutes} phút trước khi tiếp tục...`);
            console.log(`  ⏰ Bắt đầu đợi lúc: ${new Date().toLocaleTimeString()}`);
            
            await delay(waitMs);
            
            console.log(`  ✓ Đã đợi xong, tiếp tục mint...`);
            
            // Reset no proxy state sau khi đợi
            resetNoProxyState();
            
            results.push({
              account: account.name,
              success: false,
              error: error.message
            });
            failCount++;
            accountProcessed = true; // Đánh dấu đã xử lý (sau khi đợi)
          }
        } else {
          // Không phải rate limit, xử lý các lỗi khác
          // Kiểm tra nếu account bị suspend hoặc blocked
      const isSuspended = errorMsg.includes('suspended') || errorMsg.includes('account suspended');
      const isBlocked = errorMsg.includes('blocked') || errorMsg.includes('account blocked') || errorMsg.includes('block');
      
      if (isSuspended || isBlocked) {
        const reason = isSuspended ? 'SUSPENDED' : 'BLOCKED';
        console.log(`  ⚠ Account bị ${reason.toLowerCase()}, tự động tắt (status = 0)...`);
        
        // Lưu full_response (ưu tiên từ error.fullResponse, sau đó từ error.response, cuối cùng là error message)
        let fullResponse = { error: error.message };
        if (error.fullResponse) {
          // Sử dụng toàn bộ response data từ error
          fullResponse = error.fullResponse;
        } else if (error.response) {
          // Nếu có response object, lấy toàn bộ JSON
          const errorData = await error.response.json().catch(() => null);
          if (errorData) {
            fullResponse = errorData;
          }
        }
        
        // Chỉ log một lần với full_response và thông tin account
        await logToFile(account.name, `ACCOUNT_${reason}`, {
          account_name: account.name,
          timestamp: getLocalTimeString(),
          full_response: fullResponse
        });
        
        const accountIndex = accounts.findIndex(acc => acc.name === account.name);
        if (accountIndex >= 0) {
          accounts[accountIndex].status = 0;
          accounts[accountIndex].status_updated_at = getLocalTimeString();
          accounts[accountIndex].status_hint = fullResponse.hint || fullResponse.error || null;
          
          // Parse thời gian kết thúc suspension từ hint
          if (accounts[accountIndex].status_hint) {
            const suspensionEndTime = parseSuspensionEndTime(accounts[accountIndex].status_hint);
            if (suspensionEndTime) {
              accounts[accountIndex].suspension_ends_at = suspensionEndTime; // Lưu dưới dạng ISO string
              const endDate = new Date(suspensionEndTime);
              console.log(`  ⏰ Suspension sẽ kết thúc lúc: ${endDate.toLocaleString()}`);
            }
          }
          
          await saveAccounts(accounts);
          console.log(`  \x1b[32m✓ Đã tự động set status = 0 cho ${account.name}\x1b[0m`);
          if (accounts[accountIndex].status_hint) {
            console.log(`  📝 Hint: ${accounts[accountIndex].status_hint}`);
          }
        }
        } else {
          // Chỉ log ERROR nếu không phải suspended/blocked
          await logToFile(account.name, 'ERROR', { error: error.message, stack: error.stack });
        }
        
        results.push({
          account: account.name,
          success: false,
          error: error.message
        });
        failCount++;
        console.log(`  ✖ Lỗi: ${error.message}`);
        
        // Đánh dấu account đã được xử lý (thất bại)
        accountProcessed = true;
        
        // Tăng số account đã dùng với proxy hiện tại (ngay cả khi có lỗi)
        incrementProxyUsage();
        
        // Tăng số account đã dùng khi không dùng proxy (ngay cả khi có lỗi)
        incrementNoProxyUsage();
        }
      }
    }
    
    // Delay 5 giây giữa các account
    if (i < accounts.length - 1) {
      await delay(5000); // 5 giây delay
    }
    
    // Phân cách giữa các tài khoản
    if (i < accounts.length - 1) {
      console.log(`\n${'─'.repeat(70)}\n`);
    }
  }

  // Tổng số lần đã post (thành công + thất bại)
  const totalPosts = successCount + failCount;
  
  // Load và lưu AI stats vào log (không hiển thị console)
  if (USE_AI && OPENAI_API_KEY && OPENAI_API_KEY.trim() !== '') {
    try {
      const aiStats = await loadAIStats();
      if (aiStats && aiStats.total_attempts > 0) {
        await logToFile('SYSTEM', 'AI_STATS', {
          model: aiStats.model,
          total_attempts: aiStats.total_attempts,
          successful_attempts: aiStats.successful_attempts,
          failed_attempts: aiStats.failed_attempts,
          success_rate: aiStats.success_rate,
          last_updated: aiStats.last_updated
        });
      }
    } catch (error) {
      // Ignore error, chỉ log nếu có lỗi
      await logToFile('SYSTEM', 'AI_STATS_ERROR', { error: error.message });
    }
  }
  
  // Tổng kết
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Tổng kết lần ${iteration}:`);
  if (rateLimitExceeded) {
    console.log(`  \x1b[33m⚠ Đã gặp Rate limit exceeded (đã xử lý: rotate proxy hoặc đợi)\x1b[0m`);
  }
  if (totalPosts > 0) {
    console.log(`  \x1b[32m✓ Thành công: ${successCount}/${totalPosts}\x1b[0m`);
    console.log(`  \x1b[31m✖ Thất bại: ${failCount}/${totalPosts}\x1b[0m`);
  } else {
    console.log(`  ℹ Không có post nào được thực hiện (tất cả account đều bị bỏ qua do delay hoặc status)`);
  }
  console.log(`${'='.repeat(50)}\n`);

  return { results, successCount, failCount, rateLimitExceeded };
}

/**
 * Main function
 */
async function main() {
  try {
    // Đọc tham số từ CLI (số phút lặp lại)
    const repeatMinutes = process.argv[2] ? parseFloat(process.argv[2]) : null;

    // Đọc danh sách tài khoản
    const accounts = await loadAccounts();
    
    if (accounts.length === 0) {
      console.error('✖ Không có tài khoản nào trong file!');
      console.error(`  Hãy chạy: node register_moltbook.js để đăng ký tài khoản trước.`);
      process.exit(1);
    }

    // Đếm số account theo từng loại
    const currentTimestamp = Math.floor(Date.now() / 1000);
    let eligibleCount = 0;
    let bannedCount = 0;
    let delayCount = 0;
    
    for (const account of accounts) {
      if (account.status !== 1) {
        bannedCount++;
        continue;
      }
      
      const delayMinutes = account.delay !== undefined ? account.delay : 120;
      const delaySeconds = delayMinutes * 60;
      const lastPost = account.last_post || 0;
      
      if (lastPost > 0) {
        const timeSinceLastPost = currentTimestamp - lastPost;
        if (timeSinceLastPost < delaySeconds) {
          delayCount++;
          continue;
        }
      }
      
      eligibleCount++;
    }
    
    // Hiển thị tổng kết
    console.log(`\n📊 Tổng kết accounts:`);
    console.log(`   ✓ Đủ điều kiện mint: ${eligibleCount}/${accounts.length}`);
    console.log(`   🔒 Bị khoá (status = 0): ${bannedCount}`);
    console.log(`   ⏳ Chưa đủ thời gian mint: ${delayCount}`);
    console.log('');


    if (repeatMinutes && repeatMinutes > 0) {
      const repeatMs = repeatMinutes * 60 * 1000; // Chuyển phút sang milliseconds
      console.log(`\nChế độ lặp lại: Mỗi ${repeatMinutes} phút`);
      console.log(`Nhấn Ctrl+C để dừng\n`);

      let iteration = 1;
      let totalSuccess = 0;
      let totalFail = 0;

      // Vòng lặp vô hạn
      while (true) {
        // Reset proxy rotation khi bắt đầu round mới
        resetProxyRotation();
        // Reset no proxy state khi bắt đầu round mới
        resetNoProxyState();
        
        const { successCount, failCount, rateLimitExceeded } = await postToAllAccounts(accounts, iteration);
        totalSuccess += successCount;
        totalFail += failCount;

        // Nếu rate limit exceeded, đã được xử lý trong vòng hiện tại (rotate proxy hoặc đợi)
        if (rateLimitExceeded) {
          console.log(`\x1b[33mℹ Rate limit exceeded đã được xử lý ở vòng ${iteration}, tiếp tục vòng ${iteration + 1} sau ${repeatMinutes} phút...\x1b[0m\n`);
        }

        // Tính thời gian chờ đến lần tiếp theo
        const nextTime = new Date(Date.now() + repeatMs);
        console.log(`Chờ đến ${nextTime.toLocaleTimeString()} để mint tiếp...`);
        console.log(`Tổng cộng: \x1b[32m✓ ${totalSuccess} thành công\x1b[0m, ✖ ${totalFail} thất bại\n`);

        // Delay trước lần mint tiếp theo
        await delay(repeatMs);
        iteration++;
      }
    } else {
      // Chạy 1 lần như bình thường
      // Reset proxy rotation khi bắt đầu
      resetProxyRotation();
      // Reset no proxy state khi bắt đầu
      resetNoProxyState();
      
      console.log(`\nĐang post cho ${eligibleCount} tài khoản...\n`);
      await postToAllAccounts(accounts, 1);
    }

  } catch (error) {
    if (error.message.includes('SIGINT') || error.message.includes('SIGTERM')) {
      console.log('\n\nĐã dừng mint.');
      process.exit(0);
    }
    console.error('\n✖ Lỗi:', error.message);
    process.exit(1);
  }
}

// Xử lý Ctrl+C để dừng gracefully
process.on('SIGINT', () => {
  console.log('\n\nĐang dừng...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nĐang dừng...');
  process.exit(0);
});

// Chạy script
main();

