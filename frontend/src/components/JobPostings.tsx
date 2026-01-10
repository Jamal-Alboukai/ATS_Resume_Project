import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Users,
  Clock,
  Search,
  X,
  Upload,
  CheckCircle
} from 'lucide-react';
import { atsApi } from '../services/atsApi';
import { useAuth } from './AuthContext';

type JobProfile = {
  id: string;
  title: string;
  description: string;
  minimumExperience: number;
  requiredSkills: string[];
  preferredSkills: string[];
};

export function JobPostings() {
  const { user } = useAuth();
  const isCandidate = user?.role === 'candidate';

  const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingJob, setEditingJob] = useState<JobProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Application modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create/Edit profile modal
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createMinExperience, setCreateMinExperience] = useState(0);
  const [createRequiredSkills, setCreateRequiredSkills] = useState('');
  const [createPreferredSkills, setCreatePreferredSkills] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const glassStyle = {
    backdropFilter: 'blur(16px)',
    background: 'rgba(255, 255, 255, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1)'
  };

  useEffect(() => {
    loadJobProfiles();
  }, []);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
    if (user?.name) setFullName(user.name);
  }, [user]);

  const loadJobProfiles = async () => {
    try {
      setIsLoading(true);
      const profiles = await atsApi.getJobProfiles();
      setJobProfiles(profiles as JobProfile[]);
    } catch (error) {
      console.error('Failed to load job profiles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Apply Handlers ---

  const openApplyModal = (jobId: string) => {
    setSelectedJobId(jobId);
    setResumeFile(null);
    setIsModalOpen(true);
  };

  const closeApplyModal = () => {
    setIsModalOpen(false);
    setSelectedJobId(null);
    setResumeFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId || !resumeFile) {
      alert("Please upload a resume.");
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('fullName', fullName);
      formData.append('email', email);

      await atsApi.applyToJobWithResume(selectedJobId, formData);

      alert('Application submitted successfully!');
      closeApplyModal();
    } catch (error: any) {
      console.error('Application failed:', error);
      alert(`Failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Job Profile Handlers (Create / Edit / Delete) ---

  const parseSkillsInput = (value: string) =>
    value.split(',').map((s) => s.trim()).filter(Boolean);

  const resetCreateForm = () => {
    setCreateTitle('');
    setCreateDescription('');
    setCreateMinExperience(0);
    setCreateRequiredSkills('');
    setCreatePreferredSkills('');
    setEditingJob(null); // Clear editing state
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateForm(true);
  };

  // NEW: Pre-fill form for editing
  const openEditModal = (job: JobProfile) => {
    setEditingJob(job);
    setCreateTitle(job.title);
    setCreateDescription(job.description);
    setCreateMinExperience(job.minimumExperience);
    setCreateRequiredSkills(job.requiredSkills.join(', '));
    setCreatePreferredSkills(job.preferredSkills.join(', '));
    setShowCreateForm(true);
  };

  const closeCreateModal = () => {
    setShowCreateForm(false);
    resetCreateForm();
  };

  // NEW: Handle Delete
  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm("Are you sure you want to delete this job? This cannot be undone.")) return;
    try {
      await atsApi.deleteJobProfile(jobId);
      loadJobProfiles(); // Refresh list
    } catch (error: any) {
      console.error('Failed to delete job:', error);
      alert(`Failed to delete: ${error.message || 'Unknown error'}`);
    }
  };

  // UPDATED: Handle both Create and Edit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      alert('Title is required');
      return;
    }

    try {
      setIsSavingProfile(true);
      const jobData = {
        title: createTitle.trim(),
        description: createDescription.trim(),
        minimumExperience: Number(createMinExperience) || 0,
        requiredSkills: parseSkillsInput(createRequiredSkills),
        preferredSkills: parseSkillsInput(createPreferredSkills),
      };

      if (editingJob) {
        // UPDATE existing job
        await atsApi.updateJobProfile(editingJob.id, jobData);
      } else {
        // CREATE new job
        await atsApi.createJobProfile(jobData);
      }

      await loadJobProfiles();
      closeCreateModal();
    } catch (error: any) {
      console.error('Failed to save job profile:', error);
      alert(`Failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const filteredJobs = jobProfiles.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
            Job Postings
          </h1>
          <p className="text-gray-600 mt-1">View and apply to open positions.</p>
        </div>
        {!isCandidate && (
          <button
            onClick={openCreateModal}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Create Job Profile
          </button>
        )}
      </div>

      {/* Search */}
      <div className="rounded-2xl p-4" style={glassStyle}>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-white/40 bg-white/40 focus:bg-white/80 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder-gray-500 text-gray-800"
          />
        </div>
      </div>

      {/* Job Cards */}
      {filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredJobs.map((job) => (
            <div key={job.id} className="rounded-2xl p-6 hover:shadow-xl transition-all duration-300 flex flex-col" style={glassStyle}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-teal-500 rounded-xl flex items-center justify-center shadow-sm">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{job.title}</h3>
                    <p className="text-sm text-gray-600">Full Time • Remote</p>
                  </div>
                </div>
              </div>

              <p className="text-gray-700 mb-6 line-clamp-2 text-sm flex-grow">{job.description}</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/40 p-3 rounded-lg border border-white/50">
                   <p className="text-xs text-gray-600 mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Experience</p>
                   <p className="font-semibold text-gray-800">{job.minimumExperience}+ Years</p>
                </div>
                <div className="bg-white/40 p-3 rounded-lg border border-white/50">
                   <p className="text-xs text-gray-600 mb-1 flex items-center gap-1"><Users className="w-3 h-3"/> Applicants</p>
                   <p className="font-semibold text-gray-800">Active</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                 {job.requiredSkills.slice(0, 4).map((skill, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white/50 text-purple-700 text-xs font-medium rounded-md border border-purple-100">
                       {skill}
                    </span>
                 ))}
                 {job.requiredSkills.length > 4 && <span className="text-xs text-gray-500 self-center">+{job.requiredSkills.length - 4}</span>}
              </div>

              <div className="mt-auto">
                {isCandidate ? (
                  <button
                    onClick={() => openApplyModal(job.id)}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-teal-600 text-white font-medium rounded-xl hover:shadow-md transition-all active:scale-95"
                  >
                    Apply Now
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditModal(job)} 
                      className="flex-1 py-2 bg-white/50 text-gray-700 font-medium rounded-xl hover:bg-white/80 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteJob(job.id)} 
                      className="p-2 bg-red-50/50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-2xl" style={glassStyle}>
          <p className="text-gray-500">No jobs found matching your search.</p>
        </div>
      )}

      {/* Create / Edit Job Profile Modal */}
      {showCreateForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            style={{ backgroundColor: '#ffffff' }}
          >
            <div className="bg-gradient-to-r from-purple-600 to-teal-600 p-6 text-white flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">{editingJob ? 'Edit Job Profile' : 'Create Job Profile'}</h2>
                <p className="text-purple-100 text-sm mt-1">Define the role and required skills.</p>
              </div>
              <button onClick={closeCreateModal} className="text-white/80 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="e.g., Senior Backend Engineer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                  rows={4}
                  placeholder="Brief role overview"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Experience (years)</label>
                  <input
                    type="number"
                    min={0}
                    value={createMinExperience}
                    onChange={(e) => setCreateMinExperience(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills (comma-separated)</label>
                  <input
                    type="text"
                    value={createRequiredSkills}
                    onChange={(e) => setCreateRequiredSkills(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="React, Node.js, SQL"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Skills (comma-separated)</label>
                <input
                  type="text"
                  value={createPreferredSkills}
                  onChange={(e) => setCreatePreferredSkills(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="AWS, Docker, TypeScript"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-teal-600 text-white font-medium rounded-lg hover:shadow-md transition-all disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving...' : (editingJob ? 'Update Profile' : 'Create Profile')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            style={{ backgroundColor: '#ffffff' }}
          >
            <div className="bg-gradient-to-r from-purple-600 to-teal-600 p-6 text-white flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">Apply for Job</h2>
                <p className="text-purple-100 text-sm mt-1">Fill in your details and upload your resume.</p>
              </div>
              <button onClick={closeApplyModal} className="text-white/80 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitApplication} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Resume</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-purple-50 hover:border-purple-300 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />
                  {resumeFile ? (
                    <div className="text-center">
                      <CheckCircle className="w-8 h-8 text-teal-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-800">{resumeFile.name}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Click to upload resume (PDF/DOC)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeApplyModal}
                  className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-teal-600 text-white font-medium rounded-lg hover:shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}