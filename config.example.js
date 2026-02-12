// Cấu hình MBC-20 mint
export const mint_data = `{"p":"mbc-20","op":"mint","tick":"GPT","amt":"100"}`;

// Cấu hình AI (ChatGPT) để tự động trả lời verification
// Đặt USE_AI = true để bật tính năng AI tự động giải challenge
// Nhập OPENAI_API_KEY của bạn (lấy từ https://platform.openai.com/api-keys)
export const USE_AI = false; // Đặt true để bật AI tự động trả lời
export const OPENAI_API_KEY = ''; // Nhập OpenAI API key của bạn

// Cấu hình delay cho đăng ký và sau khi đăng ký
export const DELAY_REGIS = 120; // Delay (phút) khi đăng ký mới account
export const DELAY_AFTER_DAY = 30; // Delay (phút) sau khi đăng ký được 1 ngày

// Cấu hình Proxy
// Nếu sử dụng proxy từ config, sẽ rotate proxy sau mỗi MAX_ACCOUNTS_PER_IP accounts
export const USE_PROXY_FROM_CONFIG = false; // Đặt true để sử dụng proxy từ PROXY_LIST
export const PROXY_LIST = [
  // 'http://username:password@proxy1.example.com:8080',
  // 'http://username:password@proxy2.example.com:8080',
  // 'socks5://username:password@proxy3.example.com:1080',
]; // Danh sách proxy (để trống nếu không dùng)
export const MAX_ACCOUNTS_PER_IP = 5; // Số account tối đa mỗi IP/proxy trước khi rotate
export const LIMIT_WAITING = 5; // Thời gian đợi (phút) sau khi đạt MAX_ACCOUNTS_PER_IP khi không dùng proxy

// Cấu hình Telegram Bot (cho telegram_bot.js)
export const TELEGRAM_BOT_TOKEN = ''; // Bot token từ @BotFather (để trống nếu không dùng)
export const TELEGRAM_ALLOWED_USER_IDS = []; // Danh sách User ID được phép sử dụng bot (để trống [] nếu cho phép tất cả)

