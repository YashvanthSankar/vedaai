'use client';

import {
  DIFFICULTY_LABEL,
  type GeneratedPaper,
  type GeneratedSection,
} from '@/lib/types';
import { useProfile } from '@/lib/profile';

export function PaperView({
  paper,
  schoolName,
}: {
  paper: GeneratedPaper;
  schoolName?: string;
}) {
  const profile = useProfile();
  const hasAnswers = paper.sections.some((s) =>
    s.questions.some((q) => q.answer && q.answer.trim().length > 0)
  );
  const headerSchool = schoolName ?? profile?.schoolName ?? 'Your School';
  return (
    <div className="paper-page rounded-3xl bg-paper px-5 sm:px-10 lg:px-20 py-8 lg:py-16 font-serif text-ink-950">
      {/* School + subject header — centered, serif, bold */}
      <div className="text-center">
        <h1 className="font-bold text-[20px] sm:text-[26px] lg:text-[32px] tracking-tight leading-tight">
          {headerSchool}
        </h1>
        {paper.subject && (
          <div className="mt-2 text-[15px] sm:text-[18px] lg:text-[20px] font-bold">
            Subject: {paper.subject}
          </div>
        )}
        {paper.gradeLevel && (
          <div className="mt-1 text-[15px] sm:text-[18px] lg:text-[20px] font-bold">
            Class: {paper.gradeLevel}
          </div>
        )}
      </div>

      {/* Time / Maximum Marks row */}
      <div className="mt-10 flex justify-between items-center text-[16px] font-bold">
        <div>
          Time Allowed: {paper.timeAllowedMinutes ?? 60} minutes
        </div>
        <div>Maximum Marks: {paper.totalMarks}</div>
      </div>

      <p className="mt-5 text-[16px] font-bold">
        All questions are compulsory unless stated otherwise.
      </p>

      {/* Student info */}
      <div className="mt-8 space-y-3 text-[16px] font-bold">
        <div className="flex items-center gap-2 flex-wrap">
          <span>Name:</span>
          <input className="underline-field flex-1 max-w-xs" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span>Roll Number:</span>
          <input className="underline-field flex-1 max-w-xs" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span>Class:</span>
          <span className="font-normal">{paper.gradeLevel ?? ''}</span>
          <span className="ml-3">Section:</span>
          <input className="underline-field max-w-[120px]" />
        </div>
      </div>

      {/* Sections */}
      <div className="mt-14 space-y-14">
        {paper.sections.map((section) => (
          <SectionBlock key={section.id} section={section} />
        ))}
      </div>

      <div className="mt-12 text-[16px] font-bold">End of Question Paper</div>

      {hasAnswers && (
        <div className="mt-14">
          <h2 className="text-[18px] font-bold mb-5">Answer Key:</h2>
          <AnswerKey paper={paper} />
        </div>
      )}
    </div>
  );
}

function SectionBlock({ section }: { section: GeneratedSection }) {
  return (
    <div>
      <h2 className="text-center text-[24px] font-bold mb-8">{section.title}</h2>
      {section.instruction && (
        <>
          <div className="text-[16px] font-bold mb-1">Short Answer Questions</div>
          <p className="text-[14px] italic text-ink-500 mb-6">
            {section.instruction}
          </p>
        </>
      )}
      <ol className="space-y-5 list-decimal pl-7 text-[15px] leading-[1.7]">
        {section.questions.map((q) => (
          <li key={q.id} className="text-ink-950">
            [{DIFFICULTY_LABEL[q.difficulty]}] {q.text} [{q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}]
            {q.type === 'mcq' && q.options && (
              <ol className="mt-2 ml-2 space-y-1.5">
                {q.options.map((opt, oi) => (
                  <li key={oi}>
                    <span className="font-bold mr-2">
                      {String.fromCharCode(65 + oi)}.
                    </span>
                    {opt}
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function AnswerKey({ paper }: { paper: GeneratedPaper }) {
  let counter = 0;
  const rows: { n: number; text: string }[] = [];
  for (const section of paper.sections) {
    for (const q of section.questions) {
      counter += 1;
      if (q.answer && q.answer.trim()) {
        rows.push({ n: counter, text: q.answer });
      }
    }
  }
  return (
    <ol className="space-y-4 list-decimal pl-7 text-[15px] leading-[1.7] text-ink-950">
      {rows.map((r) => (
        <li key={r.n} className="whitespace-pre-wrap">
          {r.text}
        </li>
      ))}
    </ol>
  );
}
