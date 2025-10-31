import React from 'react';
import { FiZap, FiAlertTriangle } from 'react-icons/fi';

interface TokenCounterProps {
  currentTokens: number;
  maxTokens: number;
  isDarkMode?: boolean;
  showCompressionSuggestion?: boolean;
  onCompress?: () => void;
}

export const TokenCounter: React.FC<TokenCounterProps> = ({
  currentTokens,
  maxTokens,
  isDarkMode = false,
  showCompressionSuggestion = false,
  onCompress,
}) => {
  const percentage = (currentTokens / maxTokens) * 100;
  const isNearLimit = percentage > 80;
  const isAtLimit = percentage > 95;

  const getStatusColor = () => {
    if (isAtLimit) return 'text-red-500';
    if (isNearLimit) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getBarColor = () => {
    if (isAtLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <FiZap className={`w-4 h-4 ${getStatusColor()}`} />
          <span className="text-sm font-medium">Context Usage</span>
        </div>
        <span className={`text-sm font-mono ${getStatusColor()}`}>
          {currentTokens.toLocaleString()} / {maxTokens.toLocaleString()}
        </span>
      </div>

      {/* Progress Bar */}
      <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
        <div
          className={`h-2 rounded-full transition-all duration-500 ${getBarColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500">{percentage.toFixed(1)}% used</span>

        {showCompressionSuggestion && isNearLimit && (
          <button
            onClick={onCompress}
            className="flex items-center space-x-1 text-xs px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors">
            <FiAlertTriangle className="w-3 h-3" />
            <span>Compress</span>
          </button>
        )}
      </div>

      {/* Demo Enhancement: Show compression savings */}
      {isNearLimit && (
        <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900 rounded text-xs">
          <div className="flex items-center space-x-1 text-orange-700 dark:text-orange-300">
            <FiAlertTriangle className="w-3 h-3" />
            <span>Context approaching limit. Compression can save ~40% tokens.</span>
          </div>
        </div>
      )}
    </div>
  );
};
