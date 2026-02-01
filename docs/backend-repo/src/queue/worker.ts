// =============================================================================
// Job Queue Worker
// =============================================================================
// Handles async generation jobs using BullMQ.
// This allows for better scalability and reliability.

import { Queue, Worker, Job } from 'bullmq';
import { queueLogger as logger } from '../utils/logger';
import { env } from '../config/env';
import { GenerationPipeline } from '../services/ai/pipeline';

// =============================================================================
// QUEUE CONFIGURATION
// =============================================================================

const QUEUE_NAME = 'generation';

const connection = env.REDIS_URL
  ? { url: env.REDIS_URL }
  : undefined;

// =============================================================================
// JOB TYPES
// =============================================================================

interface GenerationJobData {
  workspaceId: string;
  userId: string;
  sessionId: string;
  prompt: string;
  options?: {
    template?: string;
    model?: string;
  };
}

// =============================================================================
// QUEUE INSTANCE
// =============================================================================

let queue: Queue<GenerationJobData> | null = null;
let worker: Worker<GenerationJobData> | null = null;

// =============================================================================
// INITIALIZATION
// =============================================================================

export async function initializeQueue(): Promise<void> {
  if (!connection) {
    logger.warn('Redis not configured - queue disabled, using direct execution');
    return;
  }

  // Create queue
  queue = new Queue<GenerationJobData>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });

  // Create worker
  worker = new Worker<GenerationJobData>(
    QUEUE_NAME,
    async (job: Job<GenerationJobData>) => {
      logger.info({ jobId: job.id, sessionId: job.data.sessionId }, 'Processing generation job');

      const pipeline = new GenerationPipeline(job.data);
      await pipeline.run();

      logger.info({ jobId: job.id, sessionId: job.data.sessionId }, 'Generation job completed');
    },
    {
      connection,
      concurrency: 3, // Process 3 jobs at a time
    }
  );

  // Event handlers
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error }, 'Job failed');
  });

  worker.on('error', (error) => {
    logger.error({ error }, 'Worker error');
  });

  logger.info('Queue initialized');
}

// =============================================================================
// QUEUE OPERATIONS
// =============================================================================

export async function addGenerationJob(data: GenerationJobData): Promise<string> {
  if (!queue) {
    // Direct execution if queue not available
    logger.info({ sessionId: data.sessionId }, 'Executing generation directly (no queue)');
    const pipeline = new GenerationPipeline(data);
    pipeline.run().catch(err => logger.error({ err }, 'Direct execution failed'));
    return data.sessionId;
  }

  const job = await queue.add('generate', data, {
    jobId: data.sessionId,
  });

  logger.info({ jobId: job.id, sessionId: data.sessionId }, 'Generation job added to queue');
  return job.id!;
}

export async function getJobStatus(jobId: string) {
  if (!queue) return null;

  const job = await queue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
  };
}

export async function shutdownQueue(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
  logger.info('Queue shutdown complete');
}
