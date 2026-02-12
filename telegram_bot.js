import { Telegraf, Markup } from 'telegraf';
import { updateMintData, addProxy } from './update_config.js';
import { readFile } from 'fs/promises';

// Dynamic import để có thể reload config
let PROXY_LIST = [];
let mint_data = '';
let TELEGRAM_BOT_TOKEN = '';
let TELEGRAM_ALLOWED_USER_IDS = [];

// Hàm reload config
async function reloadConfig() {
  try {
    // Đọc file config.js và parse để lấy các giá trị
    const configContent = await readFile('./config.js', 'utf-8');
    
    // Extract PROXY_LIST
    const proxyListMatch = configContent.match(/export const PROXY_LIST = \[([\s\S]*?)\];/);
    if (proxyListMatch) {
      PROXY_LIST = proxyListMatch[1]
        .split(',')
        .map(p => p.trim().replace(/['"]/g, ''))
        .filter(p => p);
    }
    
    // Extract mint_data
    const mintDataMatch = configContent.match(/export const mint_data = `([\s\S]*?)`;/);
    if (mintDataMatch) {
      mint_data = mintDataMatch[1];
    }
    
    // Extract TELEGRAM_BOT_TOKEN
    const tokenMatch = configContent.match(/export const TELEGRAM_BOT_TOKEN = ['"](.*?)['"];/);
    if (tokenMatch) {
      TELEGRAM_BOT_TOKEN = tokenMatch[1];
    }
    
    // Extract TELEGRAM_ALLOWED_USER_IDS
    const allowedUsersMatch = configContent.match(/export const TELEGRAM_ALLOWED_USER_IDS = \[([\s\S]*?)\];/);
    if (allowedUsersMatch) {
      const usersStr = allowedUsersMatch[1];
      if (usersStr.trim()) {
        TELEGRAM_ALLOWED_USER_IDS = usersStr
          .split(',')
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id));
      } else {
        TELEGRAM_ALLOWED_USER_IDS = [];
      }
    }
  } catch (error) {
    console.error('Error reloading config:', error);
  }
}

// ========== CẤU HÌNH ==========
// Bot token sẽ được load từ config.js hoặc environment variable
// Ưu tiên: environment variable > config.js
// Bot sẽ được khởi tạo sau khi load config
// ==============================

let bot = null;

// State management cho từng user
const userStates = new Map();

/**
 * Kiểm tra user có được phép sử dụng bot không
 */
function isUserAllowed(userId) {
  if (TELEGRAM_ALLOWED_USER_IDS.length === 0) return true;
  return TELEGRAM_ALLOWED_USER_IDS.includes(userId);
}

/**
 * Tạo menu chính
 */
function getMainMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📝 Update mint_data', 'update_mint_data'),
      Markup.button.callback('🌐 Thêm Proxy', 'add_proxy')
    ],
    [
      Markup.button.callback('📊 Xem Config hiện tại', 'view_config')
    ],
    [
      Markup.button.callback('❌ Hủy', 'cancel')
    ]
  ]);
}

/**
 * Tạo menu xác nhận
 */
function getConfirmMenu(action) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Xác nhận', `confirm_${action}`),
      Markup.button.callback('❌ Hủy', 'cancel')
    ]
  ]);
}

/**
 * Escape HTML để tránh lỗi parsing
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Xử lý lỗi
 */
function handleError(ctx, error) {
  console.error('Error:', error);
  ctx.reply(`❌ Lỗi: ${error.message || 'Có lỗi xảy ra'}`).catch(() => {});
}

// ========== SETUP BOT HANDLERS ==========

