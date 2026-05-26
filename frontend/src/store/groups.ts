'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ClassGroup {
  id: string;
  name: string;
  gradeLevel: string;
  studentCount: number;
  createdAt: string;
}

interface GroupsStore {
  groups: ClassGroup[];
  add: (input: Omit<ClassGroup, 'id' | 'createdAt'>) => void;
  remove: (id: string) => void;
}

export const useGroups = create<GroupsStore>()(
  persist(
    (set) => ({
      groups: [],
      add: (input) =>
        set((s) => ({
          groups: [
            ...s.groups,
            {
              ...input,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      remove: (id) => set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),
    }),
    { name: 'vedaai-groups' }
  )
);
