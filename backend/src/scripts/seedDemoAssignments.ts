/**
 * Demo seeder — populates the database with a diverse set of completed
 * assignments so reviewers see a populated dashboard instead of empty state.
 *
 * Run via:  pnpm --filter veda-ai-backend exec tsx src/scripts/seedDemoAssignments.ts
 *           (or:  cd backend && npx tsx src/scripts/seedDemoAssignments.ts)
 *
 * Idempotent: rows are upserted on `jobId`, so re-running won't duplicate.
 */
import mongoose from 'mongoose';
import { connectMongo } from '../config/db';
import { Assignment } from '../models/Assignment';
import type { GeneratedPaper, QuestionTypeSpec } from '../types/assignment';

type Demo = {
  jobId: string;
  title: string;
  subject: string;
  gradeLevel: string;
  dueDate: string;
  questionTypes: QuestionTypeSpec[];
  additionalInstructions?: string;
  result: GeneratedPaper;
};

const SCHOOL = 'Delhi Public School';
const TEACHER = 'John Doe';

const demos: Demo[] = [
  {
    jobId: 'demo-electricity-class10',
    title: 'Quiz on Electricity',
    subject: 'Physics',
    gradeLevel: 'Class 10',
    dueDate: '2025-06-21',
    questionTypes: [
      { type: 'mcq', count: 5, marksPerQuestion: 1 },
      { type: 'short_answer', count: 3, marksPerQuestion: 3 },
      { type: 'numerical', count: 2, marksPerQuestion: 5 },
    ],
    additionalInstructions: 'Focus on Ohm’s law, series/parallel circuits, and power dissipation.',
    result: {
      title: 'Quiz on Electricity',
      subject: 'Physics',
      gradeLevel: 'Class 10',
      dueDate: '2025-06-21',
      totalMarks: 24,
      timeAllowedMinutes: 45,
      introMessage: 'Answer all questions. Show working for numericals.',
      sections: [
        {
          id: 's1',
          title: 'Section A — Multiple Choice',
          instruction: 'Choose the correct option. Each question carries 1 mark.',
          questions: [
            {
              id: 'q1',
              text: 'The SI unit of electrical resistance is:',
              type: 'mcq',
              difficulty: 'easy',
              marks: 1,
              options: ['Volt', 'Ampere', 'Ohm', 'Watt'],
              answer: 'Ohm',
            },
            {
              id: 'q2',
              text: 'In a series circuit, the current through each component is:',
              type: 'mcq',
              difficulty: 'easy',
              marks: 1,
              options: ['Different', 'The same', 'Zero', 'Doubled'],
              answer: 'The same',
            },
            {
              id: 'q3',
              text: 'Which of the following materials is the best conductor?',
              type: 'mcq',
              difficulty: 'moderate',
              marks: 1,
              options: ['Iron', 'Copper', 'Aluminium', 'Silver'],
              answer: 'Silver',
            },
          ],
        },
        {
          id: 's2',
          title: 'Section B — Numerical',
          instruction: 'Show all working.',
          questions: [
            {
              id: 'q4',
              text: 'A 12 V battery is connected across a 4 Ω resistor. Calculate the current flowing and the power dissipated.',
              type: 'numerical',
              difficulty: 'moderate',
              marks: 5,
              answer: 'I = V/R = 12/4 = 3 A; P = VI = 12 × 3 = 36 W',
            },
          ],
        },
      ],
    },
  },
  {
    jobId: 'demo-photosynthesis-class9',
    title: 'Photosynthesis & Plant Respiration',
    subject: 'Biology',
    gradeLevel: 'Class 9',
    dueDate: '2025-06-25',
    questionTypes: [
      { type: 'short_answer', count: 4, marksPerQuestion: 2 },
      { type: 'diagram_graph', count: 1, marksPerQuestion: 5 },
      { type: 'long_answer', count: 1, marksPerQuestion: 5 },
    ],
    additionalInstructions: 'Include a diagram-labelling question on the chloroplast.',
    result: {
      title: 'Photosynthesis & Plant Respiration',
      subject: 'Biology',
      gradeLevel: 'Class 9',
      dueDate: '2025-06-25',
      totalMarks: 18,
      timeAllowedMinutes: 60,
      sections: [
        {
          id: 's1',
          title: 'Section A — Concept Check',
          instruction: 'Answer in 2–3 sentences.',
          questions: [
            {
              id: 'q1',
              text: 'State the overall balanced equation for photosynthesis.',
              type: 'short_answer',
              difficulty: 'easy',
              marks: 2,
              answer: '6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂ (in presence of light and chlorophyll).',
            },
            {
              id: 'q2',
              text: 'Why do most plants appear green?',
              type: 'short_answer',
              difficulty: 'easy',
              marks: 2,
              answer: 'Chlorophyll absorbs red and blue light strongly and reflects green wavelengths.',
            },
          ],
        },
        {
          id: 's2',
          title: 'Section B — Diagram',
          instruction: '',
          questions: [
            {
              id: 'q3',
              text: 'Draw a labelled diagram of a chloroplast and mark the thylakoid, stroma, and granum.',
              type: 'diagram_graph',
              difficulty: 'moderate',
              marks: 5,
            },
          ],
        },
      ],
    },
  },
  {
    jobId: 'demo-quadratics-class10',
    title: 'Quadratic Equations — Practice Set',
    subject: 'Mathematics',
    gradeLevel: 'Class 10',
    dueDate: '2025-06-23',
    questionTypes: [
      { type: 'mcq', count: 3, marksPerQuestion: 1 },
      { type: 'numerical', count: 5, marksPerQuestion: 3 },
      { type: 'long_answer', count: 1, marksPerQuestion: 6 },
    ],
    additionalInstructions: 'Mix factorisation, discriminant, and word problems.',
    result: {
      title: 'Quadratic Equations — Practice Set',
      subject: 'Mathematics',
      gradeLevel: 'Class 10',
      dueDate: '2025-06-23',
      totalMarks: 24,
      timeAllowedMinutes: 60,
      sections: [
        {
          id: 's1',
          title: 'Section A — MCQ',
          instruction: 'Choose one correct option.',
          questions: [
            {
              id: 'q1',
              text: 'The discriminant of x² − 5x + 6 = 0 is:',
              type: 'mcq',
              difficulty: 'easy',
              marks: 1,
              options: ['1', '−1', '25', '49'],
              answer: '1',
            },
          ],
        },
        {
          id: 's2',
          title: 'Section B — Solve',
          instruction: 'Show all steps.',
          questions: [
            {
              id: 'q2',
              text: 'Solve by factorisation: x² + 7x + 12 = 0.',
              type: 'numerical',
              difficulty: 'moderate',
              marks: 3,
              answer: '(x + 3)(x + 4) = 0 ⇒ x = −3 or x = −4.',
            },
            {
              id: 'q3',
              text: 'The product of two consecutive positive integers is 132. Find them.',
              type: 'numerical',
              difficulty: 'challenging',
              marks: 3,
              answer: 'n(n+1) = 132 ⇒ n² + n − 132 = 0 ⇒ n = 11. Integers are 11 and 12.',
            },
          ],
        },
      ],
    },
  },
  {
    jobId: 'demo-mughal-history-class7',
    title: 'The Mughal Empire — Akbar to Aurangzeb',
    subject: 'History',
    gradeLevel: 'Class 7',
    dueDate: '2025-06-28',
    questionTypes: [
      { type: 'fill_blank', count: 5, marksPerQuestion: 1 },
      { type: 'short_answer', count: 3, marksPerQuestion: 3 },
      { type: 'long_answer', count: 1, marksPerQuestion: 5 },
    ],
    additionalInstructions: 'Cover administrative reforms, mansabdari, and Din-i-Ilahi.',
    result: {
      title: 'The Mughal Empire — Akbar to Aurangzeb',
      subject: 'History',
      gradeLevel: 'Class 7',
      dueDate: '2025-06-28',
      totalMarks: 19,
      timeAllowedMinutes: 50,
      sections: [
        {
          id: 's1',
          title: 'Section A — Fill in the Blanks',
          instruction: '',
          questions: [
            {
              id: 'q1',
              text: 'Akbar founded a syncretic religious order called ____.',
              type: 'fill_blank',
              difficulty: 'easy',
              marks: 1,
              answer: 'Din-i-Ilahi',
            },
            {
              id: 'q2',
              text: 'The Mughal system of ranking officials was called ____.',
              type: 'fill_blank',
              difficulty: 'easy',
              marks: 1,
              answer: 'Mansabdari',
            },
          ],
        },
      ],
    },
  },
  {
    jobId: 'demo-acids-bases-class10',
    title: 'Acids, Bases & Salts',
    subject: 'Chemistry',
    gradeLevel: 'Class 10',
    dueDate: '2025-06-22',
    questionTypes: [
      { type: 'mcq', count: 4, marksPerQuestion: 1 },
      { type: 'true_false', count: 4, marksPerQuestion: 1 },
      { type: 'short_answer', count: 2, marksPerQuestion: 3 },
    ],
    result: {
      title: 'Acids, Bases & Salts',
      subject: 'Chemistry',
      gradeLevel: 'Class 10',
      dueDate: '2025-06-22',
      totalMarks: 14,
      timeAllowedMinutes: 40,
      sections: [
        {
          id: 's1',
          title: 'Section A',
          instruction: '',
          questions: [
            {
              id: 'q1',
              text: 'A solution with pH 3 is:',
              type: 'mcq',
              difficulty: 'easy',
              marks: 1,
              options: ['Strongly acidic', 'Weakly acidic', 'Neutral', 'Basic'],
              answer: 'Strongly acidic',
            },
            {
              id: 'q2',
              text: 'True or False: Litmus is a synthetic indicator.',
              type: 'true_false',
              difficulty: 'easy',
              marks: 1,
              answer: 'False',
            },
          ],
        },
      ],
    },
  },
  {
    jobId: 'demo-poetry-class8',
    title: 'Poetry Analysis — Robert Frost',
    subject: 'English Literature',
    gradeLevel: 'Class 8',
    dueDate: '2025-06-26',
    questionTypes: [
      { type: 'short_answer', count: 4, marksPerQuestion: 2 },
      { type: 'long_answer', count: 2, marksPerQuestion: 5 },
    ],
    additionalInstructions: 'Focus on “The Road Not Taken” and “Stopping by Woods on a Snowy Evening”.',
    result: {
      title: 'Poetry Analysis — Robert Frost',
      subject: 'English Literature',
      gradeLevel: 'Class 8',
      dueDate: '2025-06-26',
      totalMarks: 18,
      timeAllowedMinutes: 60,
      sections: [
        {
          id: 's1',
          title: 'Comprehension',
          instruction: 'Refer to the poems studied in class.',
          questions: [
            {
              id: 'q1',
              text: 'What do the two roads in “The Road Not Taken” symbolise?',
              type: 'short_answer',
              difficulty: 'moderate',
              marks: 2,
              answer: 'Choices in life; the speaker reflects on how a single decision can shape the rest of one’s journey.',
            },
            {
              id: 'q2',
              text: 'Identify the rhyme scheme of “Stopping by Woods on a Snowy Evening”.',
              type: 'short_answer',
              difficulty: 'moderate',
              marks: 2,
              answer: 'AABA BBCB CCDC DDDD — a chain rhyme that locks each stanza to the next.',
            },
          ],
        },
      ],
    },
  },
  {
    jobId: 'demo-trigonometry-class10',
    title: 'Introduction to Trigonometry',
    subject: 'Mathematics',
    gradeLevel: 'Class 10',
    dueDate: '2025-07-02',
    questionTypes: [
      { type: 'mcq', count: 3, marksPerQuestion: 1 },
      { type: 'numerical', count: 4, marksPerQuestion: 3 },
    ],
    result: {
      title: 'Introduction to Trigonometry',
      subject: 'Mathematics',
      gradeLevel: 'Class 10',
      dueDate: '2025-07-02',
      totalMarks: 15,
      timeAllowedMinutes: 45,
      sections: [
        {
          id: 's1',
          title: 'Section A',
          instruction: '',
          questions: [
            {
              id: 'q1',
              text: 'sin² 30° + cos² 30° = ?',
              type: 'mcq',
              difficulty: 'easy',
              marks: 1,
              options: ['0', '1/2', '1', '√3/2'],
              answer: '1',
            },
          ],
        },
      ],
    },
  },
  {
    jobId: 'demo-french-revolution-class9',
    title: 'The French Revolution — Causes & Consequences',
    subject: 'History',
    gradeLevel: 'Class 9',
    dueDate: '2025-07-05',
    questionTypes: [
      { type: 'short_answer', count: 4, marksPerQuestion: 2 },
      { type: 'long_answer', count: 2, marksPerQuestion: 5 },
    ],
    result: {
      title: 'The French Revolution — Causes & Consequences',
      subject: 'History',
      gradeLevel: 'Class 9',
      dueDate: '2025-07-05',
      totalMarks: 18,
      timeAllowedMinutes: 60,
      sections: [
        {
          id: 's1',
          title: 'Section A',
          instruction: '',
          questions: [
            {
              id: 'q1',
              text: 'List any three social causes of the French Revolution.',
              type: 'short_answer',
              difficulty: 'moderate',
              marks: 2,
              answer: 'Estates system inequality, privileged clergy/nobility, heavy tax burden on Third Estate.',
            },
          ],
        },
      ],
    },
  },
];

async function seed() {
  await connectMongo();
  let upserts = 0;
  for (const d of demos) {
    await Assignment.updateOne(
      { jobId: d.jobId },
      {
        $set: {
          title: d.title,
          subject: d.subject,
          gradeLevel: d.gradeLevel,
          dueDate: d.dueDate,
          questionTypes: d.questionTypes,
          additionalInstructions: d.additionalInstructions,
          schoolName: SCHOOL,
          teacherName: TEACHER,
          status: 'completed',
          result: d.result,
        },
        $setOnInsert: { jobId: d.jobId, createdAt: new Date() },
      },
      { upsert: true }
    );
    upserts += 1;
  }
  console.log(`[seed] upserted ${upserts} demo assignments`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
