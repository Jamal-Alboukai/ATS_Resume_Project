import React, { useState } from 'react';
import { 
  Bell, 
  Lock, 
  Database, 
  Download, 
  Upload,
  Trash2,
  Save,
  RefreshCw
} from 'lucide-react';

type SettingsSection = 'notifications' | 'privacy' | 'data';
type EditableSection = Exclude<SettingsSection, 'data'>;

type SettingsState = {
  notifications: { emailAlerts: boolean; pushNotifications: boolean; weeklyReports: boolean; analysisComplete: boolean };
  privacy: { dataRetention: string; shareAnalytics: boolean; autoDelete: boolean };
};

export function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('notifications');
  const [settings, setSettings] = useState<SettingsState>({
    notifications: {
      emailAlerts: true,
      pushNotifications: false,
      weeklyReports: true,
      analysisComplete: true
    },
    privacy: {
      dataRetention: '90',
      shareAnalytics: false,
      autoDelete: true
    }
  });

  // Glassmorphism styles
  const glassStyle = {
    backdropFilter: 'blur(16px)',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15)'
  };

  const sections: { id: SettingsSection; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Lock },
    { id: 'data', label: 'Data Management', icon: Database }
  ];

  const updateSetting = <S extends EditableSection, K extends keyof SettingsState[S]>(
    section: S,
    key: K,
    value: SettingsState[S][K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      {(Object.entries(settings.notifications) as [keyof SettingsState['notifications'], boolean][]).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
          <div>
            <h4 className="text-gray-800 capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</h4>
            <p className="text-sm text-gray-600">
              {key === 'emailAlerts' && 'Receive email notifications for important updates'}
              {key === 'pushNotifications' && 'Get push notifications in your browser'}
              {key === 'weeklyReports' && 'Weekly summary of your recruitment analytics'}
              {key === 'analysisComplete' && 'Notification when resume analysis is complete'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => updateSetting('notifications', key, e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
          </label>
        </div>
      ))}
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
        <h4 className="text-gray-800 mb-2">Data Retention Period</h4>
        <p className="text-sm text-gray-600 mb-4">How long should we keep your uploaded resumes?</p>
        <select
          value={settings.privacy.dataRetention}
          onChange={(e) => updateSetting('privacy', 'dataRetention', e.target.value)}
          className="w-full px-4 py-2 rounded-xl border border-white/30 bg-white/10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="180">6 months</option>
          <option value="365">1 year</option>
          <option value="forever">Keep forever</option>
        </select>
      </div>

      <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
        <div>
          <h4 className="text-gray-800">Share Anonymous Analytics</h4>
          <p className="text-sm text-gray-600">Help us improve by sharing anonymous usage data</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.privacy.shareAnalytics}
            onChange={(e) => updateSetting('privacy', 'shareAnalytics', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
        <div>
          <h4 className="text-gray-800">Auto-delete Old Data</h4>
          <p className="text-sm text-gray-600">Automatically delete data after retention period</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.privacy.autoDelete}
            onChange={(e) => updateSetting('privacy', 'autoDelete', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
        </label>
      </div>
    </div>
  );

  const renderDataManagement = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-left">
          <Download className="w-8 h-8 text-purple-500 mb-3" />
          <h4 className="text-gray-800 mb-2">Export Data</h4>
          <p className="text-sm text-gray-600">Download all your data in JSON format</p>
        </button>

        <button className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-left">
          <Upload className="w-8 h-8 text-teal-500 mb-3" />
          <h4 className="text-gray-800 mb-2">Import Data</h4>
          <p className="text-sm text-gray-600">Import data from previous backups</p>
        </button>

        <button className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-left">
          <RefreshCw className="w-8 h-8 text-blue-500 mb-3" />
          <h4 className="text-gray-800 mb-2">Reset Settings</h4>
          <p className="text-sm text-gray-600">Reset all settings to default values</p>
        </button>

        <button className="p-6 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors text-left">
          <Trash2 className="w-8 h-8 text-red-500 mb-3" />
          <h4 className="text-red-800 mb-2">Delete All Data</h4>
          <p className="text-sm text-red-600">Permanently delete all your data</p>
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'notifications': return renderNotificationSettings();
      case 'privacy': return renderPrivacySettings();
      case 'data': return renderDataManagement();
      default: return renderNotificationSettings();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-gray-600 mt-1">Manage your account preferences and application settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl p-4 shadow-xl" style={glassStyle}>
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                      activeSection === section.id
                        ? 'bg-gradient-to-r from-purple-500 to-teal-500 text-white'
                        : 'text-gray-700 hover:bg-white/20'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl p-6 shadow-xl" style={glassStyle}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl text-gray-800">
                {sections.find(s => s.id === activeSection)?.label}
              </h2>
              <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all duration-200 flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
