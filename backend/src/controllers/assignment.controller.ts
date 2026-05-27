import type { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import pdfParse from 'pdf-parse';
import { Assignment } from '../models/Assignment';
import { generationQueue } from '../queues/generation.queue';
import { QUESTION_TYPES } from '../types/assignment';
import { renderPaperPdf } from '../services/pdf';
import { redis } from '../config/redis';

const MAX_TOTAL_QUESTIONS = 100;

const questionTypeSpecSchema = z.object({
  type: z.enum(QUESTION_TYPES as [string, ...string[]]),
  count: z.number().int().positive().max(50),
  marksPerQuestion: z.number().int().positive().max(100),
});

const createSchema = z
  .object({
    title: z.string().min(1).max(200),
    subject: z.string().max(100).optional(),
    gradeLevel: z.string().max(50).optional(),
    dueDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date'),
    questionTypes: z.array(questionTypeSpecSchema).min(1).max(10),
    additionalInstructions: z.string().max(2000).optional(),
    sourceText: z.string().max(40000).optional(),
    schoolName: z.string().max(200).optional(),
    teacherName: z.string().max(100).optional(),
  })
  .refine(
    (v) => v.questionTypes.reduce((s, q) => s + q.count, 0) <= MAX_TOTAL_QUESTIONS,
    { message: `Total questions cannot exceed ${MAX_TOTAL_QUESTIONS}` }
  );

function coercePayload(req: Request): Record<string, unknown> {
  if (req.body && typeof req.body.payload === 'string') {
    try {
      return JSON.parse(req.body.payload);
    } catch {
      return {};
    }
  }
  return req.body ?? {};
}

export async function createAssignment(req: Request, res: Response) {
  let payload = coercePayload(req);

  if (req.body && typeof req.body.payload !== 'string' && req.body.payload === undefined) {
    payload = req.body;
  }

  if (req.file) {
    try {
      if (req.file.mimetype === 'application/pdf') {
        const parsed = await pdfParse(req.file.buffer);
        payload.sourceText = parsed.text;
      } else if (req.file.mimetype.startsWith('text/')) {
        payload.sourceText = req.file.buffer.toString('utf-8');
      }
      // Image uploads (jpeg/png) don't have extractable text — silently skip
    } catch (err) {
      // Don't fail the whole request if a PDF can't be parsed
      // (e.g. scanned/image-only PDFs, encrypted PDFs). The user's
      // additionalInstructions still get used; reference text is just missing.
      console.warn(`[create] PDF/text parse skipped: ${(err as Error).message}`);
    }
  }

  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Validation failed', issues: parsed.error.flatten() });
  }

  const jobId = uuid();
  const doc = await Assignment.create({ ...parsed.data, jobId, status: 'queued' });

  await generationQueue.add(
    'generate',
    { assignmentId: doc.id, jobId },
    { jobId }
  );

  return res.status(201).json({
    assignmentId: doc.id,
    jobId,
    status: doc.status,
  });
}

export async function listAssignments(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const skip = Math.max(Number(req.query.skip) || 0, 0);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  const filter: Record<string, unknown> = {};
  if (search) filter.title = { $regex: search, $options: 'i' };

  const [items, total] = await Promise.all([
    Assignment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('title subject gradeLevel dueDate status jobId createdAt updatedAt')
      .lean(),
    Assignment.countDocuments(filter),
  ]);

  return res.json({ items, total, limit, skip });
}

export async function getAssignment(req: Request, res: Response) {
  const cacheKey = `assignment:${req.params.id}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(JSON.parse(cached));
  }

  const doc = await Assignment.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });

  if (doc.status === 'completed') {
    await redis
      .set(cacheKey, JSON.stringify(doc), 'EX', 60 * 60)
      .catch(() => null);
  }
  res.setHeader('X-Cache', 'MISS');
  return res.json(doc);
}

export async function getByJobId(req: Request, res: Response) {
  const doc = await Assignment.findOne({ jobId: req.params.jobId }).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  return res.json(doc);
}

export async function regenerate(req: Request, res: Response) {
  const doc = await Assignment.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  const jobId = uuid();
  doc.jobId = jobId;
  doc.status = 'queued';
  doc.error = undefined;
  doc.result = undefined;
  await doc.save();

  await redis.del(`assignment:${doc.id}`).catch(() => null);

  await generationQueue.add(
    'generate',
    { assignmentId: doc.id, jobId },
    { jobId }
  );

  return res.json({ assignmentId: doc.id, jobId, status: 'queued' });
}

export async function deleteAssignment(req: Request, res: Response) {
  const doc = await Assignment.findByIdAndDelete(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  await redis.del(`assignment:${req.params.id}`).catch(() => null);
  return res.json({ deleted: true });
}

export async function downloadPdf(req: Request, res: Response) {
  const doc = await Assignment.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (doc.status !== 'completed' || !doc.result) {
    return res
      .status(409)
      .json({ error: 'Paper not ready', status: doc.status });
  }

  try {
    const pdf = await renderPaperPdf(doc);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${slugify(doc.title)}.pdf"`
    );
    return res.send(pdf);
  } catch (err) {
    console.error('[pdf] render failed', err);
    return res
      .status(500)
      .json({ error: `PDF render failed: ${(err as Error).message}` });
  }
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'paper';
}
