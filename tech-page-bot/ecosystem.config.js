module.exports = {
  apps: [
    {
      name: 'tech-page-bot',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,       // restart if it crashes
      watch: false,            // don't restart on file changes in prod
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      // Logs
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
