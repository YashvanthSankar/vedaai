'use client';

import { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useProfile, useProfileStore } from '@/lib/profile';

/**
 * Profile edit modal — opens from the topbar user chip.
 * Lets the teacher quickly edit their display name + email without leaving the page.
 */
export function ProfileEditModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const profile = useProfile();
  const update = useProfileStore((s) => s.update);

  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setTeacherName(profile.teacherName);
      setTeacherEmail(profile.teacherEmail ?? '');
      setError(null);
      setSaved(false);
    }
  }, [open, profile]);

  const save = async () => {
    if (!teacherName.trim()) {
      setError('Teacher name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await update({ teacherName: teacherName.trim(), teacherEmail: teacherEmail.trim() });
      setSaved(true);
      setTimeout(onClose, 600);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Profile"
      subtitle="Your name appears on the topbar and every paper you generate."
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center h-11 px-5 rounded-full bg-white border border-ink-200 text-ink-950 text-[14px] font-semibold hover:bg-ink-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !teacherName.trim()}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-ink-900 text-white text-[14px] font-semibold hover:bg-ink-800 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4" strokeWidth={2.4} />
                Saved
              </>
            ) : (
              <>Save</>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4 py-2">
        <div>
          <label className="block text-[14px] font-bold text-ink-950 mb-2">Teacher Name</label>
          <input
            className="input-pill"
            placeholder="e.g. Lakshya"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-[14px] font-bold text-ink-950 mb-2">
            Email <span className="text-ink-500 font-normal">(optional)</span>
          </label>
          <input
            type="email"
            className="input-pill"
            placeholder="you@school.edu"
            value={teacherEmail}
            onChange={(e) => setTeacherEmail(e.target.value)}
          />
        </div>
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * School edit modal — opens from the sidebar school card.
 */
export function SchoolEditModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const profile = useProfile();
  const update = useProfileStore((s) => s.update);

  const [schoolName, setSchoolName] = useState('');
  const [schoolLocation, setSchoolLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setSchoolName(profile.schoolName);
      setSchoolLocation(profile.schoolLocation);
      setError(null);
      setSaved(false);
    }
  }, [open, profile]);

  const save = async () => {
    if (!schoolName.trim() || !schoolLocation.trim()) {
      setError('Both school name and location are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await update({
        schoolName: schoolName.trim(),
        schoolLocation: schoolLocation.trim(),
      });
      setSaved(true);
      setTimeout(onClose, 600);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit School"
      subtitle="Shown in the sidebar card and as the header on every generated paper."
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center h-11 px-5 rounded-full bg-white border border-ink-200 text-ink-950 text-[14px] font-semibold hover:bg-ink-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !schoolName.trim() || !schoolLocation.trim()}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-ink-900 text-white text-[14px] font-semibold hover:bg-ink-800 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4" strokeWidth={2.4} />
                Saved
              </>
            ) : (
              <>Save</>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4 py-2">
        <div>
          <label className="block text-[14px] font-bold text-ink-950 mb-2">School Name</label>
          <input
            className="input-pill"
            placeholder="e.g. Delhi Public School, Sector-4, Bokaro"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-[14px] font-bold text-ink-950 mb-2">Location</label>
          <input
            className="input-pill"
            placeholder="e.g. Bokaro Steel City"
            value={schoolLocation}
            onChange={(e) => setSchoolLocation(e.target.value)}
          />
        </div>
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
