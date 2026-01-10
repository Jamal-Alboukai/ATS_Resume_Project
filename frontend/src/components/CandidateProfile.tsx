import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Download,
  Edit3,
  FileText,
  MapPin,
  Phone,
  Sparkles,
  User2,
} from "lucide-react";
import { atsApi, CandidateProfile } from "../services/atsApi";
import { ProfileEditDialog } from "./ProfileEditDialog";

const sampleProfile: CandidateProfile = {
  id: "cand-123",
  name: "Alex Rivera",
  email: "alex.rivera@example.com",
  phone: "+1 415-555-1212",
  location: "San Francisco, CA",
  headline: "Full-stack engineer with 6 years experience",
  summary: "Building scalable web apps with React/Node/Flask.",
  skills: ["react", "typescript", "python", "flask", "docker"],
  experience: [
    {
      title: "Senior Engineer",
      company: "Acme",
      start: "2021-01",
      end: "2024-06",
      summary: "Built ATS features.",
    },
  ],
  education: [
    { degree: "B.Sc. Computer Science", institution: "State University", year: "2018" },
  ],
  preferences: {
    roles: ["Full-stack Engineer"],
    locations: ["Remote", "SF Bay Area"],
    workType: "remote",
    salaryRange: "130k-160k",
  },
  lastLogin: "2025-01-12T15:30:00Z",
  profileCompletion: 82,
  latestResume: {
    id: "resume-789",
    filename: "alex_rivera_resume.pdf",
    uploadedAt: "2025-01-10T12:00:00Z",
  },
};

export function CandidateProfile() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const data = await atsApi.getProfile();
        setProfile(data);
      } catch (err) {
        setProfile(sampleProfile);
        setError("Profile service unreachable. Showing demo profile.");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const completionPercent = useMemo(() => {
    return profile?.profileCompletion ?? 0;
  }, [profile]);

  const handleSave = async (updated: Partial<CandidateProfile>) => {
    if (!profile) return;
    setSaving(true);
    try {
      const saved = await atsApi.updateProfile({ ...profile, ...updated });
      setProfile(saved);
      setEditOpen(false);
    } catch (err) {
      setError("Unable to save profile right now.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 w-full animate-pulse rounded-xl bg-white/60 shadow" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-white/60 shadow" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/80 p-6 text-center text-slate-600">
        Unable to load profile.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Profile</h1>
          <p className="text-sm text-slate-500">
            Keep your details fresh to improve match quality.
          </p>
        </div>
        <button
          onClick={() => setEditOpen(true)}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium"
        >
          <Edit3 className="w-5 h-5" />
          Edit Profile
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[0.32fr_0.68fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-teal-500 text-white text-lg font-semibold">
                {profile.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">{profile.name}</p>
                <p className="text-sm text-slate-500">{profile.email}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              {profile.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-teal-600" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  <span>{profile.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User2 className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-500">
                  Last login: {new Date(profile.lastLogin).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Profile completion</p>
              <span className="text-xs text-slate-500">{completionPercent}%</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-teal-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Complete your profile to improve job matches.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Latest resume</p>
              <Download className="w-4 h-4 text-slate-500" />
            </div>
            {profile.latestResume ? (
              <>
                <p className="mt-2 text-sm text-slate-700">
                  {profile.latestResume.filename}
                </p>
                <p className="text-xs text-slate-500">
                  Uploaded: {new Date(profile.latestResume.uploadedAt).toLocaleString()}
                </p>
                <button className="mt-3 text-xs font-semibold text-teal-700 hover:text-teal-800">
                  Upload new resume
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-500">No resume on file yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Headline</p>
                <p className="text-xs text-slate-500">{profile.headline}</p>
              </div>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <p className="mt-2 text-sm text-slate-700">{profile.summary || "Add a summary to boost matches."}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Skills</p>
              <span className="text-xs text-slate-500">{profile.skills.length} skills</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700"
                >
                  {skill}
                </span>
              ))}
              {profile.skills.length === 0 && (
                <span className="text-sm text-slate-500">Add skills to improve searchability.</span>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow">
              <p className="text-sm font-semibold text-slate-800">Experience</p>
              <div className="mt-2 space-y-3">
                {profile.experience.map((exp) => (
                  <div key={`${exp.title}-${exp.company}`} className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-800">{exp.title}</p>
                    <p className="text-xs text-slate-500">
                      {exp.company} • {exp.start} - {exp.end}
                    </p>
                    <p className="text-xs text-slate-600">{exp.summary}</p>
                  </div>
                ))}
                {profile.experience.length === 0 && (
                  <p className="text-sm text-slate-500">Add your recent experience.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow">
              <p className="text-sm font-semibold text-slate-800">Education</p>
              <div className="mt-2 space-y-3">
                {profile.education.map((edu) => (
                  <div key={`${edu.degree}-${edu.institution}`} className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-800">{edu.degree}</p>
                    <p className="text-xs text-slate-500">
                      {edu.institution} • {edu.year}
                    </p>
                  </div>
                ))}
                {profile.education.length === 0 && (
                  <p className="text-sm text-slate-500">Add your latest education.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Job preferences</p>
              <FileText className="w-4 h-4 text-slate-500" />
            </div>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Roles</p>
                <p className="text-sm text-slate-700">
                  {profile.preferences.roles.join(", ") || "Add preferred roles"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Locations</p>
                <p className="text-sm text-slate-700">
                  {profile.preferences.locations.join(", ") || "Add preferred locations"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Work type</p>
                <p className="text-sm text-slate-700">{profile.preferences.workType || "Select work type"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Salary range</p>
                <p className="text-sm text-slate-700">
                  {profile.preferences.salaryRange || "Add salary expectations"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProfileEditDialog
        open={editOpen}
        profile={profile}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
