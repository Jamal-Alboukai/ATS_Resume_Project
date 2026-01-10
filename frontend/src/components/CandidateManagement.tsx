import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  Calendar,
  MapPin,
  Mail,
  Phone,
  SortAsc,
  SortDesc,
  Briefcase,
  ChevronRight,
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  GraduationCap
} from 'lucide-react';
import { atsApi } from '../services/atsApi';

// Types for the List View
type CandidateSummary = {
  id: string;
  filename: string;
  uploadDate: string;
  status: string;
  name?: string;
  email?: string;
  score?: number;
  skills?: string[];
};

// Types for the Detailed View (The Modal)
type AnalysisDetail = {
  overallScore: number;
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
  };
  rejection?: {
    reason?: string;
    timestamp?: string;
  };
  jobMatch: {
    matchPercentage: number;
    missingSkills: string[];
    strengths: string[];
    recommendations: string[];
  };
  skills: { name: string; confidence: number; }[];
  experience: {
    totalYears: number;
    positions: { title: string; company: string; duration: string }[];
  };
  education: { degree: string; institution: string; year: string }[];
};

type SortBy = 'date' | 'name' | 'score';
type SortOrder = 'asc' | 'desc';
type ScoreFilter = 'all' | 'excellent' | 'good' | 'average' | 'poor';

