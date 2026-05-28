'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  RefreshCw,
  Loader2,
  AlertTriangle,
  FileDown,
} from 'lucide-react';
import { getAssignment, regenerateAssignment, pdfUrl } from '@/lib/api';
import { useGenerationStream } from '@/lib/ws';
import type { Assignment, GeneratedPaper } from '@/lib/types';
import { PaperView } from '@/components/PaperView';
import { SparklesFilled } from '@/components/Brand';
import { cn } from '@/lib/cn';

export default function AssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const id = params.id;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(search.get('jobId'));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const a = await getAssignment(id);
      setAssignment(a);
      if (a.status === 'queued' || a.status === 'processing') {
        setActiveJobId(a.jobId);
      } else {
        setActiveJobId(null);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const stream = useGenerationStream(activeJobId);

  useEffect(() => {
    if (stream.status === 'completed' || stream.status === 'failed') {
      reload();
    }
  }, [stream.status, reload]);

  const onRegenerate = async () => {
    try {
      const r = await regenerateAssignment(id);
      setActiveJobId(r.jobId);
      router.replace(`/assignments/${id}?jobId=${r.jobId}`);
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const isGenerating =
    assignment?.status === 'queued' ||
    assignment?.status === 'processing' ||
    (activeJobId !== null && stream.status !== 'completed' && stream.status !== 'failed');

  if (!assignment && !error) {
    return (
      <div className="flex items-center justify-center py-24 text-ink-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white rounded-2xl shadow-card p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-accent-red mx-auto mb-3" />
          <h2 className="text-[18px] font-bold mb-2">Could not load</h2>
          <p className="text-[14px] text-ink-500">{error}</p>
        </div>
      </div>
    );
  }

  if (assignment.status === 'failed') {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white rounded-3xl shadow-card p-10 text-center">
          <AlertTriangle className="w-10 h-10 text-accent-red mx-auto mb-4" />
          <h2 className="text-[20px] font-bold mb-2">Generation failed</h2>
          <p className="text-[14px] text-ink-500 mb-6">
            {assignment.error || 'Something went wrong.'}
          </p>
          <button
            onClick={onRegenerate}
            className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-ink-950 text-white text-[15px] font-medium hover:bg-ink-900 transition-colors"
          >
            <RefreshCw className="w-[18px] h-[18px]" strokeWidth={2} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <GeneratingView
        progress={stream.progress}
        message={stream.message}
        title={assignment.title}
      />
    );
  }

  const paper = assignment.result;
  if (!paper) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-ink-500">
        No paper yet.
      </div>
    );
  }

  return (
    <ResultView assignment={assignment} paper={paper} onRegenerate={onRegenerate} />
  );
}

