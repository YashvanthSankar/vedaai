'use client';

import { useEffect } from 'react';
import { create } from 'zustand';

export interface Profile {
  teacherName: string;
  teacherEmail?: string;
  schoolName: string;
  schoolLocation: string;
  defaultSubject?: string;
  defaultGradeLevel?: string;
}

const BASE = '/api/profile';

interface ProfileStore {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  update: (patch: Partial<Profile>) => Promise<Profile>;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  loading: false,
  error: null,
  async fetch() {
    if (get().profile) return;
    set({ loading: true, error: null });
    try {
      const r = await fetch(BASE, { cache: 'no-store' });
      if (!r.ok) throw new Error(`Failed to load profile: ${r.status}`);
      const profile = (await r.json()) as Profile;
      set({ profile, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  async update(patch) {
    const r = await fetch(BASE, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({ error: r.statusText }));
      throw new Error(body.error || `Update failed: ${r.status}`);
    }
    const profile = (await r.json()) as Profile;
    set({ profile });
    return profile;
  },
}));

/** Convenience hook: triggers a fetch on first mount, returns the cached profile. */
export function useProfile(): Profile | null {
  const profile = useProfileStore((s) => s.profile);
  const load = useProfileStore((s) => s.fetch);
  useEffect(() => {
    load();
  }, [load]);
  return profile;
}