function setupBotHandlers() {
  if (!bot) return;

// ========== COMMANDS ==========

  bot.command('start', (ctx) => {
  if (!isUserAllowed(ctx.from.id)) {
    ctx.reply('❌ Bạn không có quyền sử dụng bot này.').catch(() => {});
    return;
  }
  
  ctx.reply(
    '🔧 <b>Quản lý Config</b>\n\n' +
    'Chọn chức năng:',
    {
      parse_mode: 'HTML',
      ...getMainMenu()
    }
  ).catch(() => {});
});

bot.command('menu', (ctx) => {
  if (!isUserAllowed(ctx.from.id)) {
    ctx.reply('❌ Bạn không có quyền sử dụng bot này.').catch(() => {});
    return;
  }
  
  ctx.reply(
    '🔧 <b>Quản lý Config</b>\n\n' +
    'Chọn chức năng:',
    {
      parse_mode: 'HTML',
      ...getMainMenu()
    }
  ).catch(() => {});
});

// ========== CALLBACK QUERIES ==========

// Xem config hiện tại
bot.action('view_config', async (ctx) => {
  if (!isUserAllowed(ctx.from.id)) {
    try {
      await ctx.answerCbQuery('❌ Bạn không có quyền sử dụng bot này.').catch(() => {});
    } catch (e) {}
    return;
  }
  
  try {
    await ctx.answerCbQuery('Đang lấy thông tin...').catch(() => {});
    
    // Reload config để đảm bảo data mới nhất
    await reloadConfig();
    
    const mintDataPreview = mint_data.length > 100 
      ? mint_data.substring(0, 100) + '...' 
      : mint_data;
    
    const message = 
      '📊 <b>Config hiện tại:</b>\n\n' +
      `<b>mint_data:</b>\n<code>${escapeHtml(mintDataPreview)}</code>\n\n` +
      `<b>Số lượng proxy:</b> ${PROXY_LIST.length}\n` +
      `<b>Danh sách proxy:</b>\n${PROXY_LIST.slice(0, 5).map((p, i) => `${i + 1}. ${escapeHtml(p.substring(0, 50))}...`).join('\n')}${PROXY_LIST.length > 5 ? `\n... và ${PROXY_LIST.length - 5} proxy khác` : ''}`;
    
    ctx.editMessageText(message, {
      parse_mode: 'HTML',
      ...getMainMenu()
    }).catch(async (e) => {
      // Nếu lỗi edit, thử reply
      try {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          ...getMainMenu()
        });
      } catch (err) {
        handleError(ctx, e);
      }
    });
  } catch (error) {
    handleError(ctx, error);
  }
});

// Update mint_data - bắt đầu
bot.action('update_mint_data', async (ctx) => {
  if (!isUserAllowed(ctx.from.id)) {
    try {
      await ctx.answerCbQuery('❌ Bạn không có quyền sử dụng bot này.');
    } catch (e) {
      // Ignore timeout errors
    }
    return;
  }
  
  try {
    await ctx.answerCbQuery().catch(() => {}); // Ignore timeout errors
    
    // Set state cho user
    userStates.set(ctx.from.id, {
      action: 'update_mint_data',
      data: []
    });
    
    ctx.editMessageText(
      '📝 <b>Update mint_data</b>\n\n' +
      'Gửi nội dung mint_data mới (có thể nhiều dòng).\n\n' +
      '📌 <b>Hướng dẫn:</b>\n' +
      '• Gửi tất cả nội dung trong một message\n' +
      '• Hoặc gửi từng dòng, sau đó nhấn "✅ Hoàn tất"\n' +
      '• Nhấn "❌ Hủy" để hủy bỏ',
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback('✅ Hoàn tất', 'finish_mint_data'),
              Markup.button.callback('❌ Hủy', 'cancel')
            ]
          ]
        }
      }
    );
  } catch (error) {
    // Nếu lỗi edit message (có thể do message quá cũ), thử reply thay vì edit
    try {
      await ctx.reply(
        '📝 <b>Update mint_data</b>\n\n' +
        'Gửi nội dung mint_data mới (có thể nhiều dòng).\n\n' +
        '📌 <b>Hướng dẫn:</b>\n' +
        '• Gửi tất cả nội dung trong một message\n' +
        '• Hoặc gửi từng dòng, sau đó nhấn "✅ Hoàn tất"\n' +
        '• Nhấn "❌ Hủy" để hủy bỏ',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback('✅ Hoàn tất', 'finish_mint_data'),
                Markup.button.callback('❌ Hủy', 'cancel')
              ]
            ]
          }
        }
      );
    } catch (e) {
      handleError(ctx, error);
    }
  }
});