export function CandidateManagement() {
  // --- Job & List State ---
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateSummary[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [exportError, setExportError] = useState<string | null>(null);
  
  // --- Filters ---
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterScore, setFilterScore] = useState<ScoreFilter>('all');
  
  // --- Selection & Loading ---
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());

  // --- Modal State ---
  const [viewingCandidateId, setViewingCandidateId] = useState<string | null>(null);
  const [analysisDetails, setAnalysisDetails] = useState<AnalysisDetail | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Glassmorphism styles for the DASHBOARD only (not the modal)
  const glassStyle = {
    backdropFilter: 'blur(16px)',
    background: 'rgba(255, 255, 255, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1)'
  };

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (selectedJobId) loadCandidates(selectedJobId);
  }, [selectedJobId]);

  useEffect(() => {
    filterAndSortCandidates();
  }, [candidates, searchTerm, sortBy, sortOrder, filterScore]);

  const loadJobs = async () => {
    try {
      const data = await atsApi.getJobProfiles();
      setJobs(data);
      if (data.length > 0) setSelectedJobId(data[0].id);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  const loadCandidates = async (jobId: string) => {
    try {
      setIsLoading(true);
      const data = await atsApi.getCandidatesForJob(jobId);
      setCandidates(data);
      setSelectedCandidates(new Set());
    } catch (error) {
      console.error('Failed to load candidates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCandidate = async (candidateId: string) => {
    setViewingCandidateId(candidateId);
    setAnalysisDetails(null);
    setIsLoadingDetails(true);
    try {
      const details = await atsApi.getAnalysisResult(candidateId);
      setAnalysisDetails(details as unknown as AnalysisDetail);
    } catch (error) {
      console.error("Failed to load details", error);
      alert("Could not load analysis details.");
      setViewingCandidateId(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeCandidateModal = () => {
    setViewingCandidateId(null);
    setAnalysisDetails(null);
  };

  // --- Filters & Sorts ---
  const filterAndSortCandidates = () => {
    let filtered = [...candidates];
    if (searchTerm) {
      filtered = filtered.filter(candidate => 
        candidate.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterScore !== 'all') {
      filtered = filtered.filter(candidate => {
        const score = candidate.score || 0;
        switch (filterScore) {
          case 'excellent': return score >= 80;
          case 'good': return score >= 60 && score < 80;
          case 'average': return score >= 40 && score < 60;
          case 'poor': return score < 40;
          default: return true;
        }
      });
    }
    filtered.sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;
      switch (sortBy) {
        case 'name': aVal = a.name || a.filename; bVal = b.name || b.filename; break;
        case 'score': aVal = a.score || 0; bVal = b.score || 0; break;
        case 'date': default: aVal = new Date(a.uploadDate).getTime(); bVal = new Date(b.uploadDate).getTime(); break;
      }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    setFilteredCandidates(filtered);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    if (score >= 40) return 'text-orange-600 bg-orange-100 border-orange-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const toggleCandidateSelection = (candidateId: string) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(candidateId)) newSelected.delete(candidateId);
    else newSelected.add(candidateId);
    setSelectedCandidates(newSelected);
  };

  const deleteSelected = async () => {
    if(!window.confirm(`Delete ${selectedCandidates.size} candidates?`)) return;
    try {
      for (const candidateId of selectedCandidates) await atsApi.deleteResume(candidateId);
      if (selectedJobId) loadCandidates(selectedJobId);
    } catch (error) { console.error(error); }
  };

  const exportSelected = async () => {
    const ids = selectedCandidates.size > 0 ? Array.from(selectedCandidates) : filteredCandidates.map(c => c.id);
    if (!ids.length) {
      setExportError('No candidates available to export.');
      return;
    }
    setExportError(null);
    setIsExporting(true);
    try {
      const blob = await atsApi.exportAnalysis(ids, exportFormat);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidates_export.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) { 
      console.error(error); 
      setExportError(error instanceof Error ? error.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRejectCandidate = async (candidateId: string) => {
    const confirmReject = window.confirm('Reject this resume? This cannot be undone.');
    if (!confirmReject) return;
    const reason = window.prompt('Optional reason for rejection:', '');
    try {
      await atsApi.rejectResume(candidateId, reason || undefined);
      if (selectedJobId) loadCandidates(selectedJobId);
    } catch (error: any) {
      console.error('Failed to reject candidate', error);
      alert(`Failed to reject: ${error?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6 p-6 h-[calc(100vh-64px)] flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
            Candidate Management
          </h1>
          <p className="text-gray-600 mt-1">
            Review applications for {jobs.find(j => j.id === selectedJobId)?.title || '...'}
          </p>
        </div>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        
        {/* LEFT PANEL: Job List */}
        <div className="w-1/4 min-w-[250px] bg-white rounded-2xl shadow-xl border border-white/20 flex flex-col overflow-hidden" style={glassStyle}>
          <div className="p-4 border-b border-gray-100 bg-white/40">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Open Jobs
            </h2>
          </div>
          <div className="overflow-y-auto p-2 space-y-2 flex-1">
            {jobs.map(job => (
              <button
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className={`w-full text-left p-4 rounded-xl transition-all border ${
                  selectedJobId === job.id
                    ? 'bg-gradient-to-r from-purple-50 to-teal-50 border-purple-200 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-white/50'
                }`}
              >
                <div className={`font-semibold ${selectedJobId === job.id ? 'text-purple-700' : 'text-gray-700'}`}>
                  {job.title}
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                  <span>{job.minimumExperience}+ yrs</span>
                  <ChevronRight className={`w-4 h-4 ${selectedJobId === job.id ? 'text-purple-400' : 'text-transparent'}`} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL: Candidates */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          
          {/* Controls Bar */}
          <div className="rounded-2xl p-4 shadow-lg flex flex-wrap gap-4 items-center justify-between" style={glassStyle}>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-white/40 bg-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>

            <div className="flex gap-2">
               <select
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value as ScoreFilter)}
                className="px-3 py-2 rounded-xl border border-white/40 bg-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700"
              >
                <option value="all">All Scores</option>
                <option value="excellent">Excellent (80+)</option>
                <option value="good">Good (60-79)</option>
                <option value="average">Average (40-59)</option>
                <option value="poor">Poor (&lt;40)</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 rounded-xl border border-white/40 bg-white/40 text-gray-700 hover:bg-white/60 transition-colors flex items-center gap-2 text-sm"
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </button>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'pdf')}
                className="px-3 py-2 rounded-xl border border-white/40 bg-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700"
              >
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
              
              <button 
                onClick={exportSelected} 
                disabled={isExporting}
                className={`p-2 bg-white/40 hover:bg-white/60 rounded-xl transition-colors text-purple-600 border border-purple-100 ${
                  isExporting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                <Download className="w-5 h-5" />
              </button>
              
              {selectedCandidates.size > 0 && (
                <button onClick={deleteSelected} className="p-2 bg-red-50 hover:bg-red-100 rounded-xl transition-colors text-red-600 border border-red-100">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {exportError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {exportError}
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {isLoading ? (
               <div className="flex justify-center items-center h-40">
                 <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
               </div>
            ) : filteredCandidates.length === 0 ? (
               <div className="text-center py-12 bg-white/20 rounded-2xl border border-white/30">
                 <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                 <p className="text-gray-500">No candidates found.</p>
               </div>
            ) : (
              filteredCandidates.map(candidate => (
                <div key={candidate.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center gap-4 group">
                  <input
                    type="checkbox"
                    checked={selectedCandidates.has(candidate.id)}
                    onChange={() => toggleCandidateSelection(candidate.id)}
                    className="rounded focus:ring-purple-500 text-purple-600"
                  />
                  
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border ${getScoreColor(candidate.score || 0)}`}>
                    {candidate.score || 0}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 truncate">{candidate.name || candidate.filename}</h3>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> {candidate.email || 'No email'}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(candidate.uploadDate).toLocaleDateString()}</span>
                      <span className={`px-2 py-1 rounded-full border text-[11px] ${
                        candidate.status === 'rejected'
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : candidate.status === 'completed'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : candidate.status === 'processing'
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {candidate.status}
                      </span>
                    </div>
                  </div>

                  <div className="hidden lg:flex gap-1">
                    {candidate.skills?.slice(0, 3).map((skill, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md border border-gray-100">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <button 
                    onClick={() => handleViewCandidate(candidate.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-purple-600"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleRejectCandidate(candidate.id)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-500"
                    title="Reject resume"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- ANALYSIS DETAIL MODAL (FIXED SOLID BACKGROUND) --- */}
      {viewingCandidateId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} // 1. Darken Background
        >
          <div 
            className="w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
            style={{ backgroundColor: '#ffffff' }} // 2. Force Solid White Card
          >
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <div>
                  <h2 className="text-xl font-bold text-gray-800">Candidate Analysis</h2>
                  <p className="text-sm text-gray-500">Detailed AI Report</p>
               </div>
               <button onClick={closeCandidateModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                 <X className="w-6 h-6 text-gray-500" />
               </button>
            </div>

            {/* Modal Body */}
            {isLoadingDetails || !analysisDetails ? (
               <div className="flex-1 flex justify-center items-center">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
               </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                
                {/* Top Card: Overview */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-6">
                  <div className="flex items-center gap-4">
                     <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-4 ${getScoreColor(analysisDetails.overallScore).replace('bg-', 'bg-white ')}`}>
                       {analysisDetails.overallScore}%
                     </div>
                     <div>
                       <h3 className="text-2xl font-bold text-gray-800">{analysisDetails.personalInfo.name}</h3>
                       <p className="text-gray-500 flex items-center gap-2"><Mail className="w-4 h-4"/> {analysisDetails.personalInfo.email}</p>
                       <p className="text-gray-500 flex items-center gap-2"><Phone className="w-4 h-4"/> {analysisDetails.personalInfo.phone}</p>
                      <p className="text-gray-500 flex items-center gap-2"><MapPin className="w-4 h-4"/> {analysisDetails.personalInfo.location}</p>
                     </div>
                  </div>
                  {analysisDetails.rejection?.reason && (
                    <div className="md:ml-auto bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex-1">
                      <p className="font-semibold mb-1">Rejection reason</p>
                      <p>{analysisDetails.rejection.reason}</p>
                      {analysisDetails.rejection.timestamp && (
                        <p className="text-xs text-red-500 mt-1">At {new Date(analysisDetails.rejection.timestamp).toLocaleString()}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   
                   {/* Job Match Section */}
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" /> Matched Skills
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-6">
                        {analysisDetails.skills.map((skill, i) => (
                           <span key={i} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-100">
                             {skill.name}
                           </span>
                        ))}
                      </div>

                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-500" /> Missing Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {analysisDetails.jobMatch.missingSkills.length > 0 ? (
                          analysisDetails.jobMatch.missingSkills.map((skill, i) => (
                            <span key={i} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium border border-red-100">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500 italic">None - Great match!</span>
                        )}
                      </div>
                   </div>

                   {/* AI Insights Section */}
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                         <AlertTriangle className="w-5 h-5 text-orange-500" /> AI Recommendations
                      </h3>
                      <ul className="space-y-3">
                         {analysisDetails.jobMatch.recommendations.map((rec, i) => (
                            <li key={i} className="flex gap-3 items-start text-sm text-gray-600">
                               <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 shrink-0"></span>
                               {rec}
                            </li>
                         ))}
                      </ul>

                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                           <GraduationCap className="w-5 h-5 text-blue-500" /> Experience
                        </h3>
                        <p className="text-3xl font-bold text-gray-800">{analysisDetails.experience.totalYears} <span className="text-base font-normal text-gray-500">Years</span></p>
                      </div>
                   </div>

                </div>

              </div>
            )}
            
          </div>
        </div>
      )}

    </div>
  );
}
