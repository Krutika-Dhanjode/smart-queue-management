const Redis = require('ioredis');
const config = require('./index');

let redis = null;
const redisUrl = config.redis.url;

if (redisUrl && redisUrl !== 'redis://localhost:6379') {
  const isTLS = redisUrl.startsWith('rediss://');
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
    ...(isTLS && { tls: { rejectUnauthorized: false } }),
  });

  redis.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });

  redis.on('connect', () => {
    console.log('Redis connected');
  });

  redis.connect().catch(() => {});
} else {
  console.log('No Redis URL configured, skipping Redis connection');
}

const getRedis = () => redis;

module.exports = { getRedis };
