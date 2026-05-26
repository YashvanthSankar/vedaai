import type { Assignment, AssignmentSummary, QuestionTypeSpec } from './types';

const BASE = '/api/assignments';

export interface CreateAssignmentInput {
  title: string;
  subject?: string;
  gradeLevel?: string;
  dueDate: string;
  questionTypes: QuestionTypeSpec[];
  additionalInstructions?: string;
  schoolName?: string;
  teacherName?: string;
  file?: File | null;
}

export interface CreateAssignmentResponse {
  assignmentId: string;
  jobId: string;
  status: string;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function createAssignment(
  input: CreateAssignmentInput
): Promise<CreateAssignmentResponse> {
  const { file, ...rest } = input;
  if (file) {
    const fd = new FormData();
    fd.append('payload', JSON.stringify(rest));
    fd.append('file', file);
    const res = await fetch(BASE, { method: 'POST', body: fd });
    return asJson(res);
  }
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rest),
  });
  return asJson(res);
}

export async function listAssignments(params: {
  search?: string;
  limit?: number;
  skip?: number;
} = {}): Promise<{ items: AssignmentSummary[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.skip) qs.set('skip', String(params.skip));
  const url = qs.toString() ? `${BASE}?${qs}` : BASE;
  const res = await fetch(url, { cache: 'no-store' });
  return asJson(res);
}

export async function getAssignment(id: string): Promise<Assignment> {
  const res = await fetch(`${BASE}/${id}`, { cache: 'no-store' });
  return asJson(res);
}

export async function regenerateAssignment(
  id: string
): Promise<CreateAssignmentResponse> {
  const res = await fetch(`${BASE}/${id}/regenerate`, { method: 'POST' });
  return asJson(res);
}

export async function deleteAssignment(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

export function pdfUrl(id: string): string {
  return `${BASE}/${id}/pdf`;
}

export const api = {
  createAssignment,
  listAssignments,
  getAssignment,
  regenerateAssignment,
  deleteAssignment,
  pdfUrl,
};
