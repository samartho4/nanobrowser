import React, { useState, useEffect } from 'react';
import { workspaceManager } from '@extension/storage';

interface RunIndicatorProps {
  workspaceId?: string;
  onRunChange?: (runId: string) => void;
}

export const RunIndicator: React.FC<RunIndicatorProps> = ({ workspaceId, onRunChange }) => {
  const [currentRunId, setCurrentRunId] = useState<string>('');
  const [isCreatingRun, setIsCreatingRun] = useState(false);
  const [runHistory, setRunHistory] = useState<string[]>([]);

  useEffect(() => {
    loadCurrentRun();
  }, [workspaceId]);

  const loadCurrentRun = async () => {
    try {
      const runId = await workspaceManager.getCurrentRunId(workspaceId);
      setCurrentRunId(runId);
    } catch (error) {
      console.error('Failed to load current run:', error);
    }
  };

  const createNewRun = async () => {
    try {
      setIsCreatingRun(true);
      const newRunId = await workspaceManager.createRun(workspaceId);
      setCurrentRunId(newRunId);
      setRunHistory(prev => [newRunId, ...prev.slice(0, 4)]); // Keep last 5 runs
      onRunChange?.(newRunId);
    } catch (error) {
      console.error('Failed to create new run:', error);
    } finally {
      setIsCreatingRun(false);
    }
  };

  const formatRunId = (runId: string): string => {
    return runId.slice(-8); // Show last 8 characters
  };

  const getRunAge = (runId: string): string => {
    // Extract timestamp from UUID-like runId (simplified)
    try {
      const timestamp = parseInt(runId.split('-')[0], 16);
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);

      if (minutes < 1) return 'Just created';
      if (minutes < 60) return `${minutes}m old`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h old`;
      const days = Math.floor(hours / 24);
      return `${days}d old`;
    } catch {
      return 'Active';
    }
  };

  return (
    <div className="flex items-center space-x-3 px-3 py-2 bg-gray-900 rounded-lg border border-gray-700">
      {/* Run Icon */}
      <div className="flex items-center space-x-2">
        <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-xs text-gray-400 font-medium">RUN</span>
      </div>

      {/* Current Run Info */}
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-mono text-teal-400">
            {currentRunId ? formatRunId(currentRunId) : 'Loading...'}
          </span>
          {currentRunId && <span className="text-xs text-gray-500">{getRunAge(currentRunId)}</span>}
        </div>

        {/* Run Status */}
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-400">Active</span>
        </div>
      </div>

      {/* New Run Button */}
      <button
        onClick={createNewRun}
        disabled={isCreatingRun}
        className="flex items-center space-x-1 px-2 py-1 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 rounded text-xs text-white transition-colors"
        title="Create new run for time-travel and branching">
        {isCreatingRun ? (
          <>
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Creating...</span>
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Run</span>
          </>
        )}
      </button>
    </div>
  );
};
