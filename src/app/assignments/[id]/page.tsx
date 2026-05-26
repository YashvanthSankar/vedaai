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
  return (
    <div className="max-w-xl mx-auto py-20 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-ink-950 flex items-center justify-center mb-6">
        <SparklesFilled size={28} className="text-white" />
      </div>
      <h1 className="text-[22px] font-bold mb-2">Generating your paper</h1>
      <p className="text-[14px] text-ink-500 mb-1">{title}</p>
      <p className="text-[13px] text-ink-400 mb-8">{message}</p>
      <div className="h-2 bg-ink-100 rounded-full overflow-hidden mx-auto max-w-sm">
        <div
          className="h-full bg-ink-950 transition-all duration-500 ease-out"
          style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
        />
      </div>
      <div className="mt-6 text-[13px] text-ink-400">
        This usually takes 10–30 seconds. You can keep this tab open.
      </div>
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
      <div className="rounded-[24px] bg-ink-700 px-8 py-8 lg:px-10 lg:py-10 mb-6 text-white">
        <p className="text-[18px] lg:text-[22px] font-bold leading-relaxed">
          {intro}
        </p>
        <div className="mt-6 flex items-center gap-3 flex-wrap">
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