// Hoàn tất nhập mint_data
bot.action('finish_mint_data', async (ctx) => {
  if (!isUserAllowed(ctx.from.id)) {
    try {
      await ctx.answerCbQuery('❌ Bạn không có quyền sử dụng bot này.').catch(() => {});
    } catch (e) {}
    return;
  }
  
  try {
    await ctx.answerCbQuery().catch(() => {});
    
    const state = userStates.get(ctx.from.id);
    if (!state || state.action !== 'update_mint_data') {
      ctx.reply('❌ Không tìm thấy dữ liệu. Vui lòng bắt đầu lại.').catch(() => {});
      userStates.delete(ctx.from.id);
      return;
    }
    
    if (state.data.length === 0) {
      ctx.reply('⚠️ Không có nội dung. Vui lòng gửi nội dung mint_data trước.').catch(() => {});
      return;
    }
    
    const mintData = state.data.join('\n');
    
    // Hiển thị preview
    const preview = mintData.length > 500 
      ? mintData.substring(0, 500) + '...' 
      : mintData;
    
    ctx.editMessageText(
      '📋 <b>Preview nội dung mới:</b>\n\n' +
      `<code>${escapeHtml(preview)}</code>\n\n` +
      'Bạn có chắc chắn muốn cập nhật?',
      {
        parse_mode: 'HTML',
        ...getConfirmMenu('update_mint_data')
      }
    ).catch(async (e) => {
      try {
        await ctx.reply(
          '📋 <b>Preview nội dung mới:</b>\n\n' +
          `<code>${escapeHtml(preview)}</code>\n\n` +
          'Bạn có chắc chắn muốn cập nhật?',
          {
            parse_mode: 'HTML',
            ...getConfirmMenu('update_mint_data')
          }
        );
      } catch (err) {
        handleError(ctx, e);
      }
    });
  } catch (error) {
    handleError(ctx, error);
  }
});

// Thêm proxy - bắt đầu
bot.action('add_proxy', async (ctx) => {
  if (!isUserAllowed(ctx.from.id)) {
    try {
      await ctx.answerCbQuery('❌ Bạn không có quyền sử dụng bot này.').catch(() => {});
    } catch (e) {}
    return;
  }
  
  try {
    await ctx.answerCbQuery().catch(() => {});
    
    // Set state cho user
    userStates.set(ctx.from.id, {
      action: 'add_proxy'
    });
    
    ctx.editMessageText(
      `🌐 <b>Thêm Proxy vào PROXY_LIST</b>\n\n` +
      `Hiện tại có <b>${PROXY_LIST.length}</b> proxy trong danh sách.\n\n` +
      `Gửi proxy URL (ví dụ: <code>http://user:pass@host:port</code>)`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback('❌ Hủy', 'cancel')
            ]
          ]
        }
      }
    ).catch(async (e) => {
      try {
        await ctx.reply(
          `🌐 <b>Thêm Proxy vào PROXY_LIST</b>\n\n` +
          `Hiện tại có <b>${PROXY_LIST.length}</b> proxy trong danh sách.\n\n` +
          `Gửi proxy URL (ví dụ: <code>http://user:pass@host:port</code>)`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  Markup.button.callback('❌ Hủy', 'cancel')
                ]
              ]
            }
          }
        );
      } catch (err) {
        handleError(ctx, e);
      }
    });
  } catch (error) {
    handleError(ctx, error);
  }
});

// Xác nhận update mint_data
bot.action('confirm_update_mint_data', async (ctx) => {
  if (!isUserAllowed(ctx.from.id)) {
    try {
      await ctx.answerCbQuery('❌ Bạn không có quyền sử dụng bot này.').catch(() => {});
    } catch (e) {}
    return;
  }
  
  try {
    await ctx.answerCbQuery('Đang cập nhật...').catch(() => {});
    
    const state = userStates.get(ctx.from.id);
    if (!state || state.action !== 'update_mint_data') {
      ctx.editMessageText('❌ Không tìm thấy dữ liệu. Vui lòng bắt đầu lại.', {
        parse_mode: 'HTML',
        ...getMainMenu()
      }).catch(() => {});
      userStates.delete(ctx.from.id);
      return;
    }
    
    const mintData = state.data.join('\n');
    
    await updateMintData(mintData);
    
    // Reload config để lấy mint_data mới
    await reloadConfig();
    
    userStates.delete(ctx.from.id);
    
    ctx.editMessageText(
      '✅ <b>Đã cập nhật mint_data thành công!</b>',
      {
        parse_mode: 'HTML',
        ...getMainMenu()
      }
    ).catch(async (e) => {
      try {
        await ctx.reply('✅ <b>Đã cập nhật mint_data thành công!</b>', {
          parse_mode: 'HTML',
          ...getMainMenu()
        });
      } catch (err) {
        handleError(ctx, e);
      }
    });
  } catch (error) {
    handleError(ctx, error);
    userStates.delete(ctx.from.id);
  }
});

