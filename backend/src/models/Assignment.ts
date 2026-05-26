import { Schema, model, Document } from 'mongoose';
import type {
  GeneratedPaper,
  JobStatus,
  QuestionTypeSpec,
} from '../types/assignment';
import { QUESTION_TYPES, DIFFICULTIES } from '../types/assignment';

export interface AssignmentDoc extends Document {
  title: string;
  subject?: string;
  gradeLevel?: string;
  dueDate: string;
  questionTypes: QuestionTypeSpec[];
  additionalInstructions?: string;
  sourceText?: string;
  schoolName?: string;
  teacherName?: string;
  jobId: string;
  status: JobStatus;
  result?: GeneratedPaper;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const questionTypeSpecSchema = new Schema<QuestionTypeSpec>(
  {
    type: { type: String, enum: QUESTION_TYPES, required: true },
    count: { type: Number, required: true, min: 1, max: 100 },
    marksPerQuestion: { type: Number, required: true, min: 1, max: 100 },
  },
  { _id: false }
);

const generatedQuestionSchema = new Schema(
  {
    id: String,
    text: String,
    type: { type: String, enum: QUESTION_TYPES },
    difficulty: { type: String, enum: DIFFICULTIES },
    marks: Number,
    options: [String],
    answer: String,
  },
  { _id: false }
);

const generatedSectionSchema = new Schema(
  {
    id: String,
    title: String,
    instruction: String,
    questions: [generatedQuestionSchema],
  },
  { _id: false }
);

const generatedPaperSchema = new Schema(
  {
    title: String,
    subject: String,
    gradeLevel: String,
    dueDate: String,
    totalMarks: Number,
    timeAllowedMinutes: Number,
    sections: [generatedSectionSchema],
    introMessage: String,
  },
  { _id: false }
);

const assignmentSchema = new Schema<AssignmentDoc>(
  {
    title: { type: String, required: true },
    subject: String,
    gradeLevel: String,
    dueDate: { type: String, required: true },
    questionTypes: { type: [questionTypeSpecSchema], required: true },
    additionalInstructions: String,
    sourceText: String,
    schoolName: String,
    teacherName: String,
    jobId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
    },
    result: generatedPaperSchema,
    error: String,
  },
  { timestamps: true }
);

assignmentSchema.index({ createdAt: -1 });

export const Assignment = model<AssignmentDoc>('Assignment', assignmentSchema);
