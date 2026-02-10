import { readFile, writeFile, appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';
import { mint_data, USE_AI, OPENAI_API_KEY, DELAY_AFTER_DAY } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ACCOUNTS_FILE = `${__dirname}/moltbook_accounts.json`;
const POST_API_URL = 'https://www.moltbook.com/api/v1/posts';
const INDEX_POST_API_URL = 'https://mbc20.xyz/api/index-post';
const VERIFY_API_URL = 'https://www.moltbook.com/api/v1/verify';

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
  try {
    if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
      throw new Error('OpenAI API key chưa được cấu hình');
    }

    const prompt = `Challenge: ${challenge}
Instructions: ${instructions}`;

    const requestBody = {
      model: 'gpt-5.2',
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

    return formattedAnswer;
  } catch (error) {
    // Log lỗi nếu có
    await logToFile(accountName || 'AI', 'AI_ERROR', {
      challenge: challenge,
      instructions: instructions,
      error: error.message
    });
    
    throw new Error(`AI solve failed: ${error.message}`);
  }
}

/**
 * Format local time string
 */
function getLocalTimeString() {
  const now = new Date();
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
    
    const response = await fetch(POST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

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
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        verification_code: verificationCode,
        answer: answer
      })
    };
    
    // Sử dụng proxy nếu account có cấu hình
    if (account && account.using_proxy === 1 && account.proxy) {
      const { HttpsProxyAgent } = await import('https-proxy-agent');
      const proxyAgent = new HttpsProxyAgent(account.proxy);
      fetchOptions.agent = proxyAgent;
    }
    
    const response = await fetch(VERIFY_API_URL, fetchOptions);
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
    const fetchOptions = {};
    
    // Sử dụng proxy nếu account có cấu hình
    if (account && account.using_proxy === 1 && account.proxy) {
      const { HttpsProxyAgent } = await import('https-proxy-agent');
      const proxyAgent = new HttpsProxyAgent(account.proxy);
      fetchOptions.agent = proxyAgent;
    }
    
    const response = await fetch(`${INDEX_POST_API_URL}?id=${postId}`, fetchOptions);
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
    const currentTimestamp = Math.floor(Date.now() / 1000); // Unix timestamp hiện tại (giây)
    const lastPost = account.last_post || 0;
    
    if (lastPost > 0) {
      const timeSinceLastPost = currentTimestamp - lastPost;
      if (timeSinceLastPost < delaySeconds) {
        const remainingMinutes = Math.ceil((delaySeconds - timeSinceLastPost) / 60);
        console.log(`[${i + 1}/${accounts.length}] Bỏ qua ${account.name} (chưa đủ delay, còn ${remainingMinutes} phút)`);
        continue;
      }
    }
    
    console.log(`[${i + 1}/${accounts.length}]Bắt đầu mint ở tài khoản ${account.name}...`);
    
    // Hỏi user xác nhận trước khi post (chỉ khi không dùng AI)
    if (!USE_AI || !OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
      const confirm = await askQuestion(`  ➤ Nhấn Enter để post (hoặc nhập bất kỳ để bỏ qua): `);
      
      if (confirm.trim() !== '') {
        console.log(`  ⚠ Đã bỏ qua ${account.name}`);
        continue;
      }
    }

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
          const verifyResult = await verifyPost(account.api_key, verification.code, answer.trim(), account);
          
          // Log verify response vào file log (không print ra console)
          await logToFile(account.name, 'VERIFY_RESPONSE', verifyResult);
          
          const postId = result.post?.id;
          
          if (verifyResult.success) {
            console.log(`  \x1b[32m✓ Verification thành công! Post ID: ${postId}\x1b[0m`);
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
          } else {
            const errorMsg = verifyResult.error || verifyResult.message || 'Unknown error';
            console.log(`  ✖ Verification thất bại: ${errorMsg}`);
            
            // Print toàn bộ verify response
            console.log(`\n  ${'='.repeat(60)}`);
            console.log(`  VERIFICATION FAILED - RESPONSE:`);
            console.log(`  ${'='.repeat(60)}`);
            console.log(JSON.stringify(verifyResult, null, 2));
            console.log(`  ${'='.repeat(60)}\n`);
            
            // Log verification thất bại
            await logToFile(account.name, 'POST_FAILED', {
              reason: 'VERIFICATION_FAILED',
              error: errorMsg,
              challenge: verification.challenge,
              answer: answer.trim(),
              verification_code: verification.code,
              verify_response: verifyResult
            });
            
            results.push({
              account: account.name,
              success: false,
              error: `Verification failed: ${errorMsg}`
            });
            failCount++;
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
    } catch (error) {
      // Kiểm tra nếu gặp lỗi Rate limit exceeded
      const errorMsg = error.message.toLowerCase();
      const isRateLimitExceeded = errorMsg.includes('rate limit exceeded');
      
      if (isRateLimitExceeded) {
        console.log(`\n  \x1b[31m✖ Lỗi: Rate limit exceeded - Dừng vòng mint hiện tại\x1b[0m`);
        await logToFile(account.name, 'RATE_LIMIT_EXCEEDED', {
          account_name: account.name,
          timestamp: getLocalTimeString(),
          error: error.message,
          iteration: iteration
        });
        rateLimitExceeded = true;
        results.push({
          account: account.name,
          success: false,
          error: error.message
        });
        failCount++;
        console.log(`\n${'='.repeat(50)}`);
        console.log(`\x1b[31m✖ Vòng mint ${iteration} đã dừng do Rate limit exceeded\x1b[0m`);
        console.log(`${'='.repeat(50)}\n`);
        break; // Dừng vòng lặp hiện tại
      }
      
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
    }
    
    // Delay 12 giây giữa các account
    if (i < accounts.length - 1) {
      await delay(12000); // 12 giây delay
    }
    
    // Phân cách giữa các tài khoản
    if (i < accounts.length - 1) {
      console.log(`\n${'─'.repeat(70)}\n`);
    }
  }

  // Tổng số lần đã post (thành công + thất bại)
  const totalPosts = successCount + failCount;
  
  // Tổng kết
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Tổng kết lần ${iteration}:`);
  if (rateLimitExceeded) {
    console.log(`  \x1b[31m⚠ Vòng mint đã dừng do Rate limit exceeded\x1b[0m`);
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

    // Lọc các account active (status === 1)
    const activeAccounts = accounts.filter(acc => acc.status === 1);
    const inactiveCount = accounts.length - activeAccounts.length;
    
    console.log(`\nTìm thấy ${activeAccounts.length} tài khoản (status = 1):`);
    activeAccounts.forEach((acc, index) => {
      console.log(`  ${index + 1}. ${acc.name}`);
    });
    
    if (inactiveCount > 0) {
      console.log(`\n⚠ ${inactiveCount} tài khoản khác sẽ bị bỏ qua (status ≠ 1)`);
    }
    console.log(`\x1b[32m✓ ${activeAccounts.length} tài khoản sẽ được post\x1b[0m`);


    if (repeatMinutes && repeatMinutes > 0) {
      const repeatMs = repeatMinutes * 60 * 1000; // Chuyển phút sang milliseconds
      console.log(`\nChế độ lặp lại: Mỗi ${repeatMinutes} phút`);
      console.log(`Nhấn Ctrl+C để dừng\n`);

      let iteration = 1;
      let totalSuccess = 0;
      let totalFail = 0;

      // Vòng lặp vô hạn
      while (true) {
        const { successCount, failCount, rateLimitExceeded } = await postToAllAccounts(accounts, iteration);
        totalSuccess += successCount;
        totalFail += failCount;

        // Nếu rate limit exceeded, vẫn tiếp tục vòng sau
        if (rateLimitExceeded) {
          console.log(`\x1b[33m⚠ Rate limit exceeded ở vòng ${iteration}, sẽ tiếp tục vòng ${iteration + 1} sau ${repeatMinutes} phút...\x1b[0m\n`);
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
      console.log(`\nĐang post cho ${activeAccounts.length} tài khoản...\n`);
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

