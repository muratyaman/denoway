import * as _ from './constants.ts';
import { IConfig } from './types.ts';

export function makeConfig(): IConfig {
  return {
    http: {
      connect: {
        port: 9000,
      },
    },
    redis: {
      connect: {
        hostname: _.IP_LOOPBACK,
        port: 6379,
      },
      channels: {
        accessLog: _.REDIS_CHANNEL_ACCESS_LOG,
      },
    },
    middleware: {
      auth: {
        requireAuth: true,
        requireApiKey: true,
        requireApiSecret: true,
      },
      rate: {
        cacheExpiryMs: 60 * 1000,
        limitPerMinute: 60 * 5,
      },
    },
    services: {
      customers: {
        urlPath: '/customers',
        targetServer: `http://${_.IP_LOOPBACK}:9001`,
      },
    },
  };
}
