import React, { useState, useEffect } from 'react';
import { workspaceManager } from '@extension/storage';

interface WorkspaceStatsProps {
  workspaceId?: string;
  className?: string;
}

interface WorkspaceStats {
  messageCount: number;
  sessionCount: number;
  runCount: number;
  lastActivity: number;
}

export const WorkspaceStats: React.FC<WorkspaceStatsProps> = ({ workspaceId, className = '' }) => {
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [workspaceId]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const activeWorkspaceId = workspaceId || workspaceManager.getActiveWorkspaceId();
      const workspaceStats = await workspaceManager.getWorkspaceStats(activeWorkspaceId);
      setStats(workspaceStats);
    } catch (error) {
      console.error('Failed to load workspace stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const formatLastActivity = (timestamp: number): string => {
    if (timestamp === 0) return 'No activity';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-gray-400">
          <div className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Loading stats...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <span className="text-sm text-gray-500">No stats available</span>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700 ${className}`}>
      {/* Messages */}
      <div className="flex flex-col items-center space-y-1">
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-xs text-gray-400 font-medium">MESSAGES</span>
        </div>
        <span className="text-lg font-bold text-white">{formatNumber(stats.messageCount)}</span>
      </div>

      {/* Sessions */}
      <div className="flex flex-col items-center space-y-1">
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <span className="text-xs text-gray-400 font-medium">SESSIONS</span>
        </div>
        <span className="text-lg font-bold text-white">{stats.sessionCount}</span>
      </div>

      {/* Runs */}
      <div className="flex flex-col items-center space-y-1">
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-xs text-gray-400 font-medium">RUNS</span>
        </div>
        <span className="text-lg font-bold text-white">{stats.runCount}</span>
      </div>

      {/* Last Activity */}
      <div className="flex flex-col items-center space-y-1">
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs text-gray-400 font-medium">ACTIVITY</span>
        </div>
        <span className="text-sm font-medium text-white">{formatLastActivity(stats.lastActivity)}</span>
      </div>
    </div>
  );
};
