import { Schema, model, Document } from 'mongoose';

export interface ProfileDoc extends Document {
  teacherName: string;
  teacherEmail?: string;
  schoolName: string;
  schoolLocation: string;
  defaultSubject?: string;
  defaultGradeLevel?: string;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<ProfileDoc>(
  {
    teacherName: { type: String, required: true, default: 'Lakshya' },
    teacherEmail: String,
    schoolName: {
      type: String,
      required: true,
      default: 'Delhi Public School, Sector-4, Bokaro',
    },
    schoolLocation: {
      type: String,
      required: true,
      default: 'Bokaro Steel City',
    },
    defaultSubject: String,
    defaultGradeLevel: String,
  },
  { timestamps: true }
);

export const Profile = model<ProfileDoc>('Profile', profileSchema);

/**
 * Returns the singleton profile, seeding it with defaults on first call.
 */
export async function getOrCreateProfile(): Promise<ProfileDoc> {
  const existing = await Profile.findOne();
  if (existing) return existing;
  return Profile.create({});
}
