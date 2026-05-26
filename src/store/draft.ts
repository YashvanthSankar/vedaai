'use client';

import { create } from 'zustand';
import type { QuestionType, QuestionTypeSpec } from '@/lib/types';

export interface DraftState {
  title: string;
  subject: string;
  gradeLevel: string;
  dueDate: string;
  questionTypes: QuestionTypeSpec[];
  additionalInstructions: string;
  schoolName: string;
  teacherName: string;
  file: File | null;
  setField: <K extends keyof Omit<DraftState, 'setField' | 'addRow' | 'updateRow' | 'removeRow' | 'reset' | 'questionTypes' | 'file'>>(k: K, v: DraftState[K]) => void;
  setFile: (f: File | null) => void;
  setRows: (rows: QuestionTypeSpec[]) => void;
  addRow: () => void;
  updateRow: (idx: number, patch: Partial<QuestionTypeSpec>) => void;
  removeRow: (idx: number) => void;
  reset: () => void;
}

const DEFAULT_ROWS: QuestionTypeSpec[] = [
  { type: 'mcq', count: 4, marksPerQuestion: 1 },
  { type: 'short_answer', count: 3, marksPerQuestion: 2 },
];

const initial = {
  title: '',
  subject: '',
  gradeLevel: '',
  dueDate: '',
  questionTypes: DEFAULT_ROWS,
  additionalInstructions: '',
  schoolName: 'Delhi Public School, Sector-4, Bokaro',
  teacherName: 'Lakshya',
  file: null as File | null,
};

const TYPE_FALLBACK_ORDER: QuestionType[] = [
  'mcq',
  'short_answer',
  'long_answer',
  'true_false',
  'fill_blank',
  'diagram_graph',
  'numerical',
];

export const useDraft = create<DraftState>((set, get) => ({
  ...initial,
  setField: (k, v) => set({ [k]: v } as Partial<DraftState>),
  setFile: (f) => set({ file: f }),
  setRows: (rows) => set({ questionTypes: rows }),
  addRow: () => {
    const used = new Set(get().questionTypes.map((r) => r.type));
    const nextType =
      TYPE_FALLBACK_ORDER.find((t) => !used.has(t)) ?? 'short_answer';
    set({
      questionTypes: [
        ...get().questionTypes,
        { type: nextType, count: 3, marksPerQuestion: 2 },
      ],
    });
  },
  updateRow: (idx, patch) =>
    set({
      questionTypes: get().questionTypes.map((row, i) =>
        i === idx ? { ...row, ...patch } : row
      ),
    }),
  removeRow: (idx) =>
    set({
      questionTypes: get().questionTypes.filter((_, i) => i !== idx),
    }),
  reset: () => set(initial),
}));
