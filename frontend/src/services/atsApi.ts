// ATS API Service - Real backend implementation (Flask + Docker)

interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
}

interface Section {
  name: string;
  score: number;
  status: string;
  found: boolean;
}

interface Skill {
  name: string;
  confidence: number;
  category: string;
}

interface Experience {
  totalYears: number;
  positions: Array<{
    title: string;
    company: string;
    duration: string;
    skills: string[];
  }>;
}

interface Education {
  degree: string;
  institution: string;
  year: string;
}

interface JobMatch {
  title: string;
  matchPercentage: number;
  missingSkills: string[];
  strengths: string[];
  recommendations: string[];
}

interface Keywords {
  found: string[];
  missing: string[];
  density: number;
}

interface Formatting {
  score: number;
  issues: string[];
}

interface Analysis {
  overallScore: number;
  personalInfo: PersonalInfo;
  sections: Section[];
  skills: Skill[];
  experience: Experience;
  education: Education[];
  jobMatch: JobMatch;
  keywords: Keywords;
  formatting: Formatting;
  analysisDate: string;
  textLength: number;
}

interface Resume {
  id: string;
  filename: string;
  uploadDate: string;
  status: 'completed' | 'processing' | 'failed' | 'queued' | 'rejected';
  analysis?: Analysis;
}

interface JobProfile {
  id: string;
  title: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minimumExperience: number;
  description: string;
}

interface AnalysisStatus {
  status: 'processing' | 'completed' | 'failed' | 'unknown' | 'queued';
  progress?: number;
  completed?: number;
  total?: number;
  message?: string;
}

interface UploadResponse {
  jobId: string;
  resumeId: string;
}

interface BackendStatus {
  available: boolean;
  url: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthMeResponse {
  authenticated: boolean;
  user?: AuthUser;
}

interface ModeInfo {
  mode: 'backend' | 'demo';
  features: string[];
}

export interface Preferences {
  roles: string[];
  locations: string[];
  workType: string;
  salaryRange: string;
}

export interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    start: string;
    end: string;
    summary: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  preferences: Preferences;
  lastLogin: string;
  profileCompletion: number;
  latestResume?: {
    id: string;
    filename: string;
    uploadedAt: string;
  } | null;
}

class ATSApiService {
  // Flask backend URL (Docker exposes 5001 on host based on your config)
  private baseUrl = 'http://localhost:5001/api';
  private isBackendAvailable = true;

  constructor() {
    console.log('✅ ATS API Service initialized (backend mode)');
    console.log(`📡 Backend URL: ${this.baseUrl}`);
  }

