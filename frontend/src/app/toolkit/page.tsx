'use client';

import { useRouter } from 'next/navigation';
import {
  Zap,
  Brain,
  ClipboardCheck,
  Sparkles,
  TestTube,
  Layers,
} from 'lucide-react';
import { useDraft } from '@/store/draft';
import type { QuestionTypeSpec } from '@/lib/types';

interface Preset {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accentBg: string;
  accentText: string;
  questionTypes: QuestionTypeSpec[];
  additionalInstructions: string;
}

const PRESETS: Preset[] = [
  {
    id: 'quick-quiz',
    title: 'Quick Quiz',
    subtitle: '10 questions • mixed difficulty • 20 minutes',
    icon: Zap,
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-700',
    questionTypes: [
      { type: 'mcq', count: 6, marksPerQuestion: 1 },
      { type: 'short_answer', count: 4, marksPerQuestion: 2 },
    ],
    additionalInstructions:
      'Generate a quick formative quiz suitable for a 20-minute class check. Mix easy and moderate difficulty.',
  },
  {
    id: 'long-test',
    title: 'Long Test',
    subtitle: '25 questions • exam-style • 90 minutes',
    icon: ClipboardCheck,
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-700',
    questionTypes: [
      { type: 'mcq', count: 10, marksPerQuestion: 1 },
      { type: 'short_answer', count: 10, marksPerQuestion: 2 },
      { type: 'long_answer', count: 5, marksPerQuestion: 5 },
    ],
    additionalInstructions:
      'Generate a full-length examination paper. Include a balanced mix of recall, application, and analysis questions across all three difficulty levels.',
  },
  {
    id: 'diagnostic',
    title: 'Diagnostic Test',
    subtitle: 'Conceptual gaps • 15 questions • 30 minutes',
    icon: Brain,
    accentBg: 'bg-purple-50',
    accentText: 'text-purple-700',
    questionTypes: [
      { type: 'mcq', count: 10, marksPerQuestion: 1 },
      { type: 'short_answer', count: 5, marksPerQuestion: 2 },
    ],
    additionalInstructions:
      'Generate a diagnostic test that surfaces common misconceptions. Each question should target a specific concept; favour distractor-rich MCQs and short conceptual prompts.',
  },
  {
    id: 'numerical',
    title: 'Numerical Practice',
    subtitle: 'Calculation-heavy • 12 problems • 45 minutes',
    icon: TestTube,
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-700',
    questionTypes: [
      { type: 'numerical', count: 8, marksPerQuestion: 3 },
      { type: 'short_answer', count: 4, marksPerQuestion: 2 },
    ],
    additionalInstructions:
      'Generate a calculation-heavy practice paper with numerical problems. Show working steps in the answer key.',
  },
  {
    id: 'diagram-based',
    title: 'Diagram-Based',
    subtitle: 'Visual reasoning • 10 questions • 35 minutes',
    icon: Layers,
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-700',
    questionTypes: [
      { type: 'diagram_graph', count: 6, marksPerQuestion: 3 },
      { type: 'short_answer', count: 4, marksPerQuestion: 2 },
    ],
    additionalInstructions:
      'Generate questions that reference diagrams, graphs, or figures. Describe the visual in the question text since the paper is text-only.',
  },
  {
    id: 'rapid-review',
    title: 'Rapid Review',
    subtitle: 'Fast-fire • 15 questions • 15 minutes',
    icon: Sparkles,
    accentBg: 'bg-rose-50',
    accentText: 'text-rose-700',
    questionTypes: [
      { type: 'true_false', count: 8, marksPerQuestion: 1 },
      { type: 'fill_blank', count: 7, marksPerQuestion: 1 },
    ],
    additionalInstructions:
      'Generate fast-fire review questions to revise a chapter quickly. Keep questions short and crisp.',
  },
];

export default function ToolkitPage() {
  const router = useRouter();
  const draft = useDraft();

  const applyPreset = (preset: Preset) => {
    draft.setRows(preset.questionTypes);
    draft.setField('additionalInstructions', preset.additionalInstructions);
    router.push('/assignments/new');
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6 px-1">
        <div className="w-3 h-3 mt-2 rounded-full bg-accent-green shrink-0" />
        <div>
          <h1 className="text-[22px] lg:text-[28px] font-bold tracking-tight text-ink-950 leading-tight">
            AI Teacher&apos;s Toolkit
          </h1>
          <p className="text-[14px] lg:text-[15px] text-ink-500 mt-1">
            Preset templates to kick off a new assignment in one click.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="text-left bg-white rounded-2xl shadow-card p-5 lg:p-6 hover:shadow-floating transition-shadow active:scale-[0.99]"
            >
              <div
                className={`w-11 h-11 rounded-xl ${preset.accentBg} ${preset.accentText} flex items-center justify-center mb-4`}
              >
                <Icon className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <div className="text-[17px] lg:text-[18px] font-bold text-ink-950 leading-tight">
                {preset.title}
              </div>
              <div className="text-[13px] text-ink-500 mt-1.5 leading-snug">
                {preset.subtitle}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {preset.questionTypes.map((qt) => (
                  <span
                    key={qt.type}
                    className="px-2.5 py-1 rounded-full bg-ink-50 text-ink-700 text-[11px] font-semibold"
                  >
                    {qt.count}× {labelFor(qt.type)}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function labelFor(type: QuestionTypeSpec['type']) {
  const map: Record<QuestionTypeSpec['type'], string> = {
    mcq: 'MCQ',
    short_answer: 'Short',
    long_answer: 'Long',
    true_false: 'T/F',
    fill_blank: 'Fill',
    diagram_graph: 'Diagram',
    numerical: 'Numerical',
  };
  return map[type];
}
