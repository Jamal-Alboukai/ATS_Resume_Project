import React from 'react';
import {
  LayoutDashboard,
  FileSearch,
  UserCircle,
  Users,
  Briefcase,
  BarChart3,
  Settings,
  BrainCircuit,
  Info,
  Zap
} from 'lucide-react';
import { useAuth } from './AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { user } = useAuth();
  const isCandidate = user?.role === 'candidate';

  const menuItems = [
    { id: 'profile', label: 'Profile', icon: UserCircle },
    { id: 'applications', label: 'My Applications', icon: Briefcase },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analyzer', label: 'Resume Analyzer', icon: FileSearch },
    { id: 'candidates', label: 'Candidates', icon: Users },
    { id: 'jobs', label: 'Job Postings', icon: Briefcase },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const visibleMenuItems = isCandidate
    ? menuItems.filter(item => ['profile', 'applications', 'analyzer', 'jobs', 'settings'].includes(item.id))
    : menuItems.filter(item => item.id !== 'applications');

  const glassStyle = {
    backdropFilter: 'blur(20px)',
    background: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 12px 40px rgba(31, 38, 135, 0.2)'
  };

  return (
    <aside className="w-64 shadow-2xl" style={glassStyle}>
      <div className="p-6 border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-teal-500 rounded-xl flex items-center justify-center">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg text-gray-800">ATS Analyzer</h1>
            <p className="text-xs text-gray-600">AI-Powered Recruitment</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-2">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-purple-500 to-teal-500 text-white transform translate-x-1'
                  : 'text-gray-700 hover:bg-white/20 hover:translate-x-1'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-blue-100 text-blue-700 border border-blue-200">
          <Info className="w-4 h-4" />
          <span>Demo Mode</span>
        </div>
      </div>
    </aside>
  );
}