function GeneratingView({
  progress,
  message,
  title,
}: {
  progress: number;
  message: string;
  title: string;
}) {
  // Subtle, on-brand status copy. Phrased like a teacher's prep checklist,
  // not "the AI is thinking" — keeps the tone calm and intentional.
  const stages = [
    'Reading your source material',
    'Drafting the question set',
    'Balancing marks and difficulty',
    'Finishing touches',
  ];
  const [stageIdx, setStageIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setStageIdx((i) => (i + 1) % stages.length),
      3200
    );
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const clamped = Math.max(4, Math.min(100, progress));
  return (
    <div className="max-w-md mx-auto py-16 lg:py-24 text-center px-4">
      {/* Single sparkle mark — pulses gently. No orbits, no glowing rings.
          Matches the brand sparkle used in the sidebar CTA. */}
      <div className="relative inline-flex items-center justify-center mb-7">
        <span className="absolute inset-0 rounded-full bg-brand-500/10 animate-[brand-pulse_2.4s_ease-in-out_infinite]" />
        <span className="relative w-12 h-12 rounded-full bg-ink-950 flex items-center justify-center">
          <SparklesFilled size={20} className="text-white" />
        </span>
      </div>

      <h1 className="text-[22px] lg:text-[26px] font-bold tracking-tight text-ink-950 leading-tight">
        Preparing your paper
      </h1>
      {title ? (
        <p className="mt-1.5 text-[14px] text-ink-500 truncate">{title}</p>
      ) : null}

      {/* Stage list — current item bolded with a small filled dot;
          the others sit in muted ink, matching the teacher-checklist tone. */}
      <ul className="mt-8 space-y-2.5 text-left max-w-[280px] mx-auto">
        {stages.map((s, i) => {
          const done = i < stageIdx;
          const current = i === stageIdx;
          return (
            <li
              key={s}
              className="flex items-center gap-3 text-[13.5px] leading-snug"
            >
              <span
                className={cn(
                  'inline-block w-1.5 h-1.5 rounded-full shrink-0 transition-colors',
                  current
                    ? 'bg-brand-500 animate-[brand-pulse_1.4s_ease-in-out_infinite]'
                    : done
                    ? 'bg-ink-400'
                    : 'bg-ink-200'
                )}
              />
              <span
                className={cn(
                  'transition-colors',
                  current
                    ? 'text-ink-950 font-semibold'
                    : done
                    ? 'text-ink-500'
                    : 'text-ink-300'
                )}
              >
                {s}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Hairline progress bar — very thin, brand-tinted fill, no sheen.
          Live message (from the worker) sits subtly beneath. */}
      <div className="mt-9 mx-auto max-w-[280px]">
        <div className="h-[3px] bg-ink-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-700 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2.5 text-[11.5px] text-ink-400">
          <span className="truncate pr-2">{message || stages[stageIdx]}</span>
          <span className="tabular-nums font-semibold text-ink-500 shrink-0">
            {clamped}%
          </span>
        </div>
      </div>

      <p className="mt-10 text-[12px] text-ink-400">
        Usually 10–30 seconds. Feel free to keep this tab open.
      </p>
    </div>
  );
}

function ResultView({
  assignment,
  paper,
  onRegenerate,
}: {
  assignment: Assignment;
  paper: GeneratedPaper;
  onRegenerate: () => void;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const handleRegen = async () => {
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  const intro =
    paper.introMessage ||
    `Certainly! Here is your customized Question Paper${assignment.subject ? ` for ${assignment.subject}` : ''}${assignment.gradeLevel ? ` (Class ${assignment.gradeLevel})` : ''}.`;

  return (
    <div className="w-full max-w-[1080px] mx-auto pb-16">
      {/* Dark AI message card with Download as PDF — 24px radius (matches Figma) */}
      <div className="rounded-[24px] bg-ink-700 px-5 py-6 lg:px-10 lg:py-10 mb-5 lg:mb-6 text-white">
        <p className="text-[15px] lg:text-[22px] font-bold leading-relaxed">
          {intro}
        </p>
        <div className="mt-5 lg:mt-6 flex items-center gap-3 flex-wrap">
          <a
            href={pdfUrl(assignment._id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 h-12 px-6 rounded-full bg-white text-ink-950 text-[15px] font-semibold btn-shadow-light hover:bg-ink-50 active:scale-[0.99] transition-all"
          >
            <FileDown className="w-[18px] h-[18px]" strokeWidth={1.8} />
            Download as PDF
          </a>
          <button
            onClick={handleRegen}
            disabled={regenerating}
            className="inline-flex items-center gap-2.5 h-12 px-6 rounded-full bg-ink-900 text-white text-[15px] font-semibold border border-white/10 hover:bg-ink-800 active:scale-[0.99] transition-all disabled:opacity-60"
          >
            {regenerating ? (
              <Loader2 className="w-[18px] h-[18px] animate-spin" />
            ) : (
              <RefreshCw className="w-[18px] h-[18px]" strokeWidth={1.8} />
            )}
            Regenerate
          </button>
        </div>
      </div>

      <PaperView paper={paper} schoolName={assignment.schoolName} />
    </div>
  );
}
