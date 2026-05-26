import { Queue } from 'bullmq';
import { createRedis } from '../config/redis';

export const GENERATION_QUEUE = 'paper-generation';

export const generationQueue = new Queue(GENERATION_QUEUE, {
  connection: createRedis(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100, age: 24 * 3600 },
    removeOnFail: { count: 100, age: 24 * 3600 },
  },
});

export interface GenerationJobData {
  assignmentId: string;
  jobId: string;
}
