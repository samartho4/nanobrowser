import { Tool } from '../types/tools';
import { FiEdit2, FiTrash2, FiCheck } from 'react-icons/fi';

interface ToolCardProps {
  tool: Tool;
  isConfigured: boolean;
  onConfigure: () => void;
  onDelete: () => void;
  isDarkMode?: boolean;
}

export const ToolCard = ({ tool, isConfigured, onConfigure, onDelete, isDarkMode = false }: ToolCardProps) => {
  // Handle logo loading errors with fallback to emoji
  const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  return (
    <div
      className={`group relative flex flex-col rounded-lg border transition-all hover:shadow-md ${
        isDarkMode
          ? `${isConfigured ? 'border-green-700 bg-transparent' : 'border-slate-700 bg-transparent'}`
          : `${isConfigured ? 'border-green-200 bg-transparent' : 'border-blue-100 bg-transparent'}`
      }`}>
      {/* Status Badge */}
      {isConfigured && (
        <div
          className={`absolute right-3 top-3 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
            isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'
          }`}>
          <FiCheck className="h-3 w-3" />
          Configured
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Tool Logo and Name */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="relative h-16 w-16 flex-shrink-0 rounded-lg p-2 flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: 'transparent' }}>
            {/* Logo Image */}
            <img
              src={tool.logo}
              alt={tool.name}
              className={`h-full w-full object-contain ${tool.id === 'google_calendar' ? 'scale-125' : ''}`}
              onError={handleLogoError}
            />
            {/* Fallback Emoji (shown if image fails to load) */}
            <span className="text-4xl" style={{ display: 'none' }}>
              {tool.icon || '🔧'}
            </span>
          </div>
          <div className="flex-1 text-center">
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{tool.name}</h3>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{tool.category}</p>
          </div>
        </div>

        {/* Description */}
        <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {tool.description}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t px-4 py-3" style={{ borderTopColor: isDarkMode ? '#334155' : '#e5e7eb' }}>
        <button
          onClick={onConfigure}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}>
          <FiEdit2 className="h-4 w-4" />
          Configure
        </button>

        {isConfigured && (
          <button
            onClick={onDelete}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isDarkMode ? 'bg-red-900/30 text-red-200 hover:bg-red-900/50' : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}>
            <FiTrash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
