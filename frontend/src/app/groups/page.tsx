'use client';

import { useState } from 'react';
import { Plus, Trash2, IdCard, Users, X } from 'lucide-react';
import { useGroups } from '@/store/groups';

export default function GroupsPage() {
  const groups = useGroups((s) => s.groups);
  const add = useGroups((s) => s.add);
  const remove = useGroups((s) => s.remove);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [studentCount, setStudentCount] = useState('');

  const submit = () => {
    if (!name.trim() || !gradeLevel.trim()) return;
    add({
      name: name.trim(),
      gradeLevel: gradeLevel.trim(),
      studentCount: Number(studentCount) || 0,
    });
    setName('');
    setGradeLevel('');
    setStudentCount('');
    setShowForm(false);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6 px-1">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-3 h-3 mt-2 rounded-full bg-accent-green shrink-0" />
          <div>
            <h1 className="text-[22px] lg:text-[28px] font-bold tracking-tight text-ink-950 leading-tight">
              My Groups
            </h1>
            <p className="text-[14px] lg:text-[15px] text-ink-500 mt-1">
              Organise your students into class groups.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="hidden sm:inline-flex items-center gap-2 h-11 px-5 rounded-full bg-ink-900 text-white text-[14px] font-semibold hover:bg-ink-800 active:scale-[0.99] transition-all"
        >
          <Plus className="w-4 h-4" strokeWidth={2.4} />
          Add Group
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-card p-5 lg:p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] lg:text-[18px] font-bold text-ink-950">New Class Group</h2>
            <button
              onClick={() => setShowForm(false)}
              className="w-9 h-9 rounded-full hover:bg-ink-50 flex items-center justify-center text-ink-500"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[14px] font-bold text-ink-950 mb-2">Class Name</label>
              <input
                className="input-pill"
                placeholder="e.g. Section A - Science"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[14px] font-bold text-ink-950 mb-2">Grade / Year</label>
              <input
                className="input-pill"
                placeholder="e.g. 8th"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[14px] font-bold text-ink-950 mb-2">Students</label>
              <input
                type="number"
                className="input-pill"
                placeholder="e.g. 32"
                value={studentCount}
                onChange={(e) => setStudentCount(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="inline-flex items-center h-11 px-5 rounded-full bg-white border border-ink-200 text-ink-950 text-[14px] font-semibold hover:bg-ink-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!name.trim() || !gradeLevel.trim()}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-ink-900 text-white text-[14px] font-semibold hover:bg-ink-800 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" strokeWidth={2.4} />
              Create
            </button>
          </div>
        </div>
      )}

      {groups.length === 0 && !showForm ? (
        <EmptyGroups onAdd={() => setShowForm(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <div key={g.id} className="bg-white rounded-2xl shadow-card p-5 group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-ink-100 text-ink-700 flex items-center justify-center">
                  <IdCard className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <button
                  onClick={() => remove(g.id)}
                  className="w-9 h-9 rounded-full text-ink-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center opacity-60 hover:opacity-100 transition-all"
                  aria-label="Remove group"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                </button>
              </div>
              <div className="text-[16px] font-bold text-ink-950 leading-tight">{g.name}</div>
              <div className="text-[12px] text-ink-500 mt-1">
                Grade {g.gradeLevel}
              </div>
              <div className="mt-4 flex items-center gap-2 text-[13px] text-ink-700">
                <Users className="w-4 h-4" strokeWidth={1.8} />
                <span className="font-semibold">{g.studentCount}</span>
                <span className="text-ink-500">students</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="sm:hidden fixed bottom-32 right-4 z-30 inline-flex items-center gap-2 h-12 px-5 rounded-full bg-ink-900 text-white text-[14px] font-semibold btn-stroke-shadow-dark active:scale-[0.99] transition-all"
        >
          <Plus className="w-5 h-5" strokeWidth={2.4} />
          Add Group
        </button>
      )}
    </div>
  );
}

function EmptyGroups({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-white rounded-3xl shadow-card py-16 lg:py-24 px-6 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-full bg-ink-50 flex items-center justify-center mb-5">
        <Users className="w-9 h-9 text-ink-400" strokeWidth={1.5} />
      </div>
      <h2 className="text-[18px] lg:text-[20px] font-bold text-ink-950">
        No groups yet
      </h2>
      <p className="mt-2 text-[14px] text-ink-500 max-w-md">
        Create a class group to keep your students organised. You can add as many as you need.
      </p>
      <button
        onClick={onAdd}
        className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-ink-900 text-white text-[15px] font-semibold hover:bg-ink-800 active:scale-[0.99] transition-all"
      >
        <Plus className="w-[18px] h-[18px]" strokeWidth={2.2} />
        Create Your First Group
      </button>
    </div>
  );
}
