import { FiBook } from 'react-icons/fi';

interface ContextWindowSettingsProps {
  isDarkMode?: boolean;
}

export const ContextWindowSettings = ({ isDarkMode = false }: ContextWindowSettingsProps) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FiBook className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Context Window</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Configure context window settings for AI models
          </p>
        </div>
      </div>

      {/* Placeholder Content */}
      <div
        className={`rounded-lg border-2 border-dashed p-8 text-center ${
          isDarkMode ? 'border-slate-600 bg-slate-700/20' : 'border-blue-200 bg-blue-50/30'
        }`}>
        <FiBook className={`mx-auto h-12 w-12 ${isDarkMode ? 'text-slate-500' : 'text-blue-400'}`} />
        <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Context Window settings coming soon...
        </p>
      </div>
    </div>
  );
};
