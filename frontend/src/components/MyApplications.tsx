import React, { useEffect, useState } from 'react';
import { FileText, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { atsApi } from '../services/atsApi';

type MyResumeItem = {
  id: string;
  filename: string;
  upload_date: string;
  status: string;
  analysis?: any;
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'processing':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'failed':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'queued':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'rejected':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export function MyApplications() {
  const [resumes, setResumes] = useState<MyResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await atsApi.getMyResumes();
        setResumes(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
          My Applications
        </h1>
        <p className="text-gray-600 mt-1">Track your uploads, status, and any rejections.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : resumes.length === 0 ? (
        <div className="text-center py-12 bg-white/80 rounded-2xl border border-gray-100">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">No applications yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {resumes.map((r) => {
            const rejection = (r.analysis as any)?.rejection;
            return (
              <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-teal-500 rounded-lg flex items-center justify-center text-white text-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{r.filename}</h3>
                    <p className="text-xs text-gray-500">Uploaded: {new Date(r.upload_date).toLocaleString()}</p>
                    {r.analysis?.overallScore !== undefined && (
                      <p className="text-xs text-gray-600 mt-1">Score: {r.analysis.overallScore}%</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs border ${statusBadge(r.status)}`}>
                    {r.status}
                  </span>
                  {rejection?.reason && (
                    <div className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 max-w-xs">
                      <div className="flex items-center gap-1 font-semibold mb-1">
                        <XCircle className="w-3 h-3" /> Rejected
                      </div>
                      <p>{rejection.reason}</p>
                      {rejection.timestamp && (
                        <p className="text-[11px] text-red-500 mt-1">
                          {new Date(rejection.timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  {!rejection && r.status === 'completed' && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="w-3 h-3" /> Completed
                    </div>
                  )}
                  {r.status === 'processing' && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <Clock className="w-3 h-3" /> Processing
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
