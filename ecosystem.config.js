module.exports = {
  apps: [{
    name: 'furniture-erp',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/app',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    watch: false,
    max_restarts: 10,
    restart_delay: 4000,
  }]
}
