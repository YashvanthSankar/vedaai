'use client';

import { useEffect, useRef, useState } from 'react';
import type { JobStatus, GeneratedPaper, ServerEvent } from './types';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:4000/ws`
    : 'ws://localhost:4000/ws');

export interface GenerationProgress {
  status: JobStatus | 'connecting';
  progress: number;
  message: string;
  result?: GeneratedPaper;
  error?: string;
}

export function useGenerationStream(jobId: string | null): GenerationProgress {
  const [state, setState] = useState<GenerationProgress>({
    status: 'connecting',
    progress: 0,
    message: 'Connecting…',
  });

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (cancelled) return;
      ws.send(JSON.stringify({ type: 'subscribe', jobId }));
      setState((s) => ({ ...s, status: 'queued', message: 'Queued…', progress: 5 }));
    };

    ws.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data) as ServerEvent;
        if (event.type === 'subscribed') return;
        if (event.type === 'status') {
          setState({
            status: event.status,
            progress: event.progress ?? 30,
            message: event.message ?? 'Working…',
          });
        } else if (event.type === 'completed') {
          setState({
            status: 'completed',
            progress: 100,
            message: 'Done!',
            result: event.result,
          });
        } else if (event.type === 'failed') {
          setState({
            status: 'failed',
            progress: 100,
            message: 'Failed',
            error: event.error,
          });
        }
      } catch {
        // ignore
      }
    };

    ws.onerror = () => {
      setState((s) => ({
        ...s,
        status: 'failed',
        message: 'WebSocket error',
        error: 'WebSocket connection failed',
      }));
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [jobId]);

  return state;
}
