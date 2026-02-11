import { ProxyAgent } from 'proxy-agent';
import { fetch as undiciFetch, Agent as UndiciAgent, ProxyAgent as UndiciProxyAgent } from 'undici';
import { USE_PROXY_FROM_CONFIG, PROXY_LIST } from './config.js';

/**
 * Danh sách User-Agents phổ biến
 */
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
];

/**
 * Lấy random User-Agent
 */
export function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Extract IP từ proxy URL
 * Format: http://username:password@host:port hoặc http://host:port
 */
export function extractProxyIP(proxyUrl) {
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
 * Kiểm tra xem lỗi có phải do proxy die không
 */
export function isProxyError(error) {
  if (!error) return false;
  
  const errorMsg = (error.message || '').toLowerCase();
  const errorCode = error.code || '';
  
  // Các lỗi network/proxy phổ biến
  const proxyErrorPatterns = [
    'econnrefused',
    'etimedout',
    'enotfound',
    'econnreset',
    'proxy',
    'connection refused',
    'connection timeout',
    'network',
    'socket',
    'getaddrinfo',
    'eai_again',
    'eproto',
    'ehostunreach'
  ];
  
  // Kiểm tra error code
  if (errorCode && proxyErrorPatterns.some(pattern => errorCode.toLowerCase().includes(pattern))) {
    return true;
  }
  
  // Kiểm tra error message
  if (errorMsg && proxyErrorPatterns.some(pattern => errorMsg.includes(pattern))) {
    return true;
  }
  
  return false;
}

/**
 * Build request options với proxy, user-agent và custom headers
 * @param {Object} account - Account object (có thể có proxy riêng)
 * @param {string} proxyUrl - Proxy URL (nếu có, sẽ override account proxy)
 * @param {Object} customHeaders - Custom headers để merge vào
 * @returns {Promise<Object>} Fetch options object
 */
export async function buildRequestOptions(account = null, proxyUrl = null, customHeaders = {}) {
  const options = {
    headers: {
      'User-Agent': getRandomUserAgent(),
      ...customHeaders
    }
  };
  
  // Xác định proxy để sử dụng
  let proxy = proxyUrl;
  
  // Nếu không có proxyUrl, kiểm tra account
  if (!proxy && account) {
    // Nếu account có cấu hình proxy riêng và using_proxy = 1, ưu tiên dùng proxy của account
    if (account.using_proxy === 1 && account.proxy) {
      proxy = account.proxy;
    }
    // Nếu không có proxy từ account và đang dùng proxy từ config
    else if (USE_PROXY_FROM_CONFIG && PROXY_LIST && PROXY_LIST.length > 0) {
      // Lấy proxy từ config (cần được truyền vào từ bên ngoài vì logic rotation nằm ở mint_post.js)
      // Tạm thời return null, sẽ được xử lý ở bên ngoài
      proxy = null;
    }
  }
  
  // Nếu có proxy, tạo ProxyAgent và dispatcher
  if (proxy) {
    // Sử dụng UndiciProxyAgent từ undici thay vì proxy-agent
    // UndiciProxyAgent tương thích tốt hơn với undici fetch
    const proxyAgent = new UndiciProxyAgent(proxy);
    
    // Với Node.js fetch API, cần sử dụng dispatcher từ undici
    options.dispatcher = proxyAgent;
    
    // Debug: Log để kiểm tra proxy có được sử dụng
    // const proxyIP = extractProxyIP(proxy);
    // console.log(`  🔍 [DEBUG] Proxy được sử dụng: ${proxy}`);
    // if (proxyIP) {
    //   console.log(`  🔍 [DEBUG] Proxy IP: ${proxyIP}`);
    // }
    // console.log(`  🔍 [DEBUG] ProxyAgent đã được tạo: ${proxyAgent ? 'YES' : 'NO'}`);
    // console.log(`  🔍 [DEBUG] options.dispatcher có giá trị: ${options.dispatcher ? 'YES' : 'NO'}`);
  }
  // else {
  //   console.log(`  🔍 [DEBUG] Không sử dụng proxy`);
  // }
  
  return options;
}

/**
 * Fetch với retry logic và proxy rotation
 * @param {string} url - URL để fetch
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @param {Object} account - Account object
 * @param {Function} getProxyFn - Function để lấy proxy (có thể rotate)
 * @param {Function} rotateProxyFn - Function để rotate proxy khi gặp lỗi
 * @param {number} maxRetries - Số lần retry tối đa
 * @returns {Promise<Response>} Fetch response
 */
export async function fetchWithRetry(url, options, account = null, getProxyFn = null, rotateProxyFn = null, maxRetries = 1) {
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Lấy proxy hiện tại (có thể thay đổi sau mỗi lần retry)
      let proxy = null;
      if (getProxyFn) {
        proxy = getProxyFn(account);
      } else if (account && account.using_proxy === 1 && account.proxy) {
        proxy = account.proxy;
      } else if (USE_PROXY_FROM_CONFIG && PROXY_LIST && PROXY_LIST.length > 0) {
        // Lấy random proxy từ config
        const randomIndex = Math.floor(Math.random() * PROXY_LIST.length);
        proxy = PROXY_LIST[randomIndex];
      }
      
      // Build request options với proxy
      const requestOptions = await buildRequestOptions(account, proxy, options.headers || {});
      
      // Merge với options gốc (method, body, etc.)
      const mergedOptions = {
        ...options,
        ...requestOptions
      };
      
      // Merge headers đúng cách
      if (options.headers && requestOptions.headers) {
        mergedOptions.headers = {
          ...options.headers,
          ...requestOptions.headers
        };
      }
      
      const response = await fetchWithProxy(url, mergedOptions);
      
      return response;
    } catch (error) {
      lastError = error;
      
      // Kiểm tra xem có phải lỗi proxy không
      if (isProxyError(error) && rotateProxyFn && attempt < maxRetries - 1) {
        // Rotate proxy và thử lại
        rotateProxyFn();
        console.log(`  ⚠ Proxy error: ${error.message} - Đang thử lại với proxy tiếp theo...`);
        continue;
      }
      
      // Nếu không phải lỗi proxy hoặc đã thử hết, throw error
      throw error;
    }
  }
  
  // Nếu đã thử hết mà vẫn lỗi
  throw lastError;
}

/**
 * Check IP hiện tại bằng API ipify
 * @param {string} proxyUrl - Proxy URL (optional, để check IP qua proxy)
 * @returns {Promise<string>} IP address
 */
/**
 * Fetch wrapper - tự động sử dụng undici khi có proxy
 */
export async function fetchWithProxy(url, options = {}) {
  // Nếu có dispatcher (proxy), sử dụng undici fetch
  if (options.dispatcher) {
    return await undiciFetch(url, options);
  }
  // Ngược lại, sử dụng fetch built-in
  return await fetch(url, options);
}

export async function checkIP(proxyUrl = null) {
  try {
    const requestOptions = await buildRequestOptions(null, proxyUrl);
    
    // Sử dụng fetchWithProxy để tự động chọn fetch phù hợp
    const response = await fetchWithProxy('https://ipinfo.io/ip', {
      method: 'GET',
      ...requestOptions
    });
    
    // API ipinfo.io/ip trả về plain text IP, không phải JSON
    const ip = await response.text();
    return ip.trim();
  } catch (error) {
    throw new Error(`Check IP failed: ${error.message}`);
  }
}