// Xác nhận thêm proxy
bot.action('confirm_add_proxy', async (ctx) => {
  if (!isUserAllowed(ctx.from.id)) {
    try {
      await ctx.answerCbQuery('❌ Bạn không có quyền sử dụng bot này.').catch(() => {});
    } catch (e) {}
    return;
  }
  
  try {
    await ctx.answerCbQuery('Đang thêm proxy...').catch(() => {});
    
    const state = userStates.get(ctx.from.id);
    if (!state || state.action !== 'add_proxy' || !state.proxyUrl) {
      ctx.editMessageText('❌ Không tìm thấy proxy URL. Vui lòng bắt đầu lại.', {
        parse_mode: 'HTML',
        ...getMainMenu()
      }).catch(() => {});
      userStates.delete(ctx.from.id);
      return;
    }
    
    await addProxy(state.proxyUrl);
    
    // Reload config để lấy PROXY_LIST mới
    await reloadConfig();
    
    userStates.delete(ctx.from.id);
    
    ctx.editMessageText(
      `✅ <b>Đã thêm proxy thành công!</b>\n\n` +
      `Proxy mới: <code>${escapeHtml(state.proxyUrl)}</code>\n` +
      `Tổng số proxy: ${PROXY_LIST.length}`,
      {
        parse_mode: 'HTML',
        ...getMainMenu()
      }
    ).catch(async (e) => {
      try {
        await ctx.reply(
          `✅ <b>Đã thêm proxy thành công!</b>\n\n` +
          `Proxy mới: <code>${escapeHtml(state.proxyUrl)}</code>\n` +
          `Tổng số proxy: ${PROXY_LIST.length}`,
          {
            parse_mode: 'HTML',
            ...getMainMenu()
          }
        );
      } catch (err) {
        handleError(ctx, e);
      }
    });
  } catch (error) {
    handleError(ctx, error);
    userStates.delete(ctx.from.id);
  }
});

// Hủy
bot.action('cancel', async (ctx) => {
  if (!isUserAllowed(ctx.from.id)) {
    try {
      await ctx.answerCbQuery('❌ Bạn không có quyền sử dụng bot này.').catch(() => {});
    } catch (e) {}
    return;
  }
  
  try {
    await ctx.answerCbQuery().catch(() => {});
    userStates.delete(ctx.from.id);
    
    ctx.editMessageText(
      '🔧 <b>Quản lý Config</b>\n\n' +
      'Chọn chức năng:',
      {
        parse_mode: 'HTML',
        ...getMainMenu()
      }
    ).catch(async (e) => {
      try {
        await ctx.reply(
          '🔧 <b>Quản lý Config</b>\n\n' +
          'Chọn chức năng:',
          {
            parse_mode: 'HTML',
            ...getMainMenu()
          }
        );
      } catch (err) {
        handleError(ctx, e);
      }
    });
  } catch (error) {
    handleError(ctx, error);
  }
});

// ========== MESSAGE HANDLERS ==========

// Xử lý text messages
bot.on('text', async (ctx) => {
  if (!isUserAllowed(ctx.from.id)) {
    ctx.reply('❌ Bạn không có quyền sử dụng bot này.');
    return;
  }
  
  const state = userStates.get(ctx.from.id);
  
  if (!state) {
    // Không có state, hiển thị menu
    ctx.reply(
      '🔧 <b>Quản lý Config</b>\n\n' +
      'Chọn chức năng:',
      {
        parse_mode: 'HTML',
        ...getMainMenu()
      }
    ).catch(() => {});
    return;
  }
  
  // Xử lý theo action
  if (state.action === 'update_mint_data') {
    // Thêm dòng vào data
    if (!state.data) state.data = [];
    state.data.push(ctx.message.text);
    userStates.set(ctx.from.id, state);
    
    ctx.reply(
      `✅ Đã thêm dòng ${state.data.length}.\n\n` +
      `Nhấn "✅ Hoàn tất" khi xong hoặc tiếp tục gửi thêm dòng.`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback('✅ Hoàn tất', 'finish_mint_data'),
              Markup.button.callback('❌ Hủy', 'cancel')
            ]
          ]
        }
      }
    );
  } else if (state.action === 'add_proxy') {
    const proxyUrl = ctx.message.text.trim();
    
    if (!proxyUrl) {
      ctx.reply('⚠️ Proxy URL không được để trống.');
      return;
    }
    
    // Validate basic format
    if (!proxyUrl.startsWith('http://') && !proxyUrl.startsWith('https://')) {
      ctx.reply(
        '⚠️ Proxy URL phải bắt đầu bằng <code>http://</code> hoặc <code>https://</code>\n\n' +
        'Bạn có muốn tiếp tục không?',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback('✅ Tiếp tục', `force_add_proxy_${Buffer.from(proxyUrl).toString('base64')}`),
                Markup.button.callback('❌ Hủy', 'cancel')
              ]
            ]
          }
        }
      ).catch(() => {});
      return;
    }
    
    // Lưu proxy URL vào state
    state.proxyUrl = proxyUrl;
    userStates.set(ctx.from.id, state);
    
    // Hiển thị preview và xác nhận
    ctx.reply(
      `📋 <b>Preview:</b>\n\n` +
      `Proxy URL: <code>${escapeHtml(proxyUrl)}</code>\n\n` +
      `Bạn có chắc chắn muốn thêm proxy này?`,
      {
        parse_mode: 'HTML',
        ...getConfirmMenu('add_proxy')
      }
    ).catch(() => {});
  }
});

