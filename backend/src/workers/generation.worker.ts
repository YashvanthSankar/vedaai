import { Worker } from 'bullmq';
import { createRedis } from '../config/redis';
import { connectMongo } from '../config/db';
import { Assignment } from '../models/Assignment';
import { GENERATION_QUEUE, type GenerationJobData } from '../queues/generation.queue';
import { buildPrompt } from '../services/prompt';
import { generatePaper } from '../services/groq';
import { publishEvent } from '../websocket/hub';

async function main() {
  await connectMongo();

  const worker = new Worker<GenerationJobData>(
    GENERATION_QUEUE,
    async (job) => {
      const { assignmentId, jobId } = job.data;
      const doc = await Assignment.findById(assignmentId);
      if (!doc) {
        throw new Error(`Assignment not found: ${assignmentId}`);
      }

      doc.status = 'processing';
      await doc.save();
      await publishEvent({
        type: 'status',
        jobId,
        status: 'processing',
        progress: 10,
        message: 'Structuring your prompt…',
      });

      const prompt = buildPrompt({
        title: doc.title,
        subject: doc.subject,
        gradeLevel: doc.gradeLevel,
        dueDate: doc.dueDate,
        questionTypes: doc.questionTypes,
        additionalInstructions: doc.additionalInstructions,
        sourceText: doc.sourceText,
        schoolName: doc.schoolName,
        teacherName: doc.teacherName,
      });

      await publishEvent({
        type: 'status',
        jobId,
        status: 'processing',
        progress: 35,
        message: 'Asking the model to draft questions…',
      });

      const paper = await generatePaper(prompt);

      await publishEvent({
        type: 'status',
        jobId,
        status: 'processing',
        progress: 85,
        message: 'Validating and formatting…',
      });

      doc.result = paper;
      doc.status = 'completed';
      doc.error = undefined;
      await doc.save();

      await publishEvent({
        type: 'completed',
        jobId,
        result: paper,
      });

      return { ok: true };
    },
    {
      connection: createRedis(),
      concurrency: 2,
    }
  );

  worker.on('failed', async (job, err) => {
    if (!job) return;
    const { assignmentId, jobId } = job.data;
    console.error(`[worker] job ${jobId} failed:`, err.message);
    await Assignment.findByIdAndUpdate(assignmentId, {
      status: 'failed',
      error: err.message,
    }).catch(() => null);
    await publishEvent({ type: 'failed', jobId, error: err.message });
  });

  worker.on('completed', (job) => {
    console.log(`[worker] job ${job.id} completed`);
  });

  worker.on('error', (err) => {
    console.error('[worker] error', err);
  });

  console.log('[worker] generation worker ready');
}

main().catch((err) => {
  console.error('[worker] fatal', err);
  process.exit(1);
});
