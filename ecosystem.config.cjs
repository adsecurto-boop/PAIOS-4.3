module.exports = {
  apps: [
    {
      name: "paios-backend",
      script: "server.ts",
      node_args: "--import tsx",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3001
      },
      error_file: "./logs/pm2-err.log",
      out_file: "./logs/pm2-out.log",
      time: true
    }
  ]
};
