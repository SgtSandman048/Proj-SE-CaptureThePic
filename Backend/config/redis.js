const { createClient } = require('redis');
//const logger = require('../utils/logger');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:8080',
});

redisClient.on('error', (err) => 
    //logger.error('Redis error:', err)
    console.error("Redis error", err)
);
redisClient.on('connect', () => 
    //logger.info('✅ Redis connected')
    console.log('Radis connected')
);

redisClient.connect();

module.exports = redisClient;