// Xử lý force add proxy (khi format không đúng nhưng user muốn tiếp tục)
bot.action(/^force_add_proxy_(.+)$/, async (ctx) => {
  if (!isUserAllowed(ctx.from.id)) {
    try {
      await ctx.answerCbQuery('❌ Bạn không có quyền sử dụng bot này.').catch(() => {});
    } catch (e) {}
    return;
  }
  
  try {
    await ctx.answerCbQuery().catch(() => {});
    
    const proxyUrl = Buffer.from(ctx.match[1], 'base64').toString();
    const state = userStates.get(ctx.from.id);
    
    if (!state || state.action !== 'add_proxy') {
      ctx.reply('❌ Không tìm thấy state. Vui lòng bắt đầu lại.').catch(() => {});
      return;
    }
    
    state.proxyUrl = proxyUrl;
    userStates.set(ctx.from.id, state);
    
    ctx.editMessageText(
      `📋 <b>Preview:</b>\n\n` +
      `Proxy URL: <code>${escapeHtml(proxyUrl)}</code>\n\n` +
      `Bạn có chắc chắn muốn thêm proxy này?`,
      {
        parse_mode: 'HTML',
        ...getConfirmMenu('add_proxy')
      }
    ).catch(async (e) => {
      try {
        await ctx.reply(
          `📋 <b>Preview:</b>\n\n` +
          `Proxy URL: <code>${escapeHtml(proxyUrl)}</code>\n\n` +
          `Bạn có chắc chắn muốn thêm proxy này?`,
          {
            parse_mode: 'HTML',
            ...getConfirmMenu('add_proxy')
          }
        );
      } catch (err) {
        handleError(ctx, e);
      }
    });
  } catch (error) {
    handleError(ctx, error);
  }
});

// ========== ERROR HANDLING ==========

  bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
  });
}

// ========== START BOT ==========

async function startBot() {
  console.log('🤖 Đang khởi động Telegram bot...');
  
  // Load config lần đầu
  await reloadConfig();
  
  // Lấy bot token: ưu tiên environment variable, sau đó là config.js
  const botToken = process.env.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN;
  
  if (!botToken || botToken === '') {
    console.error('❌ Vui lòng cấu hình TELEGRAM_BOT_TOKEN!');
    console.error('   Cách 1: export TELEGRAM_BOT_TOKEN="your_token"');
    console.error('   Cách 2: Thêm vào config.js: export const TELEGRAM_BOT_TOKEN = "your_token"');
    process.exit(1);
  }
  
  // Khởi tạo bot với token
  bot = new Telegraf(botToken);
  
  // Load allowed user IDs từ environment hoặc config
  if (process.env.TELEGRAM_ALLOWED_USER_IDS) {
    TELEGRAM_ALLOWED_USER_IDS = process.env.TELEGRAM_ALLOWED_USER_IDS
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id));
  }
  
  console.log(`✅ Đã load config: ${PROXY_LIST.length} proxy, mint_data length: ${mint_data.length}`);
  console.log(`✅ Bot token: ${botToken.substring(0, 10)}...`);
  console.log(`✅ Allowed users: ${TELEGRAM_ALLOWED_USER_IDS.length === 0 ? 'Tất cả' : TELEGRAM_ALLOWED_USER_IDS.join(', ')}`);
  
  // Setup bot handlers sau khi bot được khởi tạo
  setupBotHandlers();
  
  try {
    await bot.launch();
    console.log('✅ Telegram bot đã khởi động thành công!');
    console.log('📱 Sử dụng /start hoặc /menu để bắt đầu.');
  } catch (error) {
    console.error('❌ Lỗi khởi động bot:', error);
    process.exit(1);
  }
}


startBot();

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));


