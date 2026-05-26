import Groq from 'groq-sdk';
import { env } from '../config/env';
import { z } from 'zod';
import type { GeneratedPaper } from '../types/assignment';
import { QUESTION_TYPES, DIFFICULTIES } from '../types/assignment';

const groq = new Groq({ apiKey: env.groqApiKey });

const QuestionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  type: z.enum(QUESTION_TYPES as [string, ...string[]]),
  difficulty: z.enum(DIFFICULTIES as [string, ...string[]]),
  marks: z.number().positive(),
  options: z.array(z.string()).nullable().optional(),
  answer: z.string().nullable().optional(),
});

const SectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  instruction: z.string(),
  questions: z.array(QuestionSchema).min(1),
});

const PaperSchema = z.object({
  title: z.string(),
  subject: z.string().nullable().optional(),
  gradeLevel: z.string().nullable().optional(),
  dueDate: z.string(),
  totalMarks: z.number(),
  timeAllowedMinutes: z.number().nullable().optional(),
  sections: z.array(SectionSchema).min(1),
  introMessage: z.string().nullable().optional(),
});

export async function generatePaper(args: {
  system: string;
  user: string;
}): Promise<GeneratedPaper> {
  const completion = await groq.chat.completions.create({
    model: env.groqModel,
    messages: [
      { role: 'system', content: args.system },
      { role: 'user', content: args.user },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.6,
    max_tokens: 8000,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Groq returned empty content');

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error(`Groq returned invalid JSON: ${(err as Error).message}`);
  }

  const result = PaperSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Generated paper failed schema validation: ${result.error.message}`
    );
  }

  const paper = result.data;

  paper.sections.forEach((section) => {
    section.questions.forEach((q) => {
      if (q.type !== 'mcq') {
        q.options = undefined;
      } else if (!q.options || q.options.length < 2) {
        throw new Error(`MCQ question ${q.id} is missing options`);
      }
      if (q.answer === null) q.answer = undefined;
    });
  });

  return paper as GeneratedPaper;
}
