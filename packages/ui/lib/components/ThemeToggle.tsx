import React from 'react';
import { useTheme } from '@extension/shared';

export interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ size = 'md', showLabel = false, className = '' }) => {
  const { theme, toggleTheme, isLoading } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  if (isLoading) {
    return (
      <div className={`${sizeClasses[size]} ${className} animate-pulse`}>
        <div className="w-full h-full bg-gray-300 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={toggleTheme}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center
          rounded-full
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${
            theme === 'light'
              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 focus:ring-blue-500'
              : 'bg-slate-700 text-yellow-400 hover:bg-slate-600 focus:ring-yellow-500'
          }
        `}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {theme === 'light' ? 'Light' : 'Dark'} Theme
        </span>
      )}
    </div>
  );
};
