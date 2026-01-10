import { Briefcase, Shield } from 'lucide-react';

interface HeaderProps {
  isAdmin: boolean;
  onToggleAdmin: () => void;
  onHome: () => void;
}

export function Header({ isAdmin, onToggleAdmin, onHome }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <button 
            onClick={onHome}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Briefcase className="w-6 h-6 text-blue-600" />
            <h1 className="text-gray-900">Recruitment Portal</h1>
          </button>

          <button
            onClick={onToggleAdmin}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isAdmin
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{isAdmin ? 'Admin Mode' : 'Switch to Admin'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}