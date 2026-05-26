'use client';

import { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { useProfile, useProfileStore, type Profile } from '@/lib/profile';

export default function SettingsPage() {
  const profile = useProfile();
  const update = useProfileStore((s) => s.update);

  const [form, setForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const setField = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await update(form);
      setSavedAt(Date.now());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-24 text-ink-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading profile…
      </div>
    );
  }

  return (
    <div className="w-full max-w-[920px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-3 h-3 mt-2 rounded-full bg-accent-green shrink-0" />
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-ink-950 leading-tight">
            Settings
          </h1>
          <p className="text-[15px] text-ink-500 mt-1">
            Profile, school information, and default values for new assignments.
          </p>
        </div>
      </div>

      <div className="bg-warmpaper rounded-3xl shadow-card p-10">
        <h2 className="text-[22px] font-bold text-ink-950">Profile</h2>
        <p className="text-[15px] text-ink-500 mt-1 mb-7">
          These details appear on the sidebar, topbar, and every generated paper.
        </p>

        {/* Teacher */}
        <FormRow label="Teacher Name">
          <input
            className="input-pill"
            value={form.teacherName ?? ''}
            onChange={(e) => setField('teacherName', e.target.value)}
            placeholder="e.g. Lakshya"
          />
        </FormRow>

        <FormRow label="Teacher Email (optional)">
          <input
            type="email"
            className="input-pill"
            value={form.teacherEmail ?? ''}
            onChange={(e) => setField('teacherEmail', e.target.value)}
            placeholder="you@school.edu"
          />
        </FormRow>

        {/* School */}
        <FormRow label="School Name">
          <input
            className="input-pill"
            value={form.schoolName ?? ''}
            onChange={(e) => setField('schoolName', e.target.value)}
            placeholder="Delhi Public School, Sector-4, Bokaro"
          />
        </FormRow>

        <FormRow label="School Location">
          <input
            className="input-pill"
            value={form.schoolLocation ?? ''}
            onChange={(e) => setField('schoolLocation', e.target.value)}
            placeholder="Bokaro Steel City"
          />
        </FormRow>

        {/* Defaults */}
        <h3 className="mt-8 text-[18px] font-bold text-ink-950">Defaults for new assignments</h3>
        <p className="text-[14px] text-ink-500 mt-1 mb-5">
          Pre-fill the Create form with these values.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Default Subject">
            <input
              className="input-pill"
              value={form.defaultSubject ?? ''}
              onChange={(e) => setField('defaultSubject', e.target.value)}
              placeholder="e.g. Science"
            />
          </FormRow>
          <FormRow label="Default Class / Grade">
            <input
              className="input-pill"
              value={form.defaultGradeLevel ?? ''}
              onChange={(e) => setField('defaultGradeLevel', e.target.value)}
              placeholder="e.g. 8th"
            />
          </FormRow>
        </div>

        {error && (
          <div className="mt-5 p-3 rounded-xl bg-red-50 border border-red-200 text-[14px] text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2.5 h-14 px-8 rounded-full bg-ink-900 text-white text-[16px] font-semibold hover:bg-ink-800 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-[20px] h-[20px] animate-spin" />
                Saving…
              </>
            ) : (
              <>Save Changes</>
            )}
          </button>
          {savedAt && !saving && (
            <span className="inline-flex items-center gap-2 text-[14px] text-accent-green font-medium">
              <Check className="w-4 h-4" strokeWidth={2.4} />
              Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="block text-[15px] font-bold text-ink-950 mb-2">{label}</label>
      {children}
    </div>
  );
}
