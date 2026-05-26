import IORedis, { RedisOptions } from 'ioredis';
import { env } from './env';

const baseOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export function createRedis() {
  return new IORedis(env.redisUrl, baseOptions);
}

export const redis = createRedis();
