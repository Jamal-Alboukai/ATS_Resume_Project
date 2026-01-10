import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// --- EXISTING IMPORTS (KEPT) ---
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { ResumeAnalyzer } from "./components/ResumeAnalyzer";
import { CandidateProfile } from "./components/CandidateProfile";
import { CandidateManagement } from "./components/CandidateManagement";
import { JobPostings } from "./components/JobPostings";
import { Analytics } from "./components/Analytics";
import { Settings } from "./components/Settings";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { MyApplications } from "./components/MyApplications";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

// --- NEW IMPORT (UPDATED) ---
// Make sure you created this file in src/pages/LandingPage.tsx as discussed
import LandingPage from "./components/Landingpage"; 

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* --- PUBLIC ROUTES --- */}
          
          {/* UPDATED: Uses the new LandingPage instead of Home */}
          <Route path="/" element={<LandingPage />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* --- PROTECTED ROUTES (KEPT EXACTLY THE SAME) --- */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analyzer"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          />

          {/* Redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

// --- DASHBOARD LAYOUT (KEPT EXACTLY THE SAME) ---
function DashboardLayout() {
  const { user } = useAuth();
  const isCandidate = user?.role === 'candidate';

  const tabFromPath = () => {
    const path = window.location.pathname;
    if (path === '/profile') return 'profile';
    if (path === '/applications' && isCandidate) return 'applications';
    if (path === '/dashboard') return 'dashboard';
    if (path === '/analyzer') return 'analyzer';
    if (path === '/candidates') return 'candidates';
    if (path === '/jobs') return 'jobs';
    if (path === '/analytics') return 'analytics';
    if (path === '/settings') return 'settings';
    return '';
  };

  const defaultTab = () => {
    const byPath = tabFromPath();
    if (byPath) return byPath;
    if (user?.role === 'admin' || user?.role === 'user') return 'dashboard';
    return 'profile';
  };

  const [activeTab, setActiveTab] = React.useState(defaultTab);

  React.useEffect(() => {
    const byPath = tabFromPath();
    if (byPath) {
      setActiveTab(byPath);
      return;
    }
    if (user?.role === 'admin' || user?.role === 'user') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('profile');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "profile":
        return <CandidateProfile />;
      case "applications":
        return isCandidate ? <MyApplications /> : <Dashboard />;
      case "analyzer":
        return <ResumeAnalyzer />;
      case "candidates":
        return <CandidateManagement />;
      case "jobs":
        return <JobPostings />;
      case "analytics":
        return <Analytics />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6">{renderContent()}</main>
      </div>

      <style>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
