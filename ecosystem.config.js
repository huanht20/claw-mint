module.exports = {
  apps: [
    {
      name: 'mint-post',
      script: 'mint_post.js',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      // Args để truyền vào script (ví dụ: 60 = lặp lại mỗi 60 phút)
      // Để chạy 1 lần: pm2 start ecosystem.config.js --only mint-post
      // Để chạy lặp lại: pm2 start ecosystem.config.js --only mint-post -- 60
      args: '', // Có thể set mặc định ở đây, ví dụ: '60'
      env: {
        NODE_ENV: 'production'
      },
      error_file: './log/pm2-error.log',
      out_file: './log/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    },
    {
      name: 'link-wallet',
      script: 'link_wallet.js',
      instances: 1,
      autorestart: false,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './log/pm2-error.log',
      out_file: './log/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    },
    {
      name: 'index-agent',
      script: 'index_agent.js',
      instances: 1,
      autorestart: false,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './log/pm2-error.log',
      out_file: './log/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};

