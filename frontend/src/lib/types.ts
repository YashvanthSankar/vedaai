export type QuestionType =
  | 'mcq'
  | 'short_answer'
  | 'long_answer'
  | 'true_false'
  | 'fill_blank'
  | 'diagram_graph'
  | 'numerical';

export type Difficulty = 'easy' | 'moderate' | 'challenging';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface QuestionTypeSpec {
  type: QuestionType;
  count: number;
  marksPerQuestion: number;
}

export interface GeneratedQuestion {
  id: string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  options?: string[];
  answer?: string;
}

export interface GeneratedSection {
  id: string;
  title: string;
  instruction: string;
  questions: GeneratedQuestion[];
}

export interface GeneratedPaper {
  title: string;
  subject?: string;
  gradeLevel?: string;
  dueDate: string;
  totalMarks: number;
  timeAllowedMinutes?: number;
  sections: GeneratedSection[];
  introMessage?: string;
}

export interface Assignment {
  _id: string;
  title: string;
  subject?: string;
  gradeLevel?: string;
  dueDate: string;
  questionTypes: QuestionTypeSpec[];
  additionalInstructions?: string;
  schoolName?: string;
  teacherName?: string;
  jobId: string;
  status: JobStatus;
  result?: GeneratedPaper;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentSummary {
  _id: string;
  title: string;
  subject?: string;
  gradeLevel?: string;
  dueDate: string;
  status: JobStatus;
  jobId: string;
  createdAt: string;
  updatedAt: string;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'Multiple Choice Questions',
  short_answer: 'Short Questions',
  long_answer: 'Long Answer Questions',
  true_false: 'True / False',
  fill_blank: 'Fill in the Blank',
  diagram_graph: 'Diagram / Graph-Based Questions',
  numerical: 'Numerical Problems',
};

export const QUESTION_TYPE_ORDER: QuestionType[] = [
  'mcq',
  'short_answer',
  'long_answer',
  'true_false',
  'fill_blank',
  'diagram_graph',
  'numerical',
];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  challenging: 'Challenging',
};

export type ServerEvent =
  | {
      type: 'status';
      jobId: string;
      status: JobStatus;
      progress?: number;
      message?: string;
    }
  | { type: 'completed'; jobId: string; result: GeneratedPaper }
  | { type: 'failed'; jobId: string; error: string }
  | { type: 'subscribed'; jobId: string };
