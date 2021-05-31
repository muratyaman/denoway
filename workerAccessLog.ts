import { redisConnect } from './deps.ts';
import { makeConfig } from './config.ts';

const config = makeConfig();

console.info('connecting to redis server...');
const redis = await redisConnect(config.redis.connect);
console.info('connecting to redis server... done!');

console.info('ping...');
const pong = await redis.ping();
console.info('ping... pong!', pong);

console.info('start listening to channel', config.redis.channels.accessLog, '...');
const sub = await redis.subscribe(config.redis.channels.accessLog);
console.info('start listening to channel', config.redis.channels.accessLog, '... done!');

(async function () {
  for await (const { channel, message } of sub.receive()) {
    console.info(channel, ': ', message);
  }
})();