// PM2 layout for one 4-core VPS:   pm2 start ecosystem.config.cjs && pm2 save
//   api    ×3  cluster on :5007  → HTTP /api (stateless, share the port)
//   socket ×1  fork    on :5008  → /socket.io (live rooms + presence live in this one process)
//   worker ×1  fork               → video encodes (BullMQ) + hourly cron
// All three need REDIS_URL (in .env) so API processes can emit to sockets and enqueue encodes.
const env = { NODE_ENV: 'production' };

module.exports = {
  apps: [
    {
      name: 'api',
      script: 'server.js',
      instances: 3,
      exec_mode: 'cluster',
      env: { ...env, PORT: 5007, ROLE: 'api' },
      max_memory_restart: '1500M',
    },
    {
      name: 'socket',
      script: 'server.js',
      instances: 1, // must stay 1: live-stream rooms are in this process's memory
      exec_mode: 'fork',
      env: { ...env, PORT: 5008, ROLE: 'socket' },
      max_memory_restart: '1500M',
    },
    {
      name: 'worker',
      script: 'worker.js',
      instances: 1,
      exec_mode: 'fork',
      env: { ...env, FFMPEG_THREADS: 2, ENCODE_CONCURRENCY: 1 },
      max_memory_restart: '2G',
      kill_timeout: 30000, // let an in-flight encode finish its current step
    },
  ],
};
