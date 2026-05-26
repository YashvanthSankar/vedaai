export type QuestionType =
  | 'mcq'
  | 'short_answer'
  | 'long_answer'
  | 'true_false'
  | 'fill_blank'
  | 'diagram_graph'
  | 'numerical';

export type Difficulty = 'easy' | 'moderate' | 'challenging';

export interface QuestionTypeSpec {
  type: QuestionType;
  count: number;
  marksPerQuestion: number;
}

export interface AssignmentInput {
  title: string;
  subject?: string;
  gradeLevel?: string;
  dueDate: string;
  questionTypes: QuestionTypeSpec[];
  additionalInstructions?: string;
  sourceText?: string;
  schoolName?: string;
  teacherName?: string;
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

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export const QUESTION_TYPES: QuestionType[] = [
  'mcq',
  'short_answer',
  'long_answer',
  'true_false',
  'fill_blank',
  'diagram_graph',
  'numerical',
];

export const DIFFICULTIES: Difficulty[] = ['easy', 'moderate', 'challenging'];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'Multiple Choice Questions',
  short_answer: 'Short Questions',
  long_answer: 'Long Answer Questions',
  true_false: 'True / False',
  fill_blank: 'Fill in the Blank',
  diagram_graph: 'Diagram / Graph-Based Questions',
  numerical: 'Numerical Problems',
};
