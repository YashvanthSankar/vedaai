import { Request, Response } from 'express';
import { getOrCreateProfile, Profile } from '../models/Profile';

export async function getProfile(_req: Request, res: Response) {
  try {
    const profile = await getOrCreateProfile();
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const allowed = [
      'teacherName',
      'teacherEmail',
      'schoolName',
      'schoolLocation',
      'defaultSubject',
      'defaultGradeLevel',
    ] as const;

    const patch: Record<string, unknown> = {};
    for (const k of allowed) {
      if (k in req.body) patch[k] = req.body[k];
    }

    // Reject blank required fields
    if ('teacherName' in patch && !String(patch.teacherName || '').trim()) {
      return res.status(400).json({ error: 'teacherName cannot be empty' });
    }
    if ('schoolName' in patch && !String(patch.schoolName || '').trim()) {
      return res.status(400).json({ error: 'schoolName cannot be empty' });
    }
    if ('schoolLocation' in patch && !String(patch.schoolLocation || '').trim()) {
      return res.status(400).json({ error: 'schoolLocation cannot be empty' });
    }

    // Ensure singleton exists
    const existing = await getOrCreateProfile();
    const updated = await Profile.findByIdAndUpdate(existing._id, patch, {
      new: true,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
