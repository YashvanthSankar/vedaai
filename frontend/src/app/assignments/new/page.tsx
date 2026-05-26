'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  Minus,
  Plus,
  UploadCloud,
  X,
  Mic,
  FileText as FileIcon,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useDraft } from '@/store/draft';
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_ORDER,
  type QuestionType,
} from '@/lib/types';
import { createAssignment } from '@/lib/api';
import { useProfile } from '@/lib/profile';
import { cn } from '@/lib/cn';

type Step = 1 | 2;

export default function NewAssignmentPage() {
  const router = useRouter();
  const draft = useDraft();
  const profile = useProfile();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed draft with profile defaults on first load (only fill empty fields)
  useEffect(() => {
    if (!profile) return;
    const patch: Partial<{ schoolName: string; teacherName: string; subject: string; gradeLevel: string }> = {};
    if (!draft.schoolName) patch.schoolName = profile.schoolName;
    if (!draft.teacherName) patch.teacherName = profile.teacherName;
    if (!draft.subject && profile.defaultSubject) patch.subject = profile.defaultSubject;
    if (!draft.gradeLevel && profile.defaultGradeLevel) patch.gradeLevel = profile.defaultGradeLevel;
    if (Object.keys(patch).length > 0) {
      for (const [k, v] of Object.entries(patch)) {
        draft.setField(k as 'schoolName', v as string);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const { totalQuestions, totalMarks } = useMemo(() => {
    let q = 0, m = 0;
    for (const r of draft.questionTypes) {
      q += r.count;
      m += r.count * r.marksPerQuestion;
    }
    return { totalQuestions: q, totalMarks: m };
  }, [draft.questionTypes]);

  const validate = (): string | null => {
    if (!draft.title.trim()) return 'Please enter an assignment title.';
    if (!draft.dueDate) return 'Please pick a due date.';
    if (!draft.questionTypes.length) return 'Add at least one question type.';
    for (const r of draft.questionTypes) {
      if (!r.count || r.count < 1) return 'Each question type needs at least 1 question.';
      if (!r.marksPerQuestion || r.marksPerQuestion < 1) return 'Marks must be at least 1.';
    }
    if (totalQuestions > 100) return 'Total questions cannot exceed 100.';
    const seen = new Set<QuestionType>();
    for (const r of draft.questionTypes) {
      if (seen.has(r.type)) return 'Each question type can only be added once.';
      seen.add(r.type);
    }
    return null;
  };

  const next = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(2);
  };

  const generate = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const r = await createAssignment({
        title: draft.title.trim(),
        subject: draft.subject.trim() || undefined,
        gradeLevel: draft.gradeLevel.trim() || undefined,
        dueDate: draft.dueDate,
        questionTypes: draft.questionTypes,
        additionalInstructions: draft.additionalInstructions.trim() || undefined,
        schoolName: draft.schoolName.trim() || undefined,
        teacherName: draft.teacherName.trim() || undefined,
        file: draft.file,
      });
      router.push(`/assignments/${r.assignmentId}?jobId=${r.jobId}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[920px] mx-auto">
      {/* Page header */}
      <div className="flex items-start gap-3 mb-6 px-1">
        <div className="w-3 h-3 mt-2 rounded-full bg-accent-green shrink-0" />
        <div>
          <h1 className="text-[22px] lg:text-[28px] font-bold tracking-tight text-ink-950 leading-tight">
            Create Assignment
          </h1>
          <p className="text-[14px] lg:text-[15px] text-ink-500 mt-1">
            Set up a new assignment for your students.
          </p>
        </div>
      </div>

      {/* Stepper */}
      <Stepper step={step} />

      {step === 1 ? (
        <Step1Card
          totalQuestions={totalQuestions}
          totalMarks={totalMarks}
          error={error}
        />
      ) : (
        <Step2Card totalQuestions={totalQuestions} totalMarks={totalMarks} />
      )}

      {/* Footer — h-14, 16px semibold, full pill, exact spacing */}
      <div className="flex items-center justify-between mt-8 pb-12">
        <button
          onClick={() => (step === 2 ? setStep(1) : router.back())}
          disabled={submitting}
          className="inline-flex items-center gap-2.5 h-12 px-6 lg:h-14 lg:px-8 rounded-full bg-white border border-ink-200 text-ink-950 text-[16px] font-semibold btn-shadow-light hover:bg-ink-50 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          <ArrowLeft className="w-[20px] h-[20px]" strokeWidth={2.2} />
          Previous
        </button>
        {step === 1 ? (
          <button
            onClick={next}
            className="inline-flex items-center gap-2.5 h-12 px-6 lg:h-14 lg:px-8 rounded-full bg-ink-900 text-white text-[16px] font-semibold btn-shadow-dark hover:bg-ink-800 active:scale-[0.99] transition-all"
          >
            Next
            <ArrowRight className="w-[20px] h-[20px]" strokeWidth={2.2} />
          </button>
        ) : (
          <button
            onClick={generate}
            disabled={submitting}
            className="inline-flex items-center gap-2.5 h-12 px-6 lg:h-14 lg:px-8 rounded-full bg-ink-900 text-white text-[16px] font-semibold btn-shadow-dark hover:bg-ink-800 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-[20px] h-[20px] animate-spin" />
                Generating…
              </>
            ) : (
              <>
                Generate
                <ArrowRight className="w-[20px] h-[20px]" strokeWidth={2.2} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-3 mb-7">
      <div className={cn('h-1.5 flex-1 rounded-full', step >= 1 ? 'bg-ink-950' : 'bg-ink-150')} />
      <div className={cn('h-1.5 flex-1 rounded-full', step >= 2 ? 'bg-ink-950' : 'bg-ink-150')} />
    </div>
  );
}

function Step1Card({
  totalQuestions,
  totalMarks,
  error,
}: {
  totalQuestions: number;
  totalMarks: number;
  error: string | null;
}) {
  const draft = useDraft();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const usedTypes = useMemo(
    () => new Set(draft.questionTypes.map((r) => r.type)),
    [draft.questionTypes]
  );

  const handleFile = useCallback(
    (f: File | null) => {
      if (!f) return draft.setFile(null);
      if (f.size > 10 * 1024 * 1024) return;
      draft.setFile(f);
    },
    [draft]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className="bg-warmpaper rounded-3xl shadow-card p-5 lg:p-10">
      <h2 className="text-[18px] lg:text-[22px] font-bold text-ink-950">Assignment Details</h2>
      <p className="text-[14px] lg:text-[15px] text-ink-500 mt-1 mb-6 lg:mb-7">
        Basic information about your assignment
      </p>

      {/* Title field — needed since backend requires one. Sized to feel native to the rest of the card. */}
      <div className="mb-5">
        <label className="block text-[14px] lg:text-[15px] font-bold text-ink-950 mb-2">Title</label>
        <input
          className="input-pill"
          placeholder="e.g. Quiz on Electricity"
          value={draft.title}
          onChange={(e) => draft.setField('title', e.target.value)}
        />
      </div>

      {/* Subject + Class row — stacks on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-[15px] font-bold text-ink-950 mb-2">Subject</label>
          <input
            className="input-pill"
            placeholder="e.g. Science"
            value={draft.subject}
            onChange={(e) => draft.setField('subject', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[15px] font-bold text-ink-950 mb-2">Class / Grade</label>
          <input
            className="input-pill"
            placeholder="e.g. 8th"
            value={draft.gradeLevel}
            onChange={(e) => draft.setField('gradeLevel', e.target.value)}
          />
        </div>
      </div>

      {/* Upload dropzone */}
      <div
        className={cn(
          'rounded-2xl border-[2px] border-dashed transition-colors px-6 py-12 text-center cursor-pointer',
          dragOver
            ? 'border-brand-500 bg-brand-50/40'
            : 'border-ink-200 hover:border-ink-300'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInput.current?.click()}
      >
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          accept=".pdf,.txt,application/pdf,text/*,image/jpeg,image/png"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {draft.file ? (
          <div className="flex items-center justify-center gap-3">
            <FileIcon className="w-6 h-6 text-ink-500" />
            <div className="text-left">
              <div className="font-medium text-[15px] text-ink-950">{draft.file.name}</div>
              <div className="text-[13px] text-ink-500">
                {(draft.file.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                draft.setFile(null);
              }}
              className="p-1.5 rounded-full hover:bg-ink-100 text-ink-500"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <UploadCloud className="w-9 h-9 text-ink-400 mx-auto mb-4" strokeWidth={1.5} />
            <div className="text-[18px] font-bold text-ink-950">
              Choose a file or drag &amp; drop it here
            </div>
            <div className="text-[14px] text-ink-500 mt-1">JPEG, PNG, upto 10MB</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInput.current?.click();
              }}
              className="mt-5 inline-flex items-center justify-center h-12 px-7 rounded-full bg-white border border-ink-200 text-ink-900 text-[15px] font-semibold btn-shadow-light hover:bg-ink-50 active:scale-[0.99] transition-all"
            >
              Browse Files
            </button>
          </>
        )}
      </div>
      <p className="text-[14px] text-ink-500 text-center mt-3">
        Upload images of your preferred document/image
      </p>

      {/* Due Date */}
      <div className="mt-6">
        <label className="block text-[15px] font-bold text-ink-950 mb-2">Due Date</label>
        <div className="relative">
          <input
            type="date"
            className="input-pill pr-14"
            placeholder="DD-MM-YYYY"
            value={draft.dueDate}
            onChange={(e) => draft.setField('dueDate', e.target.value)}
          />
          <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400 pointer-events-none" strokeWidth={1.8} />
        </div>
      </div>

      {/* Question Type Table — desktop = 4-col grid; mobile = stacked card per row */}
      <div className="mt-7">
        <div className="hidden md:grid grid-cols-[1fr_44px_120px_120px] gap-4 items-center text-[15px] text-ink-950 mb-3 px-1">
          <div className="font-bold">Question Type</div>
          <div />
          <div className="text-center font-bold text-ink-700">No. of Questions</div>
          <div className="text-center font-bold text-ink-700">Marks</div>
        </div>
        <div className="space-y-3.5">
          {draft.questionTypes.map((row, idx) => (
            <div key={idx}>
              {/* Desktop grid row */}
              <div className="hidden md:grid grid-cols-[1fr_44px_120px_120px] gap-4 items-center">
                <TypeSelect
                  value={row.type}
                  onChange={(t) => draft.updateRow(idx, { type: t })}
                  used={usedTypes}
                  self={row.type}
                />
                <button
                  onClick={() => draft.removeRow(idx)}
                  disabled={draft.questionTypes.length === 1}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30 transition-colors"
                  aria-label="Remove row"
                >
                  <X className="w-5 h-5" strokeWidth={1.8} />
                </button>
                <NumberStepper
                  value={row.count}
                  min={1}
                  max={50}
                  onChange={(v) => draft.updateRow(idx, { count: v })}
                />
                <NumberStepper
                  value={row.marksPerQuestion}
                  min={1}
                  max={100}
                  onChange={(v) => draft.updateRow(idx, { marksPerQuestion: v })}
                />
              </div>
              {/* Mobile stacked row */}
              <div className="md:hidden bg-white border border-ink-150 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <label className="block text-[12px] font-bold text-ink-700 mb-1.5">Question Type</label>
                    <TypeSelect
                      value={row.type}
                      onChange={(t) => draft.updateRow(idx, { type: t })}
                      used={usedTypes}
                      self={row.type}
                    />
                  </div>
                  <button
                    onClick={() => draft.removeRow(idx)}
                    disabled={draft.questionTypes.length === 1}
                    className="w-10 h-10 mt-6 flex items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 disabled:opacity-30 shrink-0"
                    aria-label="Remove row"
                  >
                    <X className="w-5 h-5" strokeWidth={1.8} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-ink-700 mb-1.5">No. of Questions</label>
                    <NumberStepper
                      value={row.count}
                      min={1}
                      max={50}
                      onChange={(v) => draft.updateRow(idx, { count: v })}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-ink-700 mb-1.5">Marks</label>
                    <NumberStepper
                      value={row.marksPerQuestion}
                      min={1}
                      max={100}
                      onChange={(v) => draft.updateRow(idx, { marksPerQuestion: v })}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <button
            onClick={draft.addRow}
            disabled={draft.questionTypes.length >= QUESTION_TYPE_ORDER.length}
            className="inline-flex items-center gap-2.5 text-[15px] font-medium text-ink-950 disabled:opacity-40"
          >
            <span className="w-7 h-7 flex items-center justify-center rounded-full bg-ink-100">
              <Plus className="w-4 h-4 text-ink-950" strokeWidth={2} />
            </span>
            Add Question Type
          </button>
          <div className="text-right text-[14px] text-ink-900 leading-relaxed">
            <div>
              <span className="font-bold">Total Questions</span>
              <span className="font-bold"> : {totalQuestions}</span>
            </div>
            <div>
              <span className="font-bold">Total Marks</span>
              <span className="font-bold"> : {totalMarks}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="mt-7">
        <label className="block text-[15px] font-bold text-ink-950 mb-2">
          Additional Information{' '}
          <span className="text-ink-500 font-normal">(For better output)</span>
        </label>
        <div className="relative">
          <textarea
            rows={4}
            className="textarea-pill pr-14"
            placeholder="e.g Generate a question paper for 3 hour exam duration…"
            value={draft.additionalInstructions}
            onChange={(e) => draft.setField('additionalInstructions', e.target.value)}
          />
          <Mic className="absolute right-5 bottom-4 w-5 h-5 text-ink-400" strokeWidth={1.8} />
        </div>
      </div>

      {error && (
        <div className="mt-5 p-3 rounded-xl bg-red-50 border border-red-200 text-[14px] text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

function Step2Card({
  totalQuestions,
  totalMarks,
}: {
  totalQuestions: number;
  totalMarks: number;
}) {
  const draft = useDraft();
  return (
    <div className="bg-warmpaper rounded-3xl shadow-card p-5 lg:p-10">
      <h2 className="text-[18px] lg:text-[22px] font-bold text-ink-950">Review &amp; Confirm</h2>
      <p className="text-[15px] text-ink-500 mt-1 mb-7">
        Double-check the details before generating your paper.
      </p>

      <ReviewRow label="Title" value={draft.title || '—'} />
      <ReviewRow label="Subject" value={draft.subject || '—'} />
      <ReviewRow label="Class / Grade" value={draft.gradeLevel || '—'} />
      <ReviewRow label="Due Date" value={formatHumanDate(draft.dueDate) || '—'} />
      <ReviewRow
        label="Reference Material"
        value={draft.file ? `${draft.file.name}  ·  ${(draft.file.size / 1024).toFixed(1)} KB` : 'None'}
      />

      <div className="mt-6">
        <div className="text-[15px] font-bold text-ink-950 mb-3">Question Types</div>
        <div className="rounded-2xl bg-white border border-ink-150 overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_120px] gap-4 px-5 py-3 bg-ink-50 text-[13px] font-bold text-ink-700 uppercase tracking-wide">
            <div>Type</div>
            <div className="text-center">Questions</div>
            <div className="text-center">Marks each</div>
          </div>
          {draft.questionTypes.map((row, idx) => (
            <div
              key={idx}
              className={cn(
                'grid grid-cols-[1fr_120px_120px] gap-4 px-5 py-3.5 text-[15px] text-ink-900 items-center',
                idx > 0 && 'border-t border-ink-100'
              )}
            >
              <div className="font-medium">{QUESTION_TYPE_LABELS[row.type]}</div>
              <div className="text-center">{row.count}</div>
              <div className="text-center">{row.marksPerQuestion}</div>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_120px_120px] gap-4 px-5 py-3.5 text-[15px] font-bold text-ink-950 bg-ink-50 border-t border-ink-150">
            <div>Total</div>
            <div className="text-center">{totalQuestions}</div>
            <div className="text-center">{totalMarks}</div>
          </div>
        </div>
      </div>

      {draft.additionalInstructions.trim() && (
        <div className="mt-6">
          <div className="text-[15px] font-bold text-ink-950 mb-2">Additional Information</div>
          <div className="rounded-2xl bg-white border border-ink-150 p-4 text-[14px] text-ink-700 whitespace-pre-wrap">
            {draft.additionalInstructions}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-2.5 text-[14px] text-ink-500">
        <CheckCircle2 className="w-5 h-5 text-accent-green" strokeWidth={1.8} />
        Ready to generate. Click Generate to send to the AI worker.
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 sm:gap-4 py-2.5 border-b border-ink-100 last:border-0">
      <div className="text-[14px] text-ink-500 font-medium">{label}</div>
      <div className="text-[15px] text-ink-950 font-medium">{value}</div>
    </div>
  );
}

function NumberStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="inline-flex items-center bg-ink-50 rounded-full h-12 px-1 w-full justify-between">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        className="w-10 h-10 flex items-center justify-center rounded-full text-ink-950 hover:bg-white"
        aria-label="Decrement"
      >
        <Minus className="w-4 h-4" strokeWidth={2} />
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        className="w-12 text-center text-[15px] font-bold bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        className="w-10 h-10 flex items-center justify-center rounded-full text-ink-950 hover:bg-white"
        aria-label="Increment"
      >
        <Plus className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
}

function TypeSelect({
  value,
  onChange,
  used,
  self,
}: {
  value: QuestionType;
  onChange: (v: QuestionType) => void;
  used: Set<QuestionType>;
  self: QuestionType;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as QuestionType)}
        className="input-pill appearance-none pr-12 cursor-pointer"
      >
        {QUESTION_TYPE_ORDER.map((t) => (
          <option key={t} value={t} disabled={t !== self && used.has(t)}>
            {QUESTION_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400 pointer-events-none" strokeWidth={1.8} />
    </div>
  );
}

function formatHumanDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}
