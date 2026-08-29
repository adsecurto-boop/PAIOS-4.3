module.exports = {
  apps: [
    {
      name: 'paios-backend',
      script: 'server.ts',
      interpreter: 'node_modules/.bin/tsx',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        JWT_SECRET: 'your-secure-jwt-secret',
        DB_DIR: './data',
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
    },
  ],
};
