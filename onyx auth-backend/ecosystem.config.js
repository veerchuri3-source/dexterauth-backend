module.exports = {
  apps: [{
    name: "authlx-backend",
    script: "src/index.js",
    instances: "max",
    exec_mode: "cluster",
    env_production: {
      NODE_ENV: "production",
    },
    max_memory_restart: "500M",
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
  }]
};
