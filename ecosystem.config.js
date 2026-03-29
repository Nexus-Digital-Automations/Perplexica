// pm2 configuration for production deployment on M1 Mac Mini (8GB)
// Usage: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'perplexica',
      script: '.next/standalone/server.js',
      node_args: '--max-old-space-size=3072',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '3G',
      restart_delay: 2000,
      max_restarts: 10,
      exp_backoff_restart_delay: 1000,
    },
  ],
};