  // ---- Generic helper for JSON requests ----
  private async requestJson<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      credentials: 'include', // Crucial: Sends cookies/session to backend
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const err = await response.json();
        if (err && (err as any).error) {
          errorMessage = (err as any).error;
        }
      } catch {
        // ignore json parse error
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const data = await response.json();
    return data as T;
  }

  // ---- File upload helpers ----

  async uploadResume(file: File, jobProfileId: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('resume', file);
    if (jobProfileId) {
      formData.append('jobProfileId', jobProfileId);
    }

    const data = await this.requestJson<any>('/upload', {
      method: 'POST',
      body: formData,
    });

    return {
      jobId: data.jobId,
      resumeId: data.resumeId,
    };
  }

  async batchUpload(
    files: File[],
    jobProfileId: string
  ): Promise<{ jobId: string; resumeIds: string[] }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('resumes', file);
    });
    if (jobProfileId) {
      formData.append('jobProfileId', jobProfileId);
    }

    const data = await this.requestJson<any>('/batch-upload', {
      method: 'POST',
      body: formData,
    });

    return {
      jobId: data.jobId,
      resumeIds: data.resumeIds,
    };
  }

  // ---- Analysis status & result ----

  async getAnalysisStatus(jobId: string): Promise<AnalysisStatus> {
    const data = await this.requestJson<any>(`/analysis/${jobId}/status`, {
      method: 'GET',
    });

    return {
      status: data.status,
      progress: data.progress,
      completed: data.completed,
      total: data.total,
      message: data.message,
    };
  }

  async getAnalysisResult(resumeId: string): Promise<Analysis> {
    const data = await this.requestJson<Analysis>(`/analysis/${resumeId}`, {
      method: 'GET',
    });
    return data;
  }

  // ---- Candidate profile ----

  async getProfile(): Promise<CandidateProfile> {
    return this.requestJson<CandidateProfile>('/profile/me', {
      method: 'GET',
    });
  }

  async updateProfile(profile: Partial<CandidateProfile>): Promise<CandidateProfile> {
    const data = await this.requestJson<{ profile: CandidateProfile }>('/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    return data.profile;
  }

  // ---- Resumes list & delete ----

  async getAllResumes(): Promise<Resume[]> {
    const data = await this.requestJson<Resume[]>('/resumes?limit=100&offset=0', {
      method: 'GET',
    });
    return data;
  }

  async getMyResumes(): Promise<Resume[]> {
    const data = await this.requestJson<Resume[]>('/my-resumes', {
      method: 'GET',
    });
    return data;
  }

  async deleteResume(resumeId: string): Promise<void> {
    await this.requestJson<void>(`/resumes/${resumeId}`, {
      method: 'DELETE',
    });
  }

  async rejectResume(resumeId: string, reason?: string): Promise<void> {
    await this.requestJson<void>(`/resumes/${resumeId}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
  }

  // ---- Job profiles ----

  async getJobProfiles(): Promise<JobProfile[]> {
    const data = await this.requestJson<JobProfile[]>('/job-profiles', {
      method: 'GET',
    });
    return data;
  }

  async createJobProfile(
    profile: Omit<JobProfile, 'id'>
  ): Promise<JobProfile> {
    const data = await this.requestJson<JobProfile>('/job-profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });
    return data;
  }
  // In atsApi.ts inside the class

  async deleteJobProfile(profileId: string): Promise<void> {
    await this.requestJson<void>(`/job-profiles/${profileId}`, {
      method: 'DELETE',
    });
  }

  async updateJobProfile(profileId: string, profile: Partial<JobProfile>): Promise<void> {
    await this.requestJson<void>(`/job-profiles/${profileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
  }

  // This is the old simple apply (just button click)
  async applyToJob(jobId: string): Promise<void> {
    await this.requestJson<void>(`/jobs/${jobId}/apply`, {
      method: 'POST',
      credentials: 'include',
    });
  }

  // --- NEW: Apply with FormData (Resume + Name + Email) ---
  async applyToJobWithResume(jobId: string, formData: FormData): Promise<any> {
    // Note: We use requestJson to leverage the base URL and error handling,
    // but the browser will automatically handle the Content-Type boundary for FormData.
    const data = await this.requestJson<any>(`/jobs/${jobId}/apply`, {
      method: 'POST',
      body: formData, // Sending FormData automatically sets multipart/form-data
      credentials: 'include',
    });
    return data;
  }

  // ---- Export analysis ----

  async exportAnalysis(
    resumeIds: string[],
    format: 'csv' | 'excel' | 'pdf' | 'json'
  ): Promise<Blob> {
    const body = {
      resumeIds,
      format: format === 'json' ? 'csv' : format,
    };

    const response = await fetch(`${this.baseUrl}/export`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorMessage = `Export failed with status ${response.status}`;
      try {
        const err = await response.json();
        if (err && (err as any).error) {
          errorMessage = (err as any).error;
        }
      } catch {
        // ignore
      }
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    return blob;
  }

  // ---- Health / connection ----

  async retryConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        credentials: 'include',
      });
      this.isBackendAvailable = response.ok;
      if (response.ok) {
        console.log('✅ Backend is available, running in backend mode');
      } else {
        console.log('❌ Backend health check failed');
      }
      return this.isBackendAvailable;
    } catch (e) {
      console.log('❌ Backend not reachable, check Docker / server');
      this.isBackendAvailable = false;
      return false;
    }
  }

  getBackendStatus(): BackendStatus {
    return {
      available: this.isBackendAvailable,
      url: this.baseUrl,
    };
  }

  getModeInfo(): ModeInfo {
    return {
      mode: 'backend',
      features: [
        'Real ATS analysis from Flask backend',
        'File upload to /api/upload',
        'Batch upload to /api/batch-upload',
        'Live analysis status',
        'Resumes list from database',
        'Job profiles from backend',
        'Export to CSV / Excel / PDF',
      ],
    };
  }

  // ---- Auth ----

  async login(email: string, password: string): Promise<AuthUser> {
    const data = await this.requestJson<{ user: AuthUser }>('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return data.user;
  }

  async register(
    name: string,
    email: string,
    password: string,
    role: 'candidate' | 'user' | 'admin' = 'candidate'
  ): Promise<AuthUser> {
    const data = await this.requestJson<{ user: AuthUser }>('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password, role }),
    });
    return data.user;
  }

  async logout(): Promise<void> {
    await this.requestJson('/auth/logout', {
      method: 'POST',
    });
  }
  // atsApi.ts

  async getCandidatesForJob(jobId: string): Promise<any[]> {
    return this.requestJson<any[]>(`/jobs/${jobId}/candidates`, {
      method: 'GET',
    });
  }

  async me(): Promise<AuthUser | null> {
    const data = await this.requestJson<AuthMeResponse>('/auth/me', {
      method: 'GET',
    });
    if (data.authenticated && data.user) {
      return data.user;
    }
    return null;
  }
}

// Export singleton instance
export const atsApi = new ATSApiService();